export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'video'
  | 'interactive'
  | 'quiz'
  | 'checkpoint'
  | 'callout'
  | 'code'
  | 'divider'
  | 'list'

export interface ContentBlock {
  id: string
  type: BlockType
  data: Record<string, unknown>
}

// ─── Specific block data shapes ────────────────────────────────────

export interface HeadingBlockData {
  level: 1 | 2 | 3
  text: string
}

export interface ParagraphBlockData {
  text: string
}

export interface ImageBlockData {
  src: string
  alt: string
  caption?: string
}

export interface VideoBlockData {
  url: string
  caption?: string
}

export interface InteractiveBlockData {
  contentId: string
  title: string
  contentType: string
}

export interface QuizBlockData {
  quizId: string
  title: string
}

export interface CheckpointBlockData {
  title: string
  description?: string
  checkpointType?: string
}

export interface CalloutBlockData {
  variant: 'info' | 'warning' | 'tip' | 'success'
  text: string
}

export interface CodeBlockData {
  language: string
  code: string
}

export interface ListBlockData {
  ordered: boolean
  items: string[]
}

// ─── Serialization ──────────────────────────────────────────────────

export function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map((block) => {
    switch (block.type) {
      case 'heading': {
        const { level, text } = block.data as unknown as HeadingBlockData
        return `<h${level}>${escapeHtml(text)}</h${level}>`
      }
      case 'paragraph':
        return `<p>${(block.data as unknown as ParagraphBlockData).text}</p>`
      case 'image': {
        const { src, alt, caption } = block.data as unknown as ImageBlockData
        const img = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt || '')}" style="max-width:100%" />`
        return caption ? `<figure>${img}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : img
      }
      case 'video': {
        const { url, caption } = block.data as unknown as VideoBlockData
        let embed = url
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
        if (ytMatch) embed = `https://www.youtube.com/embed/${ytMatch[1]}`
        const videoHtml = `<iframe src="${escapeHtml(embed)}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9"></iframe>`
        return caption ? `<figure>${videoHtml}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : videoHtml
      }
      case 'interactive': {
        const { title } = block.data as unknown as InteractiveBlockData
        return `<div class="content-block-interactive" data-block-id="${block.id}"><p><em>[Interactive: ${escapeHtml(title)}]</em></p></div>`
      }
      case 'quiz':
        return `<div class="content-block-quiz" data-block-id="${block.id}"><p><em>[Quiz embedded here]</em></p></div>`
      case 'checkpoint': {
        const { title, description } = block.data as unknown as CheckpointBlockData
        return `<div class="content-block-checkpoint"><strong>${escapeHtml(title)}</strong>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div>`
      }
      case 'callout': {
        const { variant, text } = block.data as unknown as CalloutBlockData
        return `<div class="callout callout-${variant}">${escapeHtml(text)}</div>`
      }
      case 'code': {
        const { language, code } = block.data as unknown as CodeBlockData
        return `<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code)}</code></pre>`
      }
      case 'divider':
        return '<hr />'
      case 'list': {
        const { ordered, items } = block.data as unknown as ListBlockData
        const tag = ordered ? 'ol' : 'ul'
        const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
        return `<${tag}>${lis}</${tag}>`
      }
      default:
        return ''
    }
  }).join('\n')
}

export function htmlToBlocks(html: string): ContentBlock[] {
  if (!html.trim()) return [{ id: crypto.randomUUID(), type: 'paragraph', data: { text: '' } }]
  const blocks: ContentBlock[] = []

  const fragment = document.createElement('div')
  fragment.innerHTML = html

  for (const node of Array.from(fragment.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        blocks.push({ id: crypto.randomUUID(), type: 'paragraph', data: { text } })
      }
      continue
    }

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (/^h[1-3]$/.test(tag)) {
      blocks.push({ id: crypto.randomUUID(), type: 'heading', data: { level: parseInt(tag[1]), text: el.innerHTML } })
    } else if (tag === 'p') {
      blocks.push({ id: crypto.randomUUID(), type: 'paragraph', data: { text: el.innerHTML } })
    } else if (tag === 'img') {
      blocks.push({ id: crypto.randomUUID(), type: 'image', data: { src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '', caption: '' } })
    } else if (tag === 'figure') {
      const img = el.querySelector('img')
      const figcaption = el.querySelector('figcaption')
      const iframe = el.querySelector('iframe')
      if (img) {
        blocks.push({ id: crypto.randomUUID(), type: 'image', data: { src: img.getAttribute('src') || '', alt: img.getAttribute('alt') || '', caption: figcaption?.textContent || '' } })
      } else if (iframe) {
        blocks.push({ id: crypto.randomUUID(), type: 'video', data: { url: iframe.getAttribute('src') || '', caption: figcaption?.textContent || '' } })
      }
    } else if (tag === 'iframe') {
      blocks.push({ id: crypto.randomUUID(), type: 'video', data: { url: el.getAttribute('src') || '' } })
    } else if (tag === 'hr') {
      blocks.push({ id: crypto.randomUUID(), type: 'divider', data: {} })
    } else if (tag === 'pre') {
      const code = el.querySelector('code')
      const classMatch = code?.className.match(/language-(\w+)/)
      blocks.push({ id: crypto.randomUUID(), type: 'code', data: { language: classMatch?.[1] || 'text', code: code?.textContent || el.textContent || '' } })
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.querySelectorAll('li')).map((li) => li.innerHTML)
      blocks.push({ id: crypto.randomUUID(), type: 'list', data: { ordered: tag === 'ol', items } })
    } else if (el.classList.contains('callout')) {
      const variant = Array.from(el.classList).find((c) => c.startsWith('callout-'))?.replace('callout-', '') || 'info'
      blocks.push({ id: crypto.randomUUID(), type: 'callout', data: { variant, text: el.innerHTML } })
    } else if (tag === 'div' && el.classList.contains('content-block-interactive')) {
      blocks.push({ id: crypto.randomUUID(), type: 'interactive', data: { contentId: el.dataset.blockId || '', title: '', contentType: '' } })
    } else if (tag === 'div' && el.classList.contains('content-block-quiz')) {
      blocks.push({ id: crypto.randomUUID(), type: 'quiz', data: { quizId: el.dataset.blockId || '', title: '' } })
    } else if (tag === 'div' && el.classList.contains('content-block-checkpoint')) {
      blocks.push({ id: crypto.randomUUID(), type: 'checkpoint', data: { title: el.querySelector('strong')?.textContent || '', description: el.querySelector('p')?.textContent || '' } })
    } else {
      blocks.push({ id: crypto.randomUUID(), type: 'paragraph', data: { text: el.outerHTML } })
    }
  }

  return blocks.length ? blocks : [{ id: crypto.randomUUID(), type: 'paragraph', data: { text: html } }]
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, (ch) => map[ch])
}
