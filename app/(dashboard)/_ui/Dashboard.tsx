'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { get, post, rest } from './api'
import { IcPages, IcBlog, IcTeam, IcOffer, IcPin, IcInbox, IcGear, IcExternal } from './icons'
import PageEditor from './PageEditor'
import { PagesList, BlogList, BlogEditor, PracticeView, TeamView, OffersView, EnquiriesView, SettingsView } from './views'

type Me = { ok: boolean; user: { id: any; email: string; name?: string; role?: string }; status?: any; hookConfigured?: boolean; blobNote?: string }
type ToastT = { id: number; msg: string; kind: 'ok' | 'err' }

const NAV = [
  { href: '/admin/', label: 'Pages', icon: IcPages, match: (p: string) => p === '/admin/' || p.startsWith('/admin/pages') },
  { href: '/admin/blog/', label: 'Blog posts', icon: IcBlog, match: (p: string) => p.startsWith('/admin/blog') },
  { href: '/admin/team/', label: 'Team', icon: IcTeam, match: (p: string) => p.startsWith('/admin/team') },
  { href: '/admin/offers/', label: 'Special offers', icon: IcOffer, match: (p: string) => p.startsWith('/admin/offers') },
  { href: '/admin/practice/', label: 'Practice details', icon: IcPin, match: (p: string) => p.startsWith('/admin/practice') },
  { href: '/admin/enquiries/', label: 'Enquiries', icon: IcInbox, match: (p: string) => p.startsWith('/admin/enquiries') },
  { href: '/admin/settings/', label: 'Settings', icon: IcGear, match: (p: string) => p.startsWith('/admin/settings') },
]

const norm = (p: string) => (p.endsWith('/') ? p : p + '/')

export default function Dashboard() {
  const [me, setMe] = useState<Me | null | false>(null)
  const [path, setPath] = useState('/admin/')
  const [toasts, setToasts] = useState<ToastT[]>([])
  const [menu, setMenu] = useState(false)

  const toast = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), kind === 'err' ? 7000 : 3800)
  }, [])

  const refresh = useCallback(() => { get('/api/fds/me').then(r => setMe(r.ok && r.user ? (r as Me) : false)) }, [])
  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    setPath(norm(window.location.pathname))
    const onPop = () => setPath(norm(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((to: string) => {
    const t = norm(to)
    if ((window as any).__fdsDirty && !confirm('You have changes that are not saved yet. Leave without saving?')) return
    ;(window as any).__fdsDirty = false
    window.history.pushState({}, '', t)
    setPath(t)
    setMenu(false)
    window.scrollTo(0, 0)
  }, [])

  const signOut = async () => {
    if ((window as any).__fdsDirty && !confirm('You have changes that are not saved yet. Sign out anyway?')) return
    await rest('POST', '/api/users/logout')
    setMe(false)
    window.history.replaceState({}, '', '/admin/')
    setPath('/admin/')
  }

  if (me === null) return <div className="boot"><div className="spinner" aria-label="Loading" /></div>
  if (me === false) return <Login onDone={() => { refresh(); toast('Welcome back.') }} />

  // ---- routing
  const seg = path.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  let body: React.ReactNode
  let fullBleed = false
  if (seg[0] === 'pages' && seg.length > 1) {
    const pagePath = '/' + seg.slice(1).map(decodeURIComponent).join('/') + '/'
    const p = pagePath === '/home/' ? '/' : pagePath
    body = <PageEditor key={p} path={p} onBack={() => go('/admin/')} toast={toast} />
    fullBleed = true
  } else if (seg[0] === 'blog' && seg[1]) {
    body = <BlogEditor key={seg[1]} id={seg[1]} back={() => go('/admin/blog/')} toast={toast} goTo={id => { window.history.replaceState({}, '', `/admin/blog/${id}/`); setPath(`/admin/blog/${id}/`) }} />
  } else if (seg[0] === 'blog') body = <BlogList open={id => go(`/admin/blog/${id}/`)} toast={toast} />
  else if (seg[0] === 'team') body = <TeamView toast={toast} />
  else if (seg[0] === 'offers') body = <OffersView toast={toast} />
  else if (seg[0] === 'practice') body = <PracticeView toast={toast} />
  else if (seg[0] === 'enquiries') body = <EnquiriesView toast={toast} />
  else if (seg[0] === 'settings') body = <SettingsView me={me} toast={toast} refresh={refresh} />
  else body = <PagesList open={p => go(`/admin/pages${p === '/' ? '/home' : p.replace(/\/$/, '')}/`)} />

  const who = me.user.name || me.user.email

  return (
    <div className={`shell${fullBleed ? ' is-editing' : ''}${menu ? ' menu-open' : ''}`}>
      <aside className="side">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/img/admin-mark.png" alt="" width={36} height={36} />
          <div>
            <strong>Footscray Dental Studio</strong>
            <span>Website dashboard</span>
          </div>
        </div>
        <nav className="nav" aria-label="Dashboard">
          {NAV.map(n => {
            const Icon = n.icon
            const on = n.match(path)
            return (
              <a key={n.href} href={n.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}
                onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); go(n.href) }}>
                <Icon size={19} /> <span>{n.label}</span>
              </a>
            )
          })}
        </nav>
        <a className="side-site" href="/" target="_blank" rel="noopener"><IcExternal size={16} /> View website</a>
        <div className="side-foot">
          <span className="side-who">Signed in as<br /><b title={me.user.email}>{who}</b></span>
          <button className="side-out" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <button className="menu-btn" onClick={() => setMenu(m => !m)} aria-label="Menu" aria-expanded={menu}><span /><span /><span /></button>
      <div className="menu-scrim" onClick={() => setMenu(false)} />
      <main className="main">{body}</main>
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.kind}`}>{t.msg}</div>)}
      </div>
    </div>
  )
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    let r = await rest('POST', '/api/users/login', { email: email.trim(), password })
    if (!r.user && r.status !== 429) {
      // the login set in Vercel (ADMIN_EMAIL / ADMIN_PASSWORD) is made to work if it does not yet
      const fix = await post('ensure-admin', { email: email.trim(), password })
      if (fix.ok) r = await rest('POST', '/api/users/login', { email: email.trim(), password })
      else if (fix.reason === 'db') { setBusy(false); setError('The dashboard cannot reach its database. ' + (fix.detail || '')); return }
    }
    setBusy(false)
    if (r.user) onDone()
    else if (r.status === 429 || /locked/i.test(r.error || '')) setError('Too many attempts. Please wait a few minutes and try again.')
    else setError(r.status === 401 || /credential|incorrect/i.test(r.error || '') ? 'That email or password is not right. Please try again.' : (r.error || 'Could not sign in.'))
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-logo" src="/assets/img/logo.png" alt="Footscray Dental Studio" />
        <h1>Website dashboard</h1>
        <p className="muted">Sign in to edit your website.</p>
        <label className="lbl">Email
          <input className="in" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="lbl">Password
          <input className="in" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="note note-err">{error}</p>}
        <button className="btn btn-dark btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="hint login-hint">Forgotten your password? Ask Generate Your Audience to reset it for you.</p>
      </form>
    </div>
  )
}
