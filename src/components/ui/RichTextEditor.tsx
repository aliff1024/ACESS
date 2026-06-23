'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { ResizableImageExtension } from './ResizableImageExtension'
import { Table as TableExtension } from '@tiptap/extension-table'
import TableRowExtension from '@tiptap/extension-table-row'
import TableCellExtension from '@tiptap/extension-table-cell'
import TableHeaderExtension from '@tiptap/extension-table-header'
import TextAlignExtension from '@tiptap/extension-text-align'
import HighlightExtension from '@tiptap/extension-highlight'
import PlaceholderExtension from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import { useCallback, useState, useRef } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, Link, Image, Table, AlignLeft, AlignCenter, AlignRight,
  Highlighter, Minus, Code2, Heading4, Palette, RemoveFormatting, Info, FileCode, WrapText,
  ListChecks, TextQuote, Scissors,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
  minHeight?: string
  onImageUpload?: (file: File) => Promise<string>
  onOpenMediaPicker?: (onSelect: (url: string, kind: string, title?: string) => void, accept?: string) => void
}

function ToolbarButton({ onClick, active, children, title }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${active ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-300 mx-0.5" />
}

function MenuBar({ editor, showSource, onToggleSource, onImageUpload, onOpenMediaPicker }: {
  editor: Editor; showSource: boolean; onToggleSource: () => void; onImageUpload?: (file: File) => Promise<string>; onOpenMediaPicker?: (onSelect: (url: string, kind: string, title?: string) => void, accept?: string) => void
}) {
  const [linkUrl, setLinkUrl] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [showBlockPicker, setShowBlockPicker] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHeadingPicker, setShowHeadingPicker] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const addLink = useCallback(() => {
    if (!linkUrl) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    setLinkUrl('')
    setShowLinkInput(false)
  }, [editor, linkUrl])

  const addImage = useCallback(async () => {
    if (onImageUpload) {
      imageInputRef.current?.click()
      return
    }
    const url = window.prompt('Image URL:')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor, onImageUpload])

  const handleImageFile = useCallback(async (file: File) => {
    if (!onImageUpload || !file.type.startsWith('image/')) return
    setUploadingImage(true)
    try {
      const url = await onImageUpload(file)
      if (url) editor.chain().focus().setImage({ src: url }).run()
    } finally {
      setUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }, [editor, onImageUpload])

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const insertCallout = useCallback((type: string) => {
    const colors: Record<string, string> = {
      info: 'border-l-4 border-l-blue-500 bg-blue-50 p-4 rounded-r-lg my-4',
      warning: 'border-l-4 border-l-amber-500 bg-amber-50 p-4 rounded-r-lg my-4',
      tip: 'border-l-4 border-l-green-500 bg-green-50 p-4 rounded-r-lg my-4',
      danger: 'border-l-4 border-l-red-500 bg-red-50 p-4 rounded-r-lg my-4',
    }
    const labels: Record<string, string> = { info: 'Info', warning: 'Warning', tip: 'Tip', danger: 'Important' }
    editor.chain().focus().insertContent(
      `<div class="${colors[type] || colors.info}"><p class="font-bold text-sm text-${type === 'warning' ? 'amber' : type === 'tip' ? 'green' : type === 'danger' ? 'red' : 'blue'}-800 mb-1">${labels[type] || 'Info'}</p><p class="text-sm text-gray-700">Your content here...</p></div><p></p>`
    ).run()
    setShowBlockPicker(false)
  }, [editor])

  const insertCollapsible = useCallback(() => {
    editor.chain().focus().insertContent(
      `<details class="my-4 border border-gray-200 rounded-xl overflow-hidden"><summary class="px-4 py-3 bg-gray-50 font-semibold text-sm cursor-pointer hover:bg-gray-100">Click to expand</summary><div class="px-4 py-3 text-sm text-gray-700">Content here...</div></details><p></p>`
    ).run()
    setShowBlockPicker(false)
  }, [editor])

  const insertCodeBlock = useCallback(() => {
    editor.chain().focus().toggleCodeBlock().run()
  }, [editor])

  const insertAccordion = useCallback(() => {
    insertCollapsible()
  }, [insertCollapsible])

  if (!editor) return null

  return (
    <div className="border border-gray-300 rounded-t-lg bg-white sticky top-0 z-10">
      {onImageUpload && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageFile(file)
          }}
        />
      )}
      {/* Row 1: Text formatting */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-200">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight">
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
          <RemoveFormatting className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarDivider />

        <div className="relative mx-1">
          <button
            type="button"
            onClick={() => setShowHeadingPicker(!showHeadingPicker)}
            className="flex items-center justify-between w-28 h-8 px-2 text-sm text-left bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <span className="truncate">
              {editor.isActive('heading', { level: 1 }) ? 'Heading 1' :
               editor.isActive('heading', { level: 2 }) ? 'Heading 2' :
               editor.isActive('heading', { level: 3 }) ? 'Heading 3' :
               editor.isActive('heading', { level: 4 }) ? 'Heading 4' : 'Paragraph'}
            </span>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          
          {showHeadingPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 w-48">
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().setParagraph().run(); setShowHeadingPicker(false); }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${editor.isActive('paragraph') ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}>
                Paragraph
              </button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setShowHeadingPicker(false); }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-2xl font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`}>
                Heading 1
              </button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setShowHeadingPicker(false); }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-xl font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-800'}`}>
                Heading 2
              </button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setShowHeadingPicker(false); }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-lg font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-800'}`}>
                Heading 3
              </button>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { editor.chain().focus().toggleHeading({ level: 4 }).run(); setShowHeadingPicker(false); }}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-base font-bold ${editor.isActive('heading', { level: 4 }) ? 'bg-blue-50 text-blue-700' : 'text-gray-800'}`}>
                Heading 4
              </button>
            </div>
          )}
        </div>
        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarDivider />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList?.().run()} active={editor.isActive('taskList')} title="Checklist">
          <ListChecks className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Row 2: Blocks, inserts, links */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-200 bg-gray-50/50">
        <div className="relative">
          <ToolbarButton onClick={() => setShowBlockPicker(!showBlockPicker)} title="Insert callout box" active={showBlockPicker}>
            <TextQuote className="w-4 h-4" />
          </ToolbarButton>
          {showBlockPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 w-56">
              <p className="text-xs font-semibold text-gray-500 px-2 pb-1">Callout Boxes</p>
              {[{ type: 'info', label: 'Info Callout', color: 'bg-blue-50 border-blue-300' },
                { type: 'warning', label: 'Warning Callout', color: 'bg-amber-50 border-amber-300' },
                { type: 'tip', label: 'Tip Callout', color: 'bg-green-50 border-green-300' },
                { type: 'danger', label: 'Important Callout', color: 'bg-red-50 border-red-300' },
              ].map(({ type, label, color }) => (
                <button key={type} type="button" onClick={() => insertCallout(type)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 flex items-center gap-2 ${color}`}>
                  <Info className="w-4 h-4 shrink-0" /> {label}
                </button>
              ))}
              <hr className="my-1 border-gray-200" />
              <button type="button" onClick={insertAccordion}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-100 flex items-center gap-2">
                <WrapText className="w-4 h-4 shrink-0" /> Collapsible Section
              </button>
            </div>
          )}
        </div>

        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote">
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={insertCodeBlock} active={editor.isActive('codeBlock')} title="Code block">
          <FileCode className="w-4 h-4" />
        </ToolbarButton>
        <button 
          type="button" 
          onClick={() => editor.chain().focus().setHorizontalRule().run()} 
          title="Insert Page Break (creates a new slide)"
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors ml-1"
        >
          <Scissors className="w-3.5 h-3.5" /> Page Break
        </button>
        <ToolbarDivider />

        <ToolbarButton onClick={() => setShowLinkInput(!showLinkInput)} active={editor.isActive('link')} title="Insert link">
          <Link className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => {
            if (onOpenMediaPicker) {
              onOpenMediaPicker((url, kind, title) => {
                if (kind === 'image') {
                  editor.chain().focus().setImage({ src: url }).run();
                } else if (kind === 'video' || kind === 'pdf' || kind === 'link') {
                  editor.chain().focus().setLink({ href: url }).insertContent(title || url).run();
                }
              }, 'image/*');
            } else {
              addImage();
            }
          }} 
          title={onOpenMediaPicker ? 'Insert media from library' : onImageUpload ? 'Upload image' : 'Insert image'}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className={`w-4 h-4 ${uploadingImage ? 'opacity-50' : ''}`} />
        </ToolbarButton>
        <ToolbarButton onClick={addTable} title="Insert table">
          <Table className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarDivider />

        <div className="relative">
          <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)} active={showColorPicker} title="Text color">
            <Palette className="w-4 h-4" />
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-2 w-48">
              <p className="text-xs font-semibold text-gray-500 px-2 pb-1">Text Color</p>
              <div className="grid grid-cols-5 gap-1 p-1">
                {['#000000', '#4B5563', '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      editor.chain().focus().setColor(c).run()
                      setShowColorPicker(false)
                    }}
                    title={c}
                  />
                ))}
              </div>
              <button 
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                className="w-full text-xs text-center mt-2 text-gray-500 hover:text-gray-800 py-1 bg-gray-50 rounded"
              >
                Clear Color
              </button>
            </div>
          )}
        </div>
        <ToolbarDivider />

        <ToolbarButton onClick={onToggleSource} active={showSource} title="HTML source editor">
          <Code2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {showLinkInput && (
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            onKeyDown={(e) => { if (e.key === 'Enter') addLink() }}
          />
          <button type="button" onClick={addLink} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Apply</button>
          <button
            type="button"
            onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkInput(false) }}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export function RichTextEditor({ content: initialContent, onChange, placeholder = 'Start writing...', editable = true, minHeight = '300px', onImageUpload, onOpenMediaPicker }: RichTextEditorProps) {
  const [showSource, setShowSource] = useState(false)
  const [sourceHtml, setSourceHtml] = useState(initialContent)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false },
        codeBlock: {
          HTMLAttributes: { class: 'bg-gray-900 text-green-400 rounded-lg p-4 text-sm font-mono overflow-x-auto' },
        },
      }),
      Extension.create({
        name: 'pasteAsHtml',
        addProseMirrorPlugins() {
          const editor = this.editor
          return [
            new Plugin({
              props: {
                handlePaste: (view, event) => {
                  const text = event.clipboardData?.getData('text/plain')
                  const html = event.clipboardData?.getData('text/html')
                  // Allow native image pasting if it's a file
                  if (event.clipboardData?.files?.length) return false;
                  
                  if (text && !html && /<[a-z][\s\S]*>/i.test(text)) {
                    event.preventDefault()
                    editor.commands.insertContent(text)
                    return true
                  }
                  return false
                },
                handleDrop: (view, event, slice, moved) => {
                  if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image/') && onImageUpload) {
                      event.preventDefault();
                      
                      const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                      if (!coordinates) return false;

                      // Insert a placeholder or wait for upload
                      onImageUpload(file).then(url => {
                         if (url) {
                            view.dispatch(view.state.tr.insert(coordinates.pos, view.state.schema.nodes.image.create({ src: url })));
                         }
                      });
                      return true;
                    }
                  }
                  return false;
                }
              },
            }),
          ]
        },
      }),
      ResizableImageExtension,
      TableExtension.configure({ resizable: true }),
      TableRowExtension,
      TableCellExtension,
      TableHeaderExtension,
      TextAlignExtension.configure({ types: ['heading', 'paragraph'] }),
      HighlightExtension,
      TextStyle,
      Color,
      FontFamily,
      PlaceholderExtension.configure({ placeholder }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setSourceHtml(html)
      onChange(html)
    },
  })

  const handleToggleSource = useCallback(() => {
    if (showSource) {
      if (editor) {
        editor.commands.setContent(sourceHtml)
        onChange(editor.getHTML())
      }
    } else {
      if (editor) setSourceHtml(editor.getHTML())
    }
    setShowSource(!showSource)
  }, [showSource, editor, sourceHtml, onChange])

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {editable && editor && <MenuBar editor={editor} showSource={showSource} onToggleSource={handleToggleSource} onImageUpload={onImageUpload} onOpenMediaPicker={onOpenMediaPicker} />}
      {showSource ? (
        <div>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-500">HTML Source</span>
            <span className="text-xs text-gray-400">Insert custom HTML, callout boxes, embeds, or any markup</span>
            <button
              type="button"
              onClick={() => {
                const div = document.createElement('div')
                div.innerHTML = sourceHtml
                const raw = div.innerText || div.textContent || ''
                setSourceHtml(raw)
                if (editor) {
                  editor.commands.setContent(raw)
                  onChange(editor.getHTML())
                  setShowSource(false)
                }
              }}
              className="ml-auto px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Parse HTML
            </button>
          </div>
          <textarea
            value={sourceHtml}
            onChange={(e) => { setSourceHtml(e.target.value); onChange(e.target.value) }}
            className="w-full p-4 font-mono text-sm border-0 resize-none focus:outline-none"
            style={{ minHeight, fontFamily: 'monospace' }}
            placeholder="Paste or write custom HTML here..."
          />
        </div>
      ) : (
        <div
          className="prose prose-sm max-w-none p-4 overflow-y-auto overflow-x-hidden break-words w-full"
          style={{ minHeight: minHeight || '300px', maxHeight: '500px' }}
          onClick={() => editor?.commands.focus()}
        >
          <EditorContent editor={editor} />
        </div>
      )}
      
      {/* Content length warning */}
      {!showSource && editor && editor.getText().length > 1500 && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600" />
          This content block is getting long ({editor.getText().length} characters). Consider creating a new Slide/Block for better student readability.
        </div>
      )}
    </div>
  )
}
