import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import React, { useRef, useState } from 'react'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

const ImageNodeView = (props: any) => {
  const { node, updateAttributes, selected } = props
  const [isResizing, setIsResizing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

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
      <div className={`relative inline-block ${selected ? 'ring-2 ring-blue-500 rounded' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          draggable={false}
          style={{ width: node.attrs.width !== 'auto' ? `${node.attrs.width}px` : 'auto', height: 'auto', display: 'block', maxWidth: '100%' }}
          className="rounded-lg shadow-sm"
        />

        {selected && (
          <>
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur shadow-md border border-gray-200 rounded-md p-1 flex gap-1 z-10">
              <button onClick={() => updateAttributes({ align: 'left' })} className={`p-1 rounded hover:bg-gray-200 ${node.attrs.align === 'left' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`} title="Float Left">
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => updateAttributes({ align: 'center' })} className={`p-1 rounded hover:bg-gray-200 ${node.attrs.align === 'center' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`} title="Center">
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => updateAttributes({ align: 'right' })} className={`p-1 rounded hover:bg-gray-200 ${node.attrs.align === 'right' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`} title="Float Right">
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

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
