'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { fmtDate, get, post, rest } from './api'
import MediaPicker from './MediaPicker'
import RichEditor from './RichEditor'
import { IcBack, IcDown, IcImage, IcPlus, IcTrash, IcUp } from './icons'

type Toast = (m: string, kind?: 'ok' | 'err') => void
const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b)

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="view-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      <div className="view-actions">{children}</div>
    </header>
  )
}

// ================================================================ pages
export function PagesList({ open }: { open: (path: string) => void }) {
  const [pages, setPages] = useState<any[]>([])
  const [q, setQ] = useState('')
  useEffect(() => { get('/api/fds/pages').then(r => r.ok && setPages(r.pages)) }, [])
  const groups = useMemo(() => {
    const g: Record<string, any[]> = {}
    for (const p of pages.filter(p => !q || (p.title + p.path).toLowerCase().includes(q.toLowerCase()))) (g[p.group] = g[p.group] || []).push(p)
    return g
  }, [pages, q])
  return (
    <div className="view">
      <PageHead title="Pages" sub="Choose a page to edit its wording, photos, SEO and section order.">
        <input className="in search" placeholder="Find a page" value={q} onChange={e => setQ(e.target.value)} />
      </PageHead>
      {!pages.length && <p className="muted">Loading pages…</p>}
      {Object.entries(groups).map(([name, list]) => (
        <section key={name} className="group">
          <h2 className="group-h">{name}</h2>
          <div className="list">
            {list.map(p => (
              <button key={p.path} className="list-row" onClick={() => open(p.path)}>
                <span className="list-title">{p.title}</span>
                <span className="list-meta">{p.path}</span>
                <span className="list-go">Edit</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// ================================================================ blog
export function BlogList({ open, toast }: { open: (id: string) => void; toast?: Toast }) {
  const [posts, setPosts] = useState<any[] | null>(null)
  const [waiting, setWaiting] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const load = () => get('/api/fds/posts').then(r => {
    setPosts(r.ok ? r.posts : [])
    setWaiting(r.ok && !r.imported ? (r.blobNote || 'x') : '')
  })
  useEffect(() => { load() }, [])

  // Loads the launch articles, their photos and the pages in steps (each call does ~40 seconds).
  const importNow = async () => {
    setError(''); setLoading('Starting…')
    const names: Record<string, string> = { photos: 'Uploading the article photos', pages: 'Loading the pages', articles: 'Loading the articles' }
    for (let i = 0; i < 30; i++) {
      const r = await post('import-content', {})
      if (!r.ok) { setLoading(''); setError(r.error || 'The import stopped.'); return }
      if (r.done) {
        setLoading('')
        toast?.(`${r.posts} articles loaded. ${r.message || ''}`.trim(), r.published === false ? 'err' : 'ok')
        load(); return
      }
      const c = r.counts || {}
      setLoading(`${names[r.stage] || 'Working'}… (${c.media || 0} photos, ${c.pages || 0} pages, ${c.posts || 0} articles so far in this step)`)
    }
    setLoading(''); setError('This is taking longer than expected. Press the button again to carry on from where it stopped.')
  }

  const shown = (posts || []).filter(p => !q || (p.title + ' ' + p.category).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="view">
      <PageHead title="Blog posts" sub="Write new articles and keep existing ones up to date.">
        <input className="in search" placeholder="Find a post" value={q} onChange={e => setQ(e.target.value)} />
        {posts && !waiting && <button className="btn btn-dark" onClick={() => open('new')}><IcPlus size={18} /> New post</button>}
      </PageHead>
      {!posts && <p className="muted">Loading posts…</p>}
      {waiting && (
        <section className="card">
          <h2 className="card-h">Load the existing articles</h2>
          <p>The 32 articles already on the website are not in the dashboard yet. Loading them copies each article and its photos in, so you can edit them and add new ones. It takes a few minutes; keep this page open. The live blog is not affected.</p>
          {waiting !== 'x' && <p className="note note-err">{waiting}</p>}
          {error && <p className="note note-err">{error}</p>}
          {loading ? <p className="muted"><span className="spinner spinner-sm" /> {loading}</p>
            : <button className="btn btn-dark" disabled={waiting !== 'x'} onClick={importNow}>Load the 32 articles now</button>}
        </section>
      )}
      <div className="list">
        {shown.map(p => (
          <button key={p.id} className="list-row" onClick={() => open(String(p.id))}>
            <span className="list-title">{p.title}</span>
            <span className="list-meta">{p.category} · {fmtDate(p.datePublished)}</span>
            <span className={`status-pill ${p.status === 'published' ? 'live' : ''}`}>{p.status === 'published' ? 'Published' : 'Draft'}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const blankPost = () => ({ id: null, title: '', slug: '', category: 'Dental Health', datePublished: new Date().toISOString().slice(0, 10), excerpt: '', featuredImage: '', featuredAlt: '', body: '', surgicalDisclaimer: false, metaTitle: '', metaDescription: '', noindex: false, status: 'draft' })

export function BlogEditor({ id, back, toast, goTo }: { id: string; back: () => void; toast: Toast; goTo: (id: string) => void }) {
  const [post0, setPost0] = useState<any>(null)
  const [p, setP] = useState<any>(null)
  const [picker, setPicker] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (id === 'new') { const b = blankPost(); setPost0(b); setP(b); return }
    get(`/api/fds/post?id=${encodeURIComponent(id)}`).then(r => { if (r.ok) { setPost0(r.post); setP(r.post) } else toast(r.error || 'Could not open this post.', 'err') })
  }, [id])
  if (!p) return <div className="view"><p className="muted">Loading…</p></div>
  const dirty = !same(p, post0)
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }))

  const save = async (status?: string) => {
    setBusy(true)
    const body = { ...p, status: status || p.status }
    const r = await post('save-post', body)
    setBusy(false)
    if (r.ok) {
      const saved = { ...body, id: r.id, slug: r.slug }
      setPost0(saved); setP(saved)
      toast(r.message || 'Saved.', r.published === false ? 'err' : 'ok')
      if (id === 'new') goTo(String(r.id))
    } else toast(r.error || 'Could not save.', 'err')
  }
  const del = async () => {
    if (!p.id || !confirm('Delete this post? It will be removed from the website.')) return
    const r = await post('delete-post', { id: p.id })
    if (r.ok) { toast(r.message || 'Deleted.'); back() } else toast(r.error || 'Could not delete.', 'err')
  }

  return (
    <div className="view view-wide">
      <header className="view-head">
        <div className="head-left">
          <button className="pill" onClick={() => { if (!dirty || confirm('Leave without saving?')) back() }}><IcBack size={17} /> Blog posts</button>
          <span className={`status-pill ${p.status === 'published' ? 'live' : ''}`}>{p.status === 'published' ? 'Published' : 'Draft'}</span>
          <span className={`save-state ${dirty ? 'dirty' : ''}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
        <div className="view-actions">
          {p.id && p.status === 'published' && <a className="pill" href={`/${p.slug}/`} target="_blank" rel="noopener">View</a>}
          {p.status === 'published'
            ? <><button className="btn btn-ghost" disabled={busy} onClick={() => save('draft')}>Unpublish</button><button className="btn btn-dark" disabled={busy || !dirty} onClick={() => save('published')}>{busy ? 'Saving…' : 'Save changes'}</button></>
            : <><button className="btn btn-ghost" disabled={busy} onClick={() => save('draft')}>Save draft</button><button className="btn btn-dark" disabled={busy} onClick={() => save('published')}>{busy ? 'Saving…' : 'Publish'}</button></>}
        </div>
      </header>
      <div className="post-grid">
        <div className="post-main">
          <input className="in in-title" value={p.title} onChange={e => set('title', e.target.value)} placeholder="Article headline" />
          <RichEditor value={p.body} onChange={v => set('body', v)} placeholder="Start writing…" />
        </div>
        <aside className="post-side card">
          <label className="lbl">Featured image</label>
          <button className="feat" onClick={() => setPicker(true)}>
            {p.featuredImage ? <img src={p.featuredImage} alt="" /> : <span><IcImage /> Choose a photo</span>}
          </button>
          <input className="in in-sm" value={p.featuredAlt} onChange={e => set('featuredAlt', e.target.value)} placeholder="Describe the photo" />
          <label className="lbl">Summary</label>
          <textarea className="in" rows={3} value={p.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="One or two sentences for the blog page" />
          <div className="two">
            <div><label className="lbl">Category</label><input className="in" value={p.category} onChange={e => set('category', e.target.value)} /></div>
            <div><label className="lbl">Date</label><input className="in" type="date" value={p.datePublished} onChange={e => set('datePublished', e.target.value)} /></div>
          </div>
          <label className="lbl">Web address</label>
          <div className="slug"><span>/</span><input className="in" value={p.slug} onChange={e => set('slug', e.target.value)} placeholder="made from the headline" /><span>/</span></div>
          {p.id && p.status === 'published' && <p className="help">Changing the address of a live post breaks links to it. Add a redirect in Settings if you do.</p>}
          <label className="check"><input type="checkbox" checked={p.surgicalDisclaimer} onChange={e => set('surgicalDisclaimer', e.target.checked)} /> Add the surgical procedure note (implants, extractions and other invasive treatment)</label>
          <h3 className="panel-h">Search engines</h3>
          <label className="lbl">Page title <span className="hint">{p.metaTitle.length}</span></label>
          <input className="in" value={p.metaTitle} onChange={e => set('metaTitle', e.target.value)} placeholder={`${p.title || 'Headline'} | Footscray Dental Studio`} />
          <label className="lbl">Meta description <span className="hint">{p.metaDescription.length}</span></label>
          <textarea className="in" rows={3} value={p.metaDescription} onChange={e => set('metaDescription', e.target.value)} placeholder="Uses the summary if left empty" />
          <label className="check"><input type="checkbox" checked={p.noindex} onChange={e => set('noindex', e.target.checked)} /> Hide this post from Google</label>
          {p.id && <button className="link-btn danger" onClick={del}>Delete this post</button>}
        </aside>
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={x => setP((o: any) => ({ ...o, featuredImage: x.src, featuredAlt: o.featuredAlt || x.alt }))} title="Featured image" />
    </div>
  )
}

// ================================================================ practice details, team, offers (all from the content store)
function useContent() {
  const [data, setData] = useState<any>(null)
  const [orig, setOrig] = useState<any>(null)
  const reload = () => get('/api/fds/content').then(r => { if (r.ok) { setData(r); setOrig(r) } })
  useEffect(() => { reload() }, [])
  return { data, setData, orig, setOrig }
}

function SaveBar({ dirty, busy, onSave }: { dirty: boolean; busy: boolean; onSave: () => void }) {
  return (
    <>
      <span className={`save-state ${dirty ? 'dirty' : ''}`}>{busy ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}</span>
      <button className="btn btn-dark" disabled={!dirty || busy} onClick={onSave}>{busy ? 'Saving…' : 'Save changes'}</button>
    </>
  )
}

export function PracticeView({ toast }: { toast: Toast }) {
  const { data, setData, orig, setOrig } = useContent()
  const [busy, setBusy] = useState(false)
  if (!data) return <div className="view"><p className="muted">Loading…</p></div>
  const pick = (d: any) => ({ practice: d.practice, hours: d.hours, hours_note: d.hours_note, announcement: d.announcement })
  const dirty = !same(pick(data), pick(orig))
  const pr = data.practice || {}
  const setPr = (k: string, v: string) => setData({ ...data, practice: { ...pr, [k]: v } })
  const an = data.announcement || {}
  const hours: any[] = data.hours || []
  const save = async () => {
    setBusy(true)
    const r = await post('save-content', pick(data))
    setBusy(false)
    if (r.ok) { setOrig(data); toast(r.message || 'Saved.', r.published === false ? 'err' : 'ok') } else toast(r.error || 'Could not save.', 'err')
  }
  const field = (k: string, label: string, help?: string) => (
    <div className="field">
      <label className="lbl">{label}</label>
      <input className="in" value={pr[k] || ''} onChange={e => setPr(k, e.target.value)} />
      {help && <p className="help">{help}</p>}
    </div>
  )
  return (
    <div className="view">
      <PageHead title="Practice details" sub="Used on every page of the website, including the Call buttons and the details Google reads."><SaveBar dirty={dirty} busy={busy} onSave={save} /></PageHead>
      <section className="card">
        <h2 className="card-h">Contact</h2>
        <div className="two">{field('phone', 'Phone number')}{field('email', 'Email address')}</div>
        {field('address', 'Street address')}
        {field('maps_url', 'Google Maps link', 'Where the Get Directions buttons go.')}
      </section>
      <section className="card">
        <h2 className="card-h">Opening hours</h2>
        {hours.map((h, i) => (
          <div className="hours-row" key={i}>
            <input className="in" value={h.days} placeholder="Monday–Friday" onChange={e => setData({ ...data, hours: hours.map((x, j) => (j === i ? { ...x, days: e.target.value } : x)) })} />
            <input className="in" value={h.time} placeholder="9:00am–5:00pm, or Closed" onChange={e => setData({ ...data, hours: hours.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)) })} />
            <button className="icon-btn" aria-label="Remove row" onClick={() => setData({ ...data, hours: hours.filter((_, j) => j !== i) })}><IcTrash size={17} /></button>
          </div>
        ))}
        <button className="pill pill-sm" onClick={() => setData({ ...data, hours: [...hours, { days: '', time: '' }] })}><IcPlus size={16} /> Add a row</button>
        <div className="field"><label className="lbl">Note under the hours</label><input className="in" value={data.hours_note || ''} onChange={e => setData({ ...data, hours_note: e.target.value })} placeholder="e.g. Closed public holidays" /></div>
      </section>
      <section className="card">
        <h2 className="card-h">Announcement bar</h2>
        <label className="check"><input type="checkbox" checked={!!an.enabled} onChange={e => setData({ ...data, announcement: { ...an, enabled: e.target.checked } })} /> Show a message across the top of every page</label>
        <div className="field"><label className="lbl">Message</label><input className="in" value={an.text || ''} onChange={e => setData({ ...data, announcement: { ...an, text: e.target.value } })} placeholder="e.g. We are closed from 24 December to 2 January" /></div>
        <div className="field"><label className="lbl">Link (optional)</label><input className="in" value={an.link || ''} onChange={e => setData({ ...data, announcement: { ...an, link: e.target.value } })} placeholder="/contact/" /></div>
      </section>
      <section className="card">
        <h2 className="card-h">Online</h2>
        <div className="two">{field('review_url', 'Google reviews link', 'Leave empty to hide the reviews badge.')}{field('review_label', 'Reviews badge text')}</div>
        <div className="three">{field('facebook', 'Facebook')}{field('instagram', 'Instagram')}{field('linkedin', 'LinkedIn')}</div>
      </section>
    </div>
  )
}

function Reorder({ i, n, move, remove }: { i: number; n: number; move: (a: number, b: number) => void; remove: () => void }) {
  return (
    <div className="reorder">
      <button className="icon-btn" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up"><IcUp size={16} /></button>
      <button className="icon-btn" disabled={i === n - 1} onClick={() => move(i, i + 1)} aria-label="Move down"><IcDown size={16} /></button>
      <button className="icon-btn" onClick={remove} aria-label="Remove"><IcTrash size={16} /></button>
    </div>
  )
}
const moveIn = (arr: any[], a: number, b: number) => { const x = arr.slice(); const [it] = x.splice(a, 1); x.splice(b, 0, it); return x }

export function TeamView({ toast }: { toast: Toast }) {
  const { data, setData, orig, setOrig } = useContent()
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<number | null>(null)
  if (!data) return <div className="view"><p className="muted">Loading…</p></div>
  const team: any[] = data.team || []
  const dirty = !same(team, orig.team)
  const upd = (i: number, k: string, v: any) => setData({ ...data, team: team.map((t, j) => (j === i ? { ...t, [k]: v } : t)) })
  const save = async () => {
    setBusy(true)
    const r = await post('save-content', { team })
    setBusy(false)
    if (r.ok) { setOrig({ ...orig, team }); toast(r.message || 'Saved.', r.published === false ? 'err' : 'ok') } else toast(r.error || 'Could not save.', 'err')
  }
  return (
    <div className="view">
      <PageHead title="Team" sub="The practitioners on the Meet the Team page, in the order shown.">
        <button className="pill" onClick={() => setData({ ...data, team: [...team, { name: '', role: 'Dentist', photo: '', bio: '' }] })}><IcPlus size={16} /> Add a practitioner</button>
        <SaveBar dirty={dirty} busy={busy} onSave={save} />
      </PageHead>
      <p className="note">Names and qualifications must match the practitioner&rsquo;s registration exactly.</p>
      {team.map((t, i) => (
        <section className="card person" key={i}>
          <button className="person-photo" onClick={() => setPicker(i)}>{t.photo ? <img src={t.photo} alt="" /> : <span><IcImage /> Photo</span>}</button>
          <div className="person-body">
            <div className="two">
              <div><label className="lbl">Name</label><input className="in" value={t.name} onChange={e => upd(i, 'name', e.target.value)} /></div>
              <div><label className="lbl">Role</label><input className="in" value={t.role} onChange={e => upd(i, 'role', e.target.value)} /></div>
            </div>
            <label className="lbl">Bio</label>
            <RichEditor mode="simple" value={t.bio} onChange={v => upd(i, 'bio', v)} />
          </div>
          <Reorder i={i} n={team.length} move={(a, b) => setData({ ...data, team: moveIn(team, a, b) })} remove={() => { if (confirm(`Remove ${t.name || 'this practitioner'} from the website?`)) setData({ ...data, team: team.filter((_, j) => j !== i) }) }} />
        </section>
      ))}
      <MediaPicker open={picker !== null} onClose={() => setPicker(null)} onPick={p => picker !== null && upd(picker, 'photo', p.src)} title="Practitioner photo" />
    </div>
  )
}

export function OffersView({ toast }: { toast: Toast }) {
  const { data, setData, orig, setOrig } = useContent()
  const [busy, setBusy] = useState(false)
  if (!data) return <div className="view"><p className="muted">Loading…</p></div>
  const offers: any[] = data.offers || []
  const dirty = !same(offers, orig.offers)
  const upd = (i: number, k: string, v: any) => setData({ ...data, offers: offers.map((t, j) => (j === i ? { ...t, [k]: v } : t)) })
  const save = async () => {
    setBusy(true)
    const r = await post('save-content', { offers })
    setBusy(false)
    if (r.ok) { setOrig({ ...orig, offers }); toast(r.message || 'Saved.', r.published === false ? 'err' : 'ok') } else toast(r.error || 'Could not save.', 'err')
  }
  return (
    <div className="view">
      <PageHead title="Special offers" sub="Shown on the Special Offers page, and as cards on the homepage.">
        <button className="pill" onClick={() => setData({ ...data, offers: [...offers, { title: '', price: '', note: '', body: '', bullets: '', cta_label: 'Book Now' }] })}><IcPlus size={16} /> Add an offer</button>
        <SaveBar dirty={dirty} busy={busy} onSave={save} />
      </PageHead>
      <p className="note">Advertising rules: every offer states the exact price, what it includes and when it ends. No &ldquo;free&rdquo; unless it truly is, and no urgency wording.</p>
      {offers.map((o, i) => (
        <section className="card" key={i}>
          <div className="card-top">
            <h2 className="card-h">{o.title || 'New offer'}</h2>
            <Reorder i={i} n={offers.length} move={(a, b) => setData({ ...data, offers: moveIn(offers, a, b) })} remove={() => { if (confirm('Remove this offer from the website?')) setData({ ...data, offers: offers.filter((_, j) => j !== i) }) }} />
          </div>
          <div className="two">
            <div><label className="lbl">Title</label><input className="in" value={o.title} onChange={e => upd(i, 'title', e.target.value)} /></div>
            <div><label className="lbl">Price</label><input className="in" value={o.price} onChange={e => upd(i, 'price', e.target.value)} placeholder="$135" /></div>
          </div>
          <label className="lbl">Small note under the title</label>
          <input className="in" value={o.note} onChange={e => upd(i, 'note', e.target.value)} />
          <label className="lbl">Description</label>
          <RichEditor mode="simple" value={o.body} onChange={v => upd(i, 'body', v)} />
          <label className="lbl">What&rsquo;s included (one per line)</label>
          <textarea className="in" rows={4} value={o.bullets} onChange={e => upd(i, 'bullets', e.target.value)} />
          <label className="lbl">Button text</label>
          <input className="in" value={o.cta_label} onChange={e => upd(i, 'cta_label', e.target.value)} />
        </section>
      ))}
    </div>
  )
}

// ================================================================ enquiries
export function EnquiriesView({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<any[] | null>(null)
  const [openId, setOpenId] = useState<any>(null)
  useEffect(() => { rest('GET', '/api/enquiries?limit=200&sort=-createdAt&depth=0').then(r => setRows(r.docs || [])) }, [])
  const follow = async (e: any, v: boolean) => {
    const r = await rest('PATCH', `/api/enquiries/${e.id}`, { followedUp: v })
    if (r.doc) setRows(list => (list || []).map(x => (x.id === e.id ? { ...x, followedUp: v } : x)))
    else toast(r.error || 'Could not update.', 'err')
  }
  const kind: Record<string, string> = { appointment: 'Appointment', contact: 'Message', newsletter: 'Newsletter' }
  return (
    <div className="view">
      <PageHead title="Enquiries" sub="Every form sent from the website, kept here as well as emailed to the practice." />
      {!rows && <p className="muted">Loading…</p>}
      {rows && !rows.length && <p className="muted">No enquiries yet.</p>}
      <div className="list">
        {(rows || []).map(e => (
          <div key={e.id} className={`enq ${e.followedUp ? 'done' : ''}`}>
            <button className="enq-row" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
              <span className="enq-date">{fmtDate(e.createdAt, true)}</span>
              <span className="enq-type">{kind[e.formType] || e.formType}</span>
              <span className="enq-name">{e.name || e.email}</span>
              <span className="list-meta">{e.phone}</span>
              {e.emailStatus === 'failed' && <span className="status-pill err">Email failed</span>}
            </button>
            {openId === e.id && (
              <div className="enq-body">
                <p><b>Email:</b> <a href={`mailto:${e.email}`}>{e.email}</a> · <b>Phone:</b> <a href={`tel:${e.phone}`}>{e.phone}</a></p>
                {e.service && <p><b>Service:</b> {e.service}{e.preferred ? ` · Preferred: ${e.preferred}` : ''}</p>}
                {e.message && <p className="enq-msg">{e.message}</p>}
                <label className="check"><input type="checkbox" checked={!!e.followedUp} onChange={ev => follow(e, ev.target.checked)} /> Followed up</label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ================================================================ settings
export function SettingsView({ me, toast, refresh }: { me: any; toast: Toast; refresh: () => void }) {
  const [pw, setPw] = useState({ a: '', b: '' })
  const [users, setUsers] = useState<any[]>([])
  const [nu, setNu] = useState({ email: '', name: '', password: '' })
  const [redirects, setRedirects] = useState<any[]>([])
  const [nr, setNr] = useState({ from: '', to: '' })
  const [busy, setBusy] = useState(false)
  const admin = me.user.role === 'admin'
  const loadUsers = () => admin && rest('GET', '/api/users?limit=100&depth=0').then(r => setUsers(r.docs || []))
  const loadRedirects = () => rest('GET', '/api/redirects?limit=500&depth=0').then(r => setRedirects(r.docs || []))
  useEffect(() => { loadUsers(); loadRedirects(); refresh() }, [])

  const publish = async () => { setBusy(true); const r = await post('publish', {}); setBusy(false); toast(r.message || r.error || 'Done.', r.ok ? 'ok' : 'err'); refresh() }
  const changePw = async () => {
    if (pw.a.length < 10) return toast('Use at least 10 characters.', 'err')
    if (pw.a !== pw.b) return toast('The two passwords do not match.', 'err')
    const r = await rest('PATCH', `/api/users/${me.user.id}`, { password: pw.a })
    if (r.doc) { setPw({ a: '', b: '' }); toast('Password changed.') } else toast(r.error || 'Could not change the password.', 'err')
  }
  const addUser = async () => {
    if (!nu.email || nu.password.length < 10) return toast('Enter an email and a password of at least 10 characters.', 'err')
    const r = await rest('POST', '/api/users', { ...nu, role: 'editor' })
    if (r.doc) { setNu({ email: '', name: '', password: '' }); loadUsers(); toast(`${r.doc.email} can now sign in.`) } else toast(r.error || 'Could not add the user.', 'err')
  }
  const removeUser = async (u: any) => { if (u.id === me.user.id || !confirm(`Remove ${u.email}? They will no longer be able to sign in.`)) return; await rest('DELETE', `/api/users/${u.id}`); loadUsers() }
  const addRedirect = async () => {
    if (!nr.from.startsWith('/') || !nr.to) return toast('The old address must start with / and the new one cannot be empty.', 'err')
    const r = await rest('POST', '/api/redirects', { from: nr.from, to: nr.to, type: '301' })
    if (r.doc) { setNr({ from: '', to: '' }); loadRedirects(); toast('Redirect added. It takes effect on the next publish.') } else toast(r.error || 'Could not add the redirect.', 'err')
  }
  const removeRedirect = async (r: any) => { await rest('DELETE', `/api/redirects/${r.id}`); loadRedirects() }

  const s = me.status || {}
  const waiting = s.lastChangedAt && (!s.lastPublishedAt || s.lastChangedAt > s.lastPublishedAt)
  return (
    <div className="view">
      <PageHead title="Settings" />
      <section className="card">
        <h2 className="card-h">Website</h2>
        <p>{waiting ? 'Some saved changes may not be on the website yet.' : 'The website is up to date with your changes.'} Saving in the dashboard updates the website by itself; use this if you need to push it again.</p>
        <p className="muted small">Last change {fmtDate(s.lastChangedAt, true)} · last published {fmtDate(s.lastPublishedAt, true)}</p>
        {!me.hookConfigured && <p className="note note-err">Publishing is not connected yet (PUBLISH_HOOK_URL). Changes are saved but the website will not update until it is.</p>}
        {me.blobNote && <p className="note note-err">{me.blobNote}</p>}
        <button className="btn btn-dark" disabled={busy} onClick={publish}>{busy ? 'Starting…' : 'Update the website now'}</button>
      </section>
      <section className="card">
        <h2 className="card-h">Your password</h2>
        <div className="two">
          <div><label className="lbl">New password</label><input className="in" type="password" autoComplete="new-password" value={pw.a} onChange={e => setPw({ ...pw, a: e.target.value })} /></div>
          <div><label className="lbl">Type it again</label><input className="in" type="password" autoComplete="new-password" value={pw.b} onChange={e => setPw({ ...pw, b: e.target.value })} /></div>
        </div>
        <button className="btn btn-dark" onClick={changePw}>Change password</button>
      </section>
      {admin && (
        <section className="card">
          <h2 className="card-h">People who can sign in</h2>
          <div className="list compact">
            {users.map(u => (
              <div className="list-row static" key={u.id}>
                <span className="list-title">{u.name || u.email}</span>
                <span className="list-meta">{u.email} · {u.role === 'admin' ? 'Admin (GYA)' : 'Editor'}</span>
                {u.id !== me.user.id && <button className="icon-btn" onClick={() => removeUser(u)} aria-label="Remove"><IcTrash size={16} /></button>}
              </div>
            ))}
          </div>
          <div className="three">
            <input className="in" placeholder="Name" value={nu.name} onChange={e => setNu({ ...nu, name: e.target.value })} />
            <input className="in" placeholder="Email" value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })} />
            <input className="in" placeholder="Temporary password" value={nu.password} onChange={e => setNu({ ...nu, password: e.target.value })} />
          </div>
          <button className="pill" onClick={addUser}><IcPlus size={16} /> Add editor</button>
        </section>
      )}
      <section className="card">
        <h2 className="card-h">Redirects</h2>
        <p className="muted small">Send an old address to a new one, for example after renaming a blog post.</p>
        <div className="list compact">
          {redirects.map(r => (
            <div className="list-row static" key={r.id}>
              <span className="list-title">{r.from}</span><span className="list-meta">→ {r.to}</span>
              <button className="icon-btn" onClick={() => removeRedirect(r)} aria-label="Remove"><IcTrash size={16} /></button>
            </div>
          ))}
        </div>
        <div className="two">
          <input className="in" placeholder="Old address, e.g. /old-page/" value={nr.from} onChange={e => setNr({ ...nr, from: e.target.value })} />
          <input className="in" placeholder="New address, e.g. /contact/" value={nr.to} onChange={e => setNr({ ...nr, to: e.target.value })} />
        </div>
        <button className="pill" onClick={addRedirect}><IcPlus size={16} /> Add redirect</button>
      </section>
      {admin && <p className="muted small">GYA only: the full content database is at <a href="/cms">/cms</a>.</p>}
    </div>
  )
}
