/**
 * Generates the report's Entity Relationship Diagrams from the LIVE database
 * rather than from a hand-drawn source, so the figures in Chapter 4 cannot
 * drift from the schema they document.
 *
 * Output: one PNG per logical domain plus a full overview, written into
 * Report/Diagram/. Layout is a simple layered placement (parents left,
 * children right) with bezier connectors drawn on an SVG layer underneath
 * the table boxes.
 *
 *   node scripts/erd-gen.mjs
 */
import { Client } from 'pg'
import { chromium } from 'playwright-core'
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT = 'Report/Diagram'
const CONN = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

// ─── Domains: every one of the 36 tables is assigned exactly once ──────────
const DOMAINS = {
  'Identity, Access and Platform': [
    'users', 'user_profiles', 'referral_codes', 'instructor_applications',
    'contact_messages', 'notifications', 'accessibility_templates',
    'adaptive_interactions',
  ],
  'Curriculum and Content': [
    'courses', 'course_chapters', 'lessons', 'course_accessibility_categories',
    'lesson_templates', 'lesson_versions', 'media_assets',
    'lesson_interactive_content', 'video_questions', 'h5p_contents',
    'lesson_checkpoints', 'lesson_ai_summaries', 'lesson_comments',
  ],
  'Assessment, Learning Record and Recognition': [
    'quizzes', 'quiz_questions', 'quiz_options', 'quiz_attempts', 'quiz_answers',
    'enrollments', 'lesson_progress', 'learner_checkpoints', 'recommendations',
    'h5p_responses', 'course_favorites', 'course_achievements',
    'user_achievements', 'course_milestones', 'certificates',
  ],
}

const client = new Client({ connectionString: CONN })
await client.connect()

const { rows: cols } = await client.query(`
  select c.table_name, c.column_name, c.data_type, c.udt_name, c.ordinal_position,
         c.is_nullable
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
  order by c.table_name, c.ordinal_position`)

const { rows: pks } = await client.query(`
  select tc.table_name, kcu.column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
  where tc.table_schema = 'public' and tc.constraint_type = 'PRIMARY KEY'`)

const { rows: fks } = await client.query(`
  select con.conrelid::regclass::text as child,
         att.attname as column_name,
         con.confrelid::regclass::text as parent
  from pg_constraint con
  join pg_namespace n on n.oid = connamespace
  join unnest(con.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
  where n.nspname = 'public' and con.contype = 'f'`)

await client.end()

const pkSet = new Set(pks.map((r) => `${r.table_name}.${r.column_name}`))
const fkMap = new Map()   // "table.col" -> parent table
for (const f of fks) {
  const child = f.child.replace(/^public\./, '')
  const parent = f.parent.replace(/^(public|auth)\./, '')
  fkMap.set(`${child}.${f.column_name}`, parent)
}

const byTable = new Map()
for (const c of cols) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, [])
  byTable.get(c.table_name).push(c)
}

/** Compact type label so the box stays narrow. */
function typeLabel(c) {
  const u = c.udt_name
  if (u === 'uuid') return 'uuid'
  if (u === 'text' || u === 'varchar') return 'text'
  if (u === 'int4') return 'int'
  if (u === 'int8') return 'bigint'
  if (u === 'numeric') return 'numeric'
  if (u === 'bool') return 'bool'
  if (u === 'jsonb') return 'jsonb'
  if (u === 'date') return 'date'
  if (u.startsWith('timestamp')) return 'timestamp'
  if (u.startsWith('_')) return typeLabel({ udt_name: u.slice(1) }) + '[]'
  return u
}

const ROW_H = 17
const HEAD_H = 26
const BOX_W = 258
const COL_GAP = 118
const ROW_GAP = 26

/** Longest-path layering: a table sits to the right of every table it points at. */
function layer(tables) {
  const set = new Set(tables)
  const parentsOf = (t) =>
    [...new Set([...fkMap.entries()]
      .filter(([k, v]) => k.startsWith(t + '.') && set.has(v) && v !== t)
      .map(([, v]) => v))]
  const depth = new Map()
  const visit = (t, seen) => {
    if (depth.has(t)) return depth.get(t)
    if (seen.has(t)) return 0
    seen.add(t)
    const d = parentsOf(t).reduce((m, p) => Math.max(m, visit(p, seen) + 1), 0)
    seen.delete(t)
    depth.set(t, d)
    return d
  }
  for (const t of tables) visit(t, new Set())
  return depth
}

/**
 * Places tables in dependency layers (parents left). `maxColumnHeight` wraps a
 * layer into extra columns once it grows past that height, which is how the
 * full-schema overview is made landscape enough to fill a rotated page legibly
 * instead of being squeezed to fit a portrait one.
 */
function buildLayout(tables, maxColumnHeight = Infinity) {
  const depth = layer(tables)
  const columns = []
  for (const t of tables) {
    const d = depth.get(t) || 0
    ;(columns[d] ||= []).push(t)
  }
  const boxes = new Map()
  let x = 40
  let maxBottom = 0
  for (const colTables of columns) {
    if (!colTables) continue
    colTables.sort((a, b) => byTable.get(b).length - byTable.get(a).length)
    let y = 40
    for (const t of colTables) {
      const h = HEAD_H + byTable.get(t).length * ROW_H + 8
      if (y > 40 && y + h > maxColumnHeight) {
        x += BOX_W + COL_GAP
        y = 40
      }
      boxes.set(t, { x, y, w: BOX_W, h })
      y += h + ROW_GAP
      maxBottom = Math.max(maxBottom, y)
    }
    x += BOX_W + COL_GAP
  }
  return { boxes, width: x, height: maxBottom + 20 }
}

const PALETTE = ['#1e4f8f', '#2b6b52', '#7a3f8f', '#8f5a1e', '#8f2b3f', '#1e6f8f']

function renderHTML(title, tables, maxColumnHeight) {
  const { boxes, width, height } = buildLayout(tables, maxColumnHeight)
  const set = new Set(tables)

  const edges = []
  for (const [key, parent] of fkMap) {
    const [child, col] = key.split('.')
    if (!set.has(child) || !set.has(parent) || child === parent) continue
    const cb = boxes.get(child), pb = boxes.get(parent)
    const idx = byTable.get(child).findIndex((c) => c.column_name === col)
    const cy = cb.y + HEAD_H + idx * ROW_H + ROW_H / 2
    const py = pb.y + HEAD_H / 2 + 4
    const fromRight = pb.x < cb.x
    const x1 = fromRight ? pb.x + pb.w : pb.x
    const x2 = fromRight ? cb.x : cb.x + cb.w
    const dx = Math.max(38, Math.abs(x2 - x1) * 0.45)
    const c1 = fromRight ? x1 + dx : x1 - dx
    const c2 = fromRight ? x2 - dx : x2 + dx
    edges.push(
      `<path d="M ${x1} ${py} C ${c1} ${py}, ${c2} ${cy}, ${x2} ${cy}" fill="none" stroke="#9aa7b8" stroke-width="1.3"/>` +
      `<circle cx="${x1}" cy="${py}" r="3" fill="#9aa7b8"/>` +
      `<circle cx="${x2}" cy="${cy}" r="3" fill="#9aa7b8"/>`)
  }

  const tableHTML = tables.map((t, i) => {
    const b = boxes.get(t)
    const colour = PALETTE[i % PALETTE.length]
    const rows = byTable.get(t).map((c) => {
      const isPk = pkSet.has(`${t}.${c.column_name}`)
      const isFk = fkMap.has(`${t}.${c.column_name}`)
      const mark = isPk ? 'PK' : isFk ? 'FK' : ''
      return `<div class="r"><span class="m ${isPk ? 'pk' : isFk ? 'fk' : ''}">${mark}</span>` +
             `<span class="n${isPk ? ' b' : ''}">${c.column_name}</span>` +
             `<span class="t">${typeLabel(c)}</span></div>`
    }).join('')
    return `<div class="box" style="left:${b.x}px;top:${b.y}px;width:${b.w}px">` +
           `<div class="hd" style="background:${colour}">${t}</div>${rows}</div>`
  }).join('')

  return `<!doctype html><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#fff;font-family:"Segoe UI",Arial,sans-serif}
    #canvas{position:relative;width:${width}px;height:${height}px}
    svg{position:absolute;inset:0;width:100%;height:100%}
    .box{position:absolute;border:1px solid #c7d0db;border-radius:5px;background:#fff;
         box-shadow:0 1px 2px rgba(0,0,0,.06);overflow:hidden}
    .hd{color:#fff;font-size:12.5px;font-weight:700;padding:5px 8px;letter-spacing:.2px}
    .r{display:flex;align-items:center;gap:6px;height:${ROW_H}px;padding:0 8px;font-size:10.5px;color:#33415c}
    .r:nth-child(even){background:#f7f9fc}
    .m{width:17px;font-size:8px;font-weight:700;color:transparent}
    .m.pk{color:#b8860b}.m.fk{color:#6b7f99}
    .n{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .n.b{font-weight:700}
    .t{color:#8a97ab;font-size:9.5px}
  </style><div id="canvas"><svg>${edges.join('')}</svg>${tableHTML}</div>`
}

await fs.mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })

const jobs = Object.entries(DOMAINS).map(([name, tables], i) => ({
  file: `ERD-${i + 1}-${name.split(',')[0].split(' ')[0].toLowerCase()}.png`,
  title: name,
  tables,
}))
jobs.push({ file: 'ERD-0-overview.png', title: 'Full schema',
  tables: Object.values(DOMAINS).flat(), maxColumnHeight: 2100 })

for (const job of jobs) {
  const html = renderHTML(job.title, job.tables, job.maxColumnHeight)
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  await page.setContent(html)
  await page.waitForTimeout(300)
  const el = await page.$('#canvas')
  await el.screenshot({ path: path.join(OUT, job.file) })
  const box = await el.boundingBox()
  console.log(`${job.file}  ${job.tables.length} tables  ${Math.round(box.width)}x${Math.round(box.height)}`)
  await page.close()
}

await browser.close()
