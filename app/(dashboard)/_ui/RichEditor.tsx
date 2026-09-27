'use client'
import React, { useEffect, useRef, useState } from 'react'
import MediaPicker from './MediaPicker'

/**
 * A plain, dependable rich text box: headings, bold, italic, links, lists, quotes and photos.
 * The HTML it produces is cleaned on the server into the site's own markup before saving.
 */
export default function RichEditor({ value, onChange, mode = 'article', placeholder }: { value: string; onChange: (html: string) => void; mode?: 'article' | 'simple'; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [picker, setPicker] = useState(false)
  const saved = useRef<Range | null>(null)

  // load the initial value once (and when a different document is opened)
  const loaded = useRef<string | null>(null)
  useEffect(() => {
    if (ref.current && loaded.current !== value && document.activeElement !== ref.current) {
      ref.current.innerHTML = value || ''
      loaded.current = value
    }
  }, [value])

  const emit = () => { if (ref.current) { loaded.current = ref.current.innerHTML; onChange(ref.current.innerHTML) } }
  const cmd = (c: string, arg?: string) => { ref.current?.focus(); document.execCommand(c, false, arg); emit() }
  const keepSelection = () => { const s = window.getSelection(); if (s && s.rangeCount) saved.current = s.getRangeAt(0) }
  const restoreSelection = () => { const s = window.getSelection(); if (s && saved.current) { s.removeAllRanges(); s.addRange(saved.current) } }

  const link = () => {
    keepSelection()
    const url = window.prompt('Link to (a page on the site like /contact/, or a full web address):', '/')
    if (!url) return
    restoreSelection()
    cmd('createLink', url.trim())
  }
  const insertImage = (src: string, alt: string, id?: any) => {
    ref.current?.focus()
    restoreSelection()
    const safe = (s: string) => s.replace(/"/g, '&quot;')
    document.execCommand('insertHTML', false, `<figure class="post-figure"><img src="${safe(src)}" alt="${safe(alt)}"${id != null ? ` data-media-id="${safe(String(id))}"` : ''}></figure><p><br></p>`)
    emit()
  }

  return (
    <div className={`rte rte-${mode}`}>
      <div className="rte-bar" onMouseDown={e => e.preventDefault()}>
        {mode === 'article' && <>
          <button type="button" onClick={() => cmd('formatBlock', 'P')} title="Normal text">Text</button>
          <button type="button" onClick={() => cmd('formatBlock', 'H2')} title="Heading">H2</button>
          <button type="button" onClick={() => cmd('formatBlock', 'H3')} title="Sub-heading">H3</button>
          <span className="sep" />
        </>}
        <button type="button" onClick={() => cmd('bold')} title="Bold"><b>B</b></button>
        <button type="button" onClick={() => cmd('italic')} title="Italic"><i>I</i></button>
        <button type="button" onClick={link} title="Link">Link</button>
        <span className="sep" />
        <button type="button" onClick={() => cmd('insertUnorderedList')} title="Bullet list">• List</button>
        <button type="button" onClick={() => cmd('insertOrderedList')} title="Numbered list">1. List</button>
        {mode === 'article' && <>
          <button type="button" onClick={() => cmd('formatBlock', 'BLOCKQUOTE')} title="Quote">Quote</button>
          <span className="sep" />
          <button type="button" onClick={() => { keepSelection(); setPicker(true) }} title="Photo">Photo</button>
        </>}
      </div>
      <div
        ref={ref}
        className="rte-body"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ''}
        onInput={emit}
        onBlur={emit}
        onPaste={e => { e.preventDefault(); const t = e.clipboardData.getData('text/plain'); document.execCommand('insertText', false, t); emit() }}
      />
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={p => insertImage(p.src, p.alt, p.id)} title="Add a photo to the article" />
    </div>
  )
}
