'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, GripVertical, Bold, Italic, Heading1, Heading2, Heading3, ImageIcon, Video, List, Code, Minus, AlertCircle, AlignLeft } from 'lucide-react'
import type { ContentBlock, BlockType } from '@/lib/content-blocks'
import { blocksToHtml } from '@/lib/content-blocks'

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'heading', label: 'Heading', icon: <Heading1 className="w-4 h-4" /> },
  { type: 'paragraph', label: 'Text', icon: <AlignLeft className="w-4 h-4" /> },
  { type: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
  { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { type: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
  { type: 'code', label: 'Code', icon: <Code className="w-4 h-4" /> },
  { type: 'callout', label: 'Callout', icon: <AlertCircle className="w-4 h-4" /> },
  { type: 'divider', label: 'Divider', icon: <Minus className="w-4 h-4" /> },
]

const HEADING_LEVELS = [1, 2, 3] as const

interface ContentBlockEditorProps {
  blocks: ContentBlock[]
  onChange: (blocks: ContentBlock[]) => void
  onHtmlChange?: (html: string) => void
}

function emptyBlock(type: BlockType): ContentBlock {
  switch (type) {
    case 'heading': return { id: crypto.randomUUID(), type, data: { level: 2, text: '' } }
    case 'paragraph': return { id: crypto.randomUUID(), type, data: { text: '' } }
    case 'image': return { id: crypto.randomUUID(), type, data: { src: '', alt: '', caption: '' } }
    case 'video': return { id: crypto.randomUUID(), type, data: { url: '', caption: '' } }
    case 'interactive': return { id: crypto.randomUUID(), type, data: { contentId: '', title: '', contentType: '' } }
    case 'quiz': return { id: crypto.randomUUID(), type, data: { quizId: '', title: '' } }
    case 'checkpoint': return { id: crypto.randomUUID(), type, data: { title: '', description: '', checkpointType: 'reflection' } }
    case 'callout': return { id: crypto.randomUUID(), type, data: { variant: 'info', text: '' } }
    case 'code': return { id: crypto.randomUUID(), type, data: { language: 'text', code: '' } }
    case 'divider': return { id: crypto.randomUUID(), type, data: {} }
    case 'list': return { id: crypto.randomUUID(), type, data: { ordered: false, items: [''] } }
  }
}

export function ContentBlockEditor({ blocks, onChange, onHtmlChange }: ContentBlockEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const update = useCallback((newBlocks: ContentBlock[]) => {
    onChange(newBlocks)
    if (onHtmlChange) onHtmlChange(blocksToHtml(newBlocks))
  }, [onChange, onHtmlChange])

  const addBlock = (type: BlockType) => {
    const idx = (editingIndex ?? blocks.length - 1) + 1
    const next = [...blocks]
    next.splice(idx, 0, emptyBlock(type))
    update(next)
    setEditingIndex(idx)
  }

  const removeBlock = (id: string) => {
    update(blocks.filter((b) => b.id !== id))
    setEditingIndex(null)
  }

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return
    const next = [...blocks]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    update(next)
    setEditingIndex(to)
  }

  const updateBlockData = (id: string, data: Record<string, unknown>) => {
    update(blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...data } } : b)))
  }

  const updateBlockType = (id: string, type: BlockType) => {
    update(blocks.map((b) => (b.id === id ? emptyBlock(type) : b)))
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">No content blocks yet. Add one to get started.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {BLOCK_TYPES.map((bt) => (
              <Button key={bt.type} type="button" variant="outline" size="sm" onClick={() => addBlock(bt.type)}>
                {bt.icon}
                <span className="ml-1.5">{bt.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {blocks.map((block, idx) => (
        <div key={block.id} className={`group border rounded-xl transition-colors ${editingIndex === idx ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
          {/* Block toolbar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 bg-gray-50 rounded-t-xl">
            <button type="button" onClick={() => moveBlock(idx, idx - 1)} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-medium text-gray-500 uppercase min-w-[70px]">{block.type}</span>
            <div className="flex-1" />
            <div className="flex gap-3 items-center">
              <select
                value={block.type}
                onChange={(e) => updateBlockType(block.id, e.target.value as BlockType)}
                className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white"
              >
                {BLOCK_TYPES.map((bt) => (
                  <option key={bt.type} value={bt.type}>{bt.label}</option>
                ))}
              </select>
              <button type="button" onClick={() => setEditingIndex(editingIndex === idx ? null : idx)} className="text-xs text-blue-600 hover:text-blue-800">
                {editingIndex === idx ? 'Done' : 'Edit'}
              </button>
              <button type="button" onClick={() => removeBlock(block.id)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Add block between */}
          {editingIndex === idx && (
            <div className="flex justify-center py-1 border-b border-dashed border-gray-200">
              <div className="flex gap-1">
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    type="button"
                    onClick={() => addBlock(bt.type)}
                    className="p-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                    title={`Add ${bt.label}`}
                  >
                    {bt.icon}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Block content */}
          <div className="p-3 cursor-pointer" onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}>
            {block.type === 'heading' && (
              <div className={`font-bold text-gray-800 ${(block.data as any).level === 1 ? 'text-xl' : (block.data as any).level === 2 ? 'text-lg' : 'text-base'}`}>
                {(block.data as any).text || <span className="text-gray-300 italic">Heading...</span>}
              </div>
            )}
            {block.type === 'paragraph' && (
              <p className="text-gray-700">{(block.data as any).text || <span className="text-gray-300 italic">Text...</span>}</p>
            )}
            {block.type === 'image' && (
              <div className="flex items-center gap-3 text-sm text-gray-500">
                {(block.data as any).src ? <img src={(block.data as any).src} alt={(block.data as any).alt || ''} className="max-h-20 rounded" /> : <ImageIcon className="w-8 h-8 text-gray-300" />}
                <span>{(block.data as any).src ? 'Image added' : 'Click to add image'}</span>
              </div>
            )}
            {block.type === 'video' && (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Video className="w-4 h-4" /> {(block.data as any).url || 'No video URL set'}
              </div>
            )}
            {block.type === 'list' && (
              <div className="text-sm text-gray-700">{(block.data as any).items?.filter(Boolean).length || 0} item(s)</div>
            )}
            {block.type === 'code' && (
              <div className="text-sm font-mono text-gray-700 truncate">{(block.data as any).code || 'Empty code block'}</div>
            )}
            {block.type === 'callout' && (
              <div className={`text-sm px-3 py-2 rounded ${(block.data as any).variant === 'warning' ? 'bg-amber-50 text-amber-800' : (block.data as any).variant === 'tip' ? 'bg-blue-50 text-blue-800' : (block.data as any).variant === 'success' ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-700'}`}>
                {(block.data as any).text || 'Callout text...'}
              </div>
            )}
            {block.type === 'divider' && <hr />}
          </div>

          {/* Editing panel */}
          {editingIndex === idx && (
            <div className="p-3 border-t border-gray-100 bg-white rounded-b-xl space-y-2" onClick={(e) => e.stopPropagation()}>
              {block.type === 'heading' && (
                <div className="flex gap-3 items-start">
                  <select
                    value={String((block.data as any).level || 2)}
                    onChange={(e) => updateBlockData(block.id, { level: parseInt(e.target.value) })}
                    className="border border-gray-200 rounded px-2 py-1 text-sm w-20"
                  >
                    {HEADING_LEVELS.map((l) => <option key={l} value={l}>H{l}</option>)}
                  </select>
                  <Input
                    value={(block.data as any).text || ''}
                    onChange={(e) => updateBlockData(block.id, { text: e.target.value })}
                    placeholder="Heading text..."
                    className="flex-1"
                  />
                </div>
              )}
              {block.type === 'paragraph' && (
                <Textarea
                  value={(block.data as any).text || ''}
                  onChange={(e) => updateBlockData(block.id, { text: e.target.value })}
                  placeholder="Write your paragraph text here..."
                  rows={3}
                />
              )}
              {block.type === 'image' && (
                <div className="space-y-2">
                  <Input value={(block.data as any).src || ''} onChange={(e) => updateBlockData(block.id, { src: e.target.value })} placeholder="Image URL..." />
                  <Input value={(block.data as any).alt || ''} onChange={(e) => updateBlockData(block.id, { alt: e.target.value })} placeholder="Alt text..." />
                  <Input value={(block.data as any).caption || ''} onChange={(e) => updateBlockData(block.id, { caption: e.target.value })} placeholder="Caption (optional)..." />
                </div>
              )}
              {block.type === 'video' && (
                <div className="space-y-2">
                  <Input value={(block.data as any).url || ''} onChange={(e) => updateBlockData(block.id, { url: e.target.value })} placeholder="YouTube URL..." />
                  <Input value={(block.data as any).caption || ''} onChange={(e) => updateBlockData(block.id, { caption: e.target.value })} placeholder="Caption (optional)..." />
                </div>
              )}
              {block.type === 'list' && (
                <div className="space-y-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(block.data as any).ordered || false} onChange={(e) => updateBlockData(block.id, { ordered: e.target.checked })} />
                    Ordered (numbered) list
                  </label>
                  {((block.data as any).items as string[] || ['']).map((item: string, i: number) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={item} onChange={(e) => {
                        const items = [...((block.data as any).items as string[] || [''])]
                        items[i] = e.target.value
                        updateBlockData(block.id, { items })
                      }} placeholder={`Item ${i + 1}...`} className="flex-1" />
                      <button type="button" onClick={() => {
                        const items = ((block.data as any).items as string[] || ['']).filter((_: string, j: number) => j !== i)
                        updateBlockData(block.id, { items: items.length ? items : [''] })
                      }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    const items = [...((block.data as any).items as string[] || ['']), '']
                    updateBlockData(block.id, { items })
                  }}>Add Item</Button>
                </div>
              )}
              {block.type === 'code' && (
                <div className="space-y-2">
                  <Input value={(block.data as any).language || 'text'} onChange={(e) => updateBlockData(block.id, { language: e.target.value })} placeholder="Language (e.g., javascript)..." />
                  <Textarea value={(block.data as any).code || ''} onChange={(e) => updateBlockData(block.id, { code: e.target.value })} placeholder="Paste your code here..." rows={5} className="font-mono text-sm" />
                </div>
              )}
              {block.type === 'callout' && (
                <div className="space-y-2">
                  <select value={(block.data as any).variant || 'info'} onChange={(e) => updateBlockData(block.id, { variant: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-sm w-full">
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="tip">Tip</option>
                    <option value="success">Success</option>
                  </select>
                  <Textarea value={(block.data as any).text || ''} onChange={(e) => updateBlockData(block.id, { text: e.target.value })} placeholder="Callout text..." rows={2} />
                </div>
              )}
              {block.type === 'divider' && (
                <p className="text-xs text-gray-500 italic">Horizontal divider — no configuration needed.</p>
              )}
            </div>
          )}
        </div>
      ))}

      {blocks.length > 0 && (
        <div className="flex justify-center pt-2">
          <div className="flex gap-1">
            {BLOCK_TYPES.map((bt) => (
              <Button key={bt.type} type="button" variant="outline" size="sm" onClick={() => addBlock(bt.type)}>
                {bt.icon}
                <span className="ml-1.5">{bt.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
