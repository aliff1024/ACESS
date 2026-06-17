'use client'

import type { ContentBlock } from '@/lib/content-blocks'

interface ContentBlockViewerProps {
  blocks: ContentBlock[]
  className?: string
}

export function ContentBlockViewer({ blocks, className }: ContentBlockViewerProps) {
  if (!blocks.length) return null

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading': {
            const { level, text } = block.data as any
            const Tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
            const size = level === 1 ? 'text-2xl font-bold' : level === 2 ? 'text-xl font-semibold' : 'text-lg font-semibold'
            return <Tag key={block.id} className={`${size} text-gray-900 mt-6 mb-3`}>{text}</Tag>
          }
          case 'paragraph':
            return <p key={block.id} className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: (block.data as any).text }} />
          case 'image': {
            const { src, alt, caption } = block.data as any
            return (
              <figure key={block.id} className="my-4">
                <img src={src} alt={alt || ''} className="max-w-full rounded-lg" />
                {caption && <figcaption className="text-sm text-gray-500 mt-1 text-center">{caption}</figcaption>}
              </figure>
            )
          }
          case 'video': {
            const { url, caption } = block.data as any
            let embedUrl = url
            const ytMatch = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
            if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`
            return (
              <figure key={block.id} className="my-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
                </div>
                {caption && <figcaption className="text-sm text-gray-500 mt-1 text-center">{caption}</figcaption>}
              </figure>
            )
          }
          case 'divider':
            return <hr key={block.id} className="my-6 border-gray-200" />
          case 'code': {
            const { language, code } = block.data as any
            return (
              <pre key={block.id} className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                <code className={language ? `language-${language}` : ''}>{code}</code>
              </pre>
            )
          }
          case 'list': {
            const { ordered, items } = block.data as any
            const Tag = ordered ? 'ol' : 'ul'
            return (
              <Tag key={block.id} className="list-inside space-y-1 text-gray-700" style={{ listStyleType: ordered ? 'decimal' : 'disc' }}>
                {(items || []).map((item: string, i: number) => (
                  <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </Tag>
            )
          }
          case 'callout': {
            const { variant, text } = block.data as any
            const styles: Record<string, string> = {
              info: 'bg-blue-50 border-blue-200 text-blue-800',
              warning: 'bg-amber-50 border-amber-200 text-amber-800',
              tip: 'bg-green-50 border-green-200 text-green-800',
              success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            }
            return (
              <div key={block.id} className={`border-l-4 p-4 rounded-r-lg ${styles[variant] || styles.info}`}>
                <p dangerouslySetInnerHTML={{ __html: text }} />
              </div>
            )
          }
          case 'interactive':
            return (
              <div key={block.id} className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-blue-50">
                <p className="text-sm text-blue-700 font-medium">{(block.data as any).title || 'Interactive Activity'}</p>
                <p className="text-xs text-blue-500">Activity embedded here</p>
              </div>
            )
          case 'quiz':
            return (
              <div key={block.id} className="border-2 border-dashed border-purple-200 rounded-xl p-6 text-center bg-purple-50">
                <p className="text-sm text-purple-700 font-medium">{(block.data as any).title || 'Quiz'}</p>
                <p className="text-xs text-purple-500">Quiz embedded here</p>
              </div>
            )
          case 'checkpoint': {
            const { title, description } = block.data as any
            return (
              <div key={block.id} className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                <p className="text-sm font-semibold text-amber-800">{title}</p>
                {description && <p className="text-sm text-amber-700 mt-1">{description}</p>}
              </div>
            )
          }
          default:
            return null
        }
      })}
    </div>
  )
}
