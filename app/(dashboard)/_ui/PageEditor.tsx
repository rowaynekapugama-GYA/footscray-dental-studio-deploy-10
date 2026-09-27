'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { get, post } from './api'
import MediaPicker, { Picked } from './MediaPicker'
import { IcBack, IcDesktop, IcDown, IcExternal, IcEye, IcEyeOff, IcGrip, IcPhone, IcUp } from './icons'

type Img = { key: string; src: string; alt: string }
type Sec = { i: number; label: string; hidden: boolean }
type Seo = { title: string; description: string; og_image: string; noindex: boolean }

const counter = (n: number, lo: number, hi: number) => (n === 0 ? 'empty' : n < lo ? 'a little short' : n > hi ? 'may be cut off in Google' : 'good length')

export default function PageEditor({ path, onBack, toast }: { path: string; onBack: () => void; toast: (m: string, kind?: 'ok' | 'err') => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [meta, setMeta] = useState<any>(null)
  const [tab, setTab] = useState<'content' | 'seo' | 'sections'>('content')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [images, setImages] = useState<Img[]>([])
  const [sections, setSections] = useState<Sec[]>([])
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [seo, setSeo] = useState<Seo>({ title: '', description: '', og_image: '', noindex: false })
  const [seoDirty, setSeoDirty] = useState(false)
  const [layoutDirty, setLayoutDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState<{ key: string; target: 'page' | 'og' } | null>(null)
  const [frameKey, setFrameKey] = useState(0)
  const [drag, setDrag] = useState<number | null>(null)

  const dirtyCount = Object.keys(changes).length + (seoDirty ? 1 : 0) + (layoutDirty ? 1 : 0)
  const dirty = dirtyCount > 0

  useEffect(() => {
    get(`/api/fds/page?path=${encodeURIComponent(path)}`).then(r => { if (r.ok) { setMeta(r); setSeo(r.seo) } else toast(r.error || 'Could not open this page.', 'err') })
  }, [path])

  const toFrame = (m: any) => frame.current?.contentWindow?.postMessage({ ...m, fdsParent: 1 }, '*')

  const save = useCallback(async () => {
    if (!dirty || saving) return
    setSaving(true)
    const body: any = { path, changes: Object.entries(changes).map(([key, value]) => ({ key, value })) }
    if (seoDirty) body.seo = seo
    if (layoutDirty) body.layout = { order: sections.map(s => s.i), hidden: sections.filter(s => s.hidden).map(s => s.i) }
    const r = await post('save-page', body)
    setSaving(false)
    if (r.ok) {
      setChanges({}); setSeoDirty(false); setLayoutDirty(false)
      toFrame({ type: 'saved' })
      toast(r.message || 'Saved.', r.published === false ? 'err' : 'ok')
    } else toast(r.error || 'Could not save.', 'err')
  }, [dirty, saving, changes, seo, seoDirty, layoutDirty, sections, path])

  // messages from the page preview
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const m = e.data || {}
      if (!m.fds || e.source !== frame.current?.contentWindow) return
      if (m.type === 'ready') { setImages(m.images || []); setSections(m.sections || []) }
      if (m.type === 'change') setChanges(c => ({ ...c, [m.key]: m.value }))
      if (m.type === 'pick-image') setPicker({ key: m.key, target: 'page' })
      if (m.type === 'save') save()
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [save])

  // warn before leaving with unsaved work
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    ;(window as any).__fdsDirty = dirty
    return () => { window.removeEventListener('beforeunload', h); (window as any).__fdsDirty = false }
  }, [dirty])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [save])

  const back = () => { if (!dirty || confirm('You have unsaved changes on this page. Leave without saving?')) { (window as any).__fdsDirty = false; onBack() } }

  const picked = (p: Picked) => {
    if (!picker) return
    if (picker.target === 'og') { setSeo(s => ({ ...s, og_image: p.src })); setSeoDirty(true); return }
    const key = picker.key
    setChanges(c => ({ ...c, [key]: p.src, ...(p.alt ? { [key + '_alt']: p.alt } : {}) }))
    setImages(list => list.map(i => (i.key === key ? { ...i, src: p.src, alt: p.alt || i.alt } : i)))
    toFrame({ type: 'set-image', key, src: p.src, alt: p.alt })
  }
  const setAlt = (key: string, alt: string) => {
    setImages(list => list.map(i => (i.key === key ? { ...i, alt } : i)))
    setChanges(c => ({ ...c, [key + '_alt']: alt }))
  }

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= sections.length || from === to) return
    const next = sections.slice()
    const [s] = next.splice(from, 1)
    next.splice(to, 0, s)
    setSections(next); setLayoutDirty(true)
    toFrame({ type: 'layout', order: next.map(x => x.i), hidden: next.filter(x => x.hidden).map(x => x.i) })
  }
  const toggleSection = (idx: number) => {
    const next = sections.map((s, j) => (j === idx ? { ...s, hidden: !s.hidden } : s))
    setSections(next); setLayoutDirty(true)
    toFrame({ type: 'layout', order: next.map(x => x.i), hidden: next.filter(x => x.hidden).map(x => x.i) })
  }

  const src = useMemo(() => `/api/fds/preview?path=${encodeURIComponent(path)}&v=${frameKey}`, [path, frameKey])
  const liveUrl = path
  const shortUrl = `footscraydentalstudio.com.au${path}`

  return (
    <div className="editor">
      <header className="editor-top">
        <button className="pill" onClick={back}><IcBack size={17} /> Pages</button>
        <h1 className="editor-title">{meta?.title || 'Loading…'}</h1>
        <div className="seg" role="group" aria-label="Preview size">
          <button className={device === 'desktop' ? 'on' : ''} onClick={() => setDevice('desktop')}><IcDesktop size={16} /> Desktop</button>
          <button className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}><IcPhone size={16} /> Mobile</button>
        </div>
        <span className={`save-state ${dirty ? 'dirty' : ''}`}>{saving ? 'Saving…' : dirty ? `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'}` : 'All changes saved'}</span>
        <a className="pill" href={liveUrl} target="_blank" rel="noopener"><IcExternal size={17} /> View</a>
        <button className="btn btn-dark" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
      </header>

      <div className="editor-body">
        <div className={`stage ${device}`}>
          <div className="stage-frame">
            <iframe key={frameKey} ref={frame} src={src} title="Page preview" />
          </div>
        </div>

        <aside className="panel">
          <nav className="tabs">
            <button className={tab === 'content' ? 'on' : ''} onClick={() => setTab('content')}>Content</button>
            <button className={tab === 'seo' ? 'on' : ''} onClick={() => setTab('seo')}>SEO</button>
            <button className={tab === 'sections' ? 'on' : ''} onClick={() => setTab('sections')}>Sections</button>
          </nav>

          {tab === 'content' && (
            <div className="panel-body">
              <div className="tip">
                <p><b>Click any text on the page</b> to edit it in place.</p>
                <p><b>Click any image</b> to replace it.</p>
                <p>Press <b>Save changes</b> when you&rsquo;re done.</p>
              </div>
              <h3 className="panel-h">Images on this page ({images.length})</h3>
              {!images.length && <p className="muted small">This page has no replaceable photos.</p>}
              {images.map(img => (
                <div key={img.key} className="img-row">
                  <button className="img-thumb" onClick={() => toFrame({ type: 'focus', key: img.key })} title="Show on the page">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt="" />
                  </button>
                  <input className="in in-sm" value={img.alt} onChange={e => setAlt(img.key, e.target.value)} placeholder="Describe the photo" aria-label="Alt text" />
                  <button className="pill pill-sm" onClick={() => setPicker({ key: img.key, target: 'page' })}>Replace</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'seo' && (
            <div className="panel-body">
              <div className="gprev">
                <span className="gprev-url">{shortUrl}</span>
                <span className="gprev-title">{seo.title || meta?.defaults?.title}</span>
                <span className="gprev-desc">{seo.description || meta?.defaults?.description}</span>
              </div>
              <label className="lbl">Page title <span className="hint">{seo.title.length} characters, {counter(seo.title.length, 30, 60)}</span></label>
              <input className="in" value={seo.title} onChange={e => { setSeo({ ...seo, title: e.target.value }); setSeoDirty(true) }} />
              <p className="help">The blue link in Google and the text on the browser tab. Aim for 50 to 60 characters and keep the practice name in it.</p>
              <label className="lbl">Meta description <span className="hint">{seo.description.length} characters, {counter(seo.description.length, 110, 160)}</span></label>
              <textarea className="in" rows={4} value={seo.description} onChange={e => { setSeo({ ...seo, description: e.target.value }); setSeoDirty(true) }} />
              <p className="help">The grey text under the link in Google. Aim for 120 to 160 characters.</p>
              <label className="lbl">Social sharing image</label>
              <div className="og-row">
                {seo.og_image ? <img src={seo.og_image} alt="" /> : <span className="og-empty">Default image</span>}
                <button className="pill pill-sm" onClick={() => setPicker({ key: 'og', target: 'og' })}>{seo.og_image ? 'Change' : 'Choose'}</button>
                {seo.og_image && <button className="pill pill-sm" onClick={() => { setSeo({ ...seo, og_image: '' }); setSeoDirty(true) }}>Remove</button>}
              </div>
              <p className="help">Shown when the page is shared on Facebook, LinkedIn or by message. 1200 × 630 works best.</p>
              <label className="check"><input type="checkbox" checked={seo.noindex} onChange={e => { setSeo({ ...seo, noindex: e.target.checked }); setSeoDirty(true) }} /> Hide this page from Google</label>
              {meta && (seo.title !== meta.defaults.title || seo.description !== meta.defaults.description) && (
                <button className="link-btn" onClick={() => { setSeo({ ...seo, title: meta.defaults.title, description: meta.defaults.description }); setSeoDirty(true) }}>Restore the launch wording</button>
              )}
            </div>
          )}

          {tab === 'sections' && (
            <div className="panel-body">
              <div className="tip"><p>Drag sections to change their order, or use the eye to hide one. Hidden sections stay here and can be shown again at any time.</p></div>
              <ol className="sec-list">
                {sections.map((s, idx) => (
                  <li
                    key={s.i}
                    className={`${s.hidden ? 'is-hidden' : ''} ${drag === idx ? 'is-drag' : ''}`}
                    draggable
                    onDragStart={() => setDrag(idx)}
                    onDragOver={e => { e.preventDefault(); if (drag !== null && drag !== idx) { moveSection(drag, idx); setDrag(idx) } }}
                    onDragEnd={() => setDrag(null)}
                  >
                    <span className="grip"><IcGrip size={16} /></span>
                    <button className="sec-label" onClick={() => toFrame({ type: 'scroll-section', i: s.i })}>{s.label}</button>
                    <button className="icon-btn" onClick={() => moveSection(idx, idx - 1)} disabled={idx === 0} aria-label="Move up"><IcUp size={16} /></button>
                    <button className="icon-btn" onClick={() => moveSection(idx, idx + 1)} disabled={idx === sections.length - 1} aria-label="Move down"><IcDown size={16} /></button>
                    <button className="icon-btn" onClick={() => toggleSection(idx)} aria-label={s.hidden ? 'Show section' : 'Hide section'} title={s.hidden ? 'Hidden. Click to show' : 'Showing. Click to hide'}>{s.hidden ? <IcEyeOff size={16} /> : <IcEye size={16} />}</button>
                  </li>
                ))}
              </ol>
              {!sections.length && <p className="muted small">Loading sections…</p>}
            </div>
          )}
        </aside>
      </div>

      <MediaPicker open={!!picker} onClose={() => setPicker(null)} onPick={picked} title={picker?.target === 'og' ? 'Choose the sharing image' : 'Replace photo'} />
    </div>
  )
}
