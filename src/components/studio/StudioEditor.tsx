'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2, Minus,
  Undo, Redo, ImageIcon, Download, Copy, Check,
  Highlighter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GeneratedContent, StudioImage } from '@/lib/studio-types'

// ─── Content converter: JSON → HTML for TipTap ──────────────────────────────

function contentToHTML(content: GeneratedContent, images: StudioImage[]): string {
  const imgMap = new Map(images.map(img => [img.id, img]))

  function processMarkers(text: string): string {
    // Replace [IMG:id:caption] markers with actual img tags
    return text.replace(/\[IMG:([^\]:]+):([^\]]*)\]/g, (_, id, caption) => {
      const img = imgMap.get(id)
      if (!img) return `<em>[이미지: ${id}]</em>`
      return `<figure>
        <img src="${img.dataUrl}" alt="${caption || img.description}" title="${caption || img.description}" />
        ${caption ? `<figcaption>${caption}</figcaption>` : ''}
      </figure>`
    })
    // Replace [REF:id] markers with superscript-style citations
      .replace(/\[REF:([^\]]+)\]/g, (_, id) => `<sup class="ref-marker">[참고]</sup>`)
  }

  let html = `<h1>${content.title}</h1>`

  if (content.summary) {
    html += `<blockquote><p>${content.summary}</p></blockquote>`
  }

  for (const section of content.sections ?? []) {
    const tag = `h${section.level ?? 2}`

    // Images before section
    for (const img of section.images ?? []) {
      if (img.position === 'before') {
        const studioImg = imgMap.get(img.imageId)
        if (studioImg) {
          html += `<figure><img src="${studioImg.dataUrl}" alt="${img.altText || img.caption}" />${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}</figure>`
        }
      }
    }

    html += `<${tag}>${section.heading}</${tag}>`

    // Convert markdown-like content to HTML paragraphs
    const paragraphs = processMarkers(section.content || '')
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => {
        const trimmed = p.trim()
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter(l => l.trim().startsWith('- ') || l.trim().startsWith('* '))
          return '<ul>' + items.map(item => `<li>${item.replace(/^[-*]\s+/, '')}</li>`).join('') + '</ul>'
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter(l => /^\d+\./.test(l.trim()))
          return '<ol>' + items.map(item => `<li>${item.replace(/^\d+\.\s+/, '')}</li>`).join('') + '</ol>'
        }
        if (trimmed.startsWith('> ')) return `<blockquote><p>${trimmed.slice(2)}</p></blockquote>`
        return `<p>${trimmed}</p>`
      })

    html += paragraphs.join('\n')

    // Images after section
    for (const img of section.images ?? []) {
      if (img.position === 'after') {
        const studioImg = imgMap.get(img.imageId)
        if (studioImg) {
          html += `<figure><img src="${studioImg.dataUrl}" alt="${img.altText || img.caption}" />${img.caption ? `<figcaption>${img.caption}</figcaption>` : ''}</figure>`
        }
      }
    }
  }

  // References section
  if (content.references?.length > 0) {
    html += '<h2>참고자료</h2><ul>'
    for (const ref of content.references) {
      html += `<li><a href="${ref.url}" target="_blank" rel="noopener">${ref.title || ref.url}</a>${ref.summary ? ` — ${ref.summary}` : ''}</li>`
    }
    html += '</ul>'
  }

  return html
}

// ─── Toolbar Button ──────────────────────────────────────────────────────────

function ToolbarBtn({ onClick, active, disabled, title, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        active ? 'bg-gray-100 text-gray-800' : 'text-gray-600 hover:bg-gray-100',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

function Divider() { return <div className="w-px h-5 bg-gray-200 mx-1" /> }

// ─── Main Editor ─────────────────────────────────────────────────────────────

interface StudioEditorProps {
  content: GeneratedContent
  images: StudioImage[]
  onRewriteSection?: (sectionId: string, heading: string) => void
}

export function StudioEditor({ content, images, onRewriteSection }: StudioEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [exportMode, setExportMode] = useState<'markdown' | 'html' | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        code: { HTMLAttributes: { class: 'bg-gray-100 text-pink-600 rounded px-1 font-mono text-sm' } },
        codeBlock: { HTMLAttributes: { class: 'bg-gray-900 text-green-300 rounded-xl p-4 text-sm font-mono' } },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'rounded-xl max-w-full mx-auto' },
      }),
      Placeholder.configure({ placeholder: '내용을 직접 입력하거나 위에서 생성한 콘텐츠를 편집하세요...' }),
      Highlight.configure({ HTMLAttributes: { class: 'bg-yellow-200 rounded px-0.5' } }),
      Underline,
      CharacterCount,
    ],
    content: contentToHTML(content, images),
    editorProps: {
      attributes: {
        class: 'prose prose-base max-w-none focus:outline-none min-h-[60vh] px-8 py-6',
      },
    },
  })

  // Load new content when it changes
  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(contentToHTML(content, images))
    }
  }, [content, images, editor])

  const addImage = useCallback((src: string, alt?: string) => {
    editor?.chain().focus().setImage({ src, alt: alt ?? '' }).run()
  }, [editor])

  function handleImageUpload(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = e => addImage(e.target?.result as string, file.name)
      reader.readAsDataURL(file)
    })
  }

  // ── Export functions ───────────────────────────────────────────────────────

  function getMarkdown(): string {
    if (!editor) return ''
    // Simple HTML → Markdown conversion
    const html = editor.getHTML()
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/g, '_$1_')
      .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, '> $1\n')
      .replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
      .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/g, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>[\s\S]*?<\/figure>/g, '![$2]($1)\n')
      .replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)\n')
      .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  async function copyAs(mode: 'markdown' | 'html' | 'text') {
    if (!editor) return
    let text = ''
    if (mode === 'html') text = editor.getHTML()
    else if (mode === 'markdown') text = getMarkdown()
    else text = editor.getText()
    await navigator.clipboard.writeText(text)
    setCopied(mode)
    setTimeout(() => setCopied(null), 2000)
  }

  function download(mode: 'markdown' | 'html') {
    const content = mode === 'markdown' ? getMarkdown() : editor?.getHTML() ?? ''
    const ext = mode === 'markdown' ? 'md' : 'html'
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `content.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const wordCount = editor?.storage.characterCount?.words() ?? 0
  const charCount = editor?.storage.characterCount?.characters() ?? 0

  if (!editor) return null

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-100 overflow-hidden">
      {/* Fixed Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-white flex-wrap sticky top-0 z-10">
        {/* History */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="실행 취소 (Ctrl+Z)">
          <Undo size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="다시 실행 (Ctrl+Y)">
          <Redo size={15} />
        </ToolbarBtn>
        <Divider />

        {/* Headings */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="제목 1">
          <Heading1 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="제목 2">
          <Heading2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="제목 3">
          <Heading3 size={15} />
        </ToolbarBtn>
        <Divider />

        {/* Text formatting */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게 (Ctrl+B)">
          <Bold size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임 (Ctrl+I)">
          <Italic size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="밑줄 (Ctrl+U)">
          <UnderlineIcon size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
          <Strikethrough size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="형광펜">
          <Highlighter size={15} />
        </ToolbarBtn>
        <Divider />

        {/* Lists */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="목록">
          <List size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
          <ListOrdered size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용구">
          <Quote size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="인라인 코드">
          <Code2 size={15} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
          <Minus size={15} />
        </ToolbarBtn>
        <Divider />

        {/* Image */}
        <ToolbarBtn onClick={() => fileRef.current?.click()} title="이미지 삽입">
          <ImageIcon size={15} />
        </ToolbarBtn>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleImageUpload(e.target.files)} />

        {/* Export */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => copyAs('markdown')}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="마크다운으로 복사"
          >
            {copied === 'markdown' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            MD
          </button>
          <button
            onClick={() => copyAs('html')}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="HTML로 복사"
          >
            {copied === 'html' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            HTML
          </button>
          <button
            onClick={() => download('markdown')}
            className="flex items-center gap-1 text-xs font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors"
            title="마크다운 다운로드"
          >
            <Download size={12} />
            저장
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span>{wordCount.toLocaleString()} 단어</span>
          <span>{charCount.toLocaleString()} 자</span>
          {content.estimatedReadTime && <span>읽기 {content.estimatedReadTime}</span>}
        </div>
        {content.geoOptimizations?.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-green-600 font-medium">GEO ✓</span>
            <span className="hidden sm:inline">{content.geoOptimizations.slice(0, 2).join(' · ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
