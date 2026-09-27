'use client'
import React, { useEffect, useRef, useState } from 'react'
import { rest } from './api'
import { IcUpload, IcX } from './icons'

export type Picked = { src: string; alt: string; id?: any }
type Doc = { id: any; url: string; alt: string; filename: string; width?: number; height?: number; sizes?: any; builtinPath?: string }

/**
 * Choose a photo from the media library or upload a new one. Uploads go through Payload
 * (resized to WebP and stored in Vercel Blob). Alt text is asked for on upload.
 */
export default function MediaPicker({ open, onClose, onPick, title = 'Choose a photo' }: { open: boolean; onClose: () => void; onPick: (p: Picked) => void; title?: string }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    rest('GET', '/api/media?limit=300&sort=-createdAt&depth=0').then(r => {
      setLoading(false)
      if (r.docs) setDocs(r.docs)
      else setError(r.error || 'Could not load the media library.')
    })
  }
  useEffect(() => { if (open) { setError(''); setFile(null); setAlt(''); load() } }, [open])
  if (!open) return null

  const upload = async () => {
    if (!file) return
    if (!alt.trim()) { setError('Please describe the photo in a few words (alt text). Screen readers and Google read it.'); return }
    setBusy(true); setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('_payload', JSON.stringify({ alt: alt.trim() }))
    const r = await rest('POST', '/api/media', fd)
    setBusy(false)
    if (r.doc) { onPick({ src: r.doc.url, alt: r.doc.alt, id: r.doc.id }); onClose() }
    else setError(r.error || 'Upload failed.')
  }

  const shown = docs.filter(d => !q || (d.alt + ' ' + d.filename).toLowerCase().includes(q.toLowerCase()))
  const thumb = (d: Doc) => d.sizes?.thumb?.url || d.url

  return (
    <div className="modal-back" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IcX /></button>
        </div>
        <div className="upload-row">
          <input ref={input} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0] || null; setFile(f); setAlt(f ? f.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ') : '') }} />
          {!file ? (
            <button className="btn btn-dark" onClick={() => input.current?.click()}><IcUpload size={18} /> Upload a new photo</button>
          ) : (
            <div className="upload-form">
              <span className="upload-name">{file.name}</span>
              <input className="in" value={alt} onChange={e => setAlt(e.target.value)} placeholder="Describe the photo, e.g. Dr Adeela with a patient" />
              <button className="btn btn-dark" disabled={busy} onClick={upload}>{busy ? 'Uploading…' : 'Upload and use'}</button>
              <button className="btn btn-ghost" onClick={() => setFile(null)}>Cancel</button>
            </div>
          )}
          <input className="in search" placeholder="Search the library" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {error && <p className="note note-err">{error}</p>}
        <div className="media-grid">
          {loading && <p className="muted">Loading the library…</p>}
          {!loading && !shown.length && <p className="muted">No photos yet. Upload one above.</p>}
          {shown.map(d => (
            <button key={d.id} className="media-tile" onClick={() => { onPick({ src: d.builtinPath || d.url, alt: d.alt, id: d.id }); onClose() }} title={d.alt}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(d)} alt={d.alt} loading="lazy" />
              <span>{d.alt || d.filename}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
