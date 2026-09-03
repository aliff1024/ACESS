import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useRef, useState } from 'react'
import { AlignLeft, AlignCenter, AlignRight, Type, AlertTriangle } from 'lucide-react'

const ImageNodeView = (props: any) => {
  const { node, updateAttributes, selected } = props
  const [isResizing, setIsResizing] = useState(false)
  const [showAltEditor, setShowAltEditor] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const altMissing = !node.attrs.alt || String(node.attrs.alt).trim() === ''

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = imageRef.current?.clientWidth || 0

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const newWidth = Math.max(100, startWidth + deltaX)
      updateAttributes({ width: newWidth })
    }

    const onMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  let alignmentClass = 'flex justify-center my-4'
  if (node.attrs.align === 'left') alignmentClass = 'float-left mr-4 mb-2'
  if (node.attrs.align === 'right') alignmentClass = 'float-right ml-4 mb-2'

  return (
    <NodeViewWrapper className={`relative ${alignmentClass} group`} style={{ clear: node.attrs.align === 'center' ? 'both' : 'none' }} data-drag-handle>
      <div className={`relative inline-block ${selected ? 'ring-2 ring-blue-500 rounded' : altMissing ? 'ring-2 ring-amber-400 rounded' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt ?? ''}
          title={node.attrs.title}
          draggable={false}
          style={{ width: node.attrs.width !== 'auto' ? `${node.attrs.width}px` : 'auto', height: 'auto', display: 'block', maxWidth: '100%' }}
          className="rounded-lg shadow-sm"
        />

        {!selected && altMissing && (
          <div className="absolute bottom-1 left-1 bg-amber-100 text-amber-800 border border-amber-300 rounded px-1.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm">
            <AlertTriangle className="w-3 h-3" /> No description
          </div>
        )}

        {selected && (
          <>
            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur shadow-md border border-gray-200 rounded-md p-1 flex gap-1 z-10">
              <button onClick={() => updateAttributes({ align: 'left' })} className={`p-1 rounded hover:bg-gray-200 ${node.attrs.align === 'left' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`} title="Float Left">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => updateAttributes({ align: 'center' })} className={`p-1 rounded hover:bg-gray-200 ${node.attrs.align === 'center' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`} title="Center">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => updateAttributes({ align: 'right' })} className={`p-1 rounded hover:bg-gray-200 ${node.attrs.align === 'right' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`} title="Float Right">
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <div className="w-px bg-gray-200 mx-0.5" />
              <button
                onClick={() => setShowAltEditor((v) => !v)}
                className={`p-1 rounded hover:bg-gray-200 flex items-center gap-1 ${altMissing ? 'bg-amber-100 text-amber-800' : showAltEditor ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
                title="Edit alternative text (screen-reader description)"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Alt</span>
              </button>
            </div>

            {showAltEditor && (
              <div className="absolute top-12 left-2 bg-white shadow-lg border border-gray-200 rounded-md p-2 z-20 w-72">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Alternative text
                </label>
                <textarea
                  value={node.attrs.alt ?? ''}
                  onChange={(e) => updateAttributes({ alt: e.target.value })}
                  placeholder="Describe what the image shows, as if reading the lesson aloud to someone who cannot see it."
                  rows={3}
                  className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
                />
                <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                  Leave blank only if the image is purely decorative. WCAG 2.2 &mdash; 1.1.1.
                </p>
              </div>
            )}

            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize translate-x-1/2 translate-y-1/2 shadow-sm z-10"
              onMouseDown={(e) => handleResizeStart(e, 'br')}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string, alt?: string, title?: string }) => ReturnType,
    }
  }
}

export const ResizableImageExtension = Node.create({
  name: 'image',

  addCommands() {
    return {
      setImage: (options) => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },

  inline() {
    return false
  },

  group() {
    return 'block'
  },

  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: 'auto' },
      align: { default: 'center' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {}
          const element = dom as HTMLElement
          return {
            src: element.getAttribute('src'),
            title: element.getAttribute('title'),
            alt: element.getAttribute('alt'),
            width: element.getAttribute('width') || element.style.width?.replace('px', '') || 'auto',
            align: element.getAttribute('data-align') || 'center',
          }
        }
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-align': HTMLAttributes.align,
      style: `width: ${HTMLAttributes.width !== 'auto' ? `${HTMLAttributes.width}px` : 'auto'}`,
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})
