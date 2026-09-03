// Writes the exact settings object ACESS's own applyPreset() produces into a
// learner's user_profiles.accessibility_prefs, so report screenshots show real
// preset output rather than hand-authored values.
import { Client } from 'pg'
import { applyPreset } from '../src/lib/adaptive-engine'

async function main() {
  const email = process.argv[2]
  const preset = process.argv[3] // 'none' | 'dyslexia' | 'adhd' | 'autism'
  const settings = applyPreset(preset)
  const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' })
  await client.connect()
  const { rows } = await client.query('select id from public.users where email=$1', [email])
  if (!rows.length) throw new Error('no user ' + email)
  await client.query(
    'update public.user_profiles set accessibility_prefs = $2::jsonb where user_id = $1',
    [rows[0].id, JSON.stringify(settings)],
  )
  console.log('applied', preset, 'to', email)
  console.log(JSON.stringify(settings))
  await client.end()
}
main().catch((e) => { console.error(e); process.exit(1) })
