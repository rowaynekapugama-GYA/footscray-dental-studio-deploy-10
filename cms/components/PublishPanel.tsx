'use client'
import React, { useEffect, useState } from 'react'
import { Button, toast } from '@payloadcms/ui'

type Status = { lastChangedAt?: string; lastPublishedAt?: string; lastImportedAt?: string; lastPublishNote?: string; pages?: number; hookConfigured?: boolean; role?: string }

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }) : 'never')

export const PublishPanel: React.FC = () => {
  const [s, setS] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const load = () => fetch('/api/site-status', { credentials: 'include' }).then(r => r.json()).then(setS).catch(() => setS({}))
  useEffect(() => { load() }, [])

  const call = async (label: string, url: string) => {
    setBusy(label)
    try {
      const r = await fetch(url, { method: 'POST', credentials: 'include' })
      const j = await r.json()
      if (j.ok) toast.success(label === 'publish' ? 'Publishing started. The site updates in about two minutes.' : `Imported: ${JSON.stringify(j.counts)}`)
      else toast.error(j.error || 'Something went wrong.')
    } catch (e: any) { toast.error(e.message) }
    setBusy(null); load()
  }

  const waiting = s?.lastChangedAt && (!s.lastPublishedAt || s.lastChangedAt > s.lastPublishedAt)
  return (
    <div className="publish-panel">
      <h2>Footscray Dental Studio website</h2>
      <p>{waiting ? 'You have changes that are not on the live site yet.' : 'The live site is up to date with your changes.'}</p>
      <div className="row">
        <Button onClick={() => call('publish', '/api/publish-site')} disabled={busy !== null || !s} buttonStyle="primary">
          {busy === 'publish' ? 'Starting…' : 'Publish website'}
        </Button>
        {s?.role === 'admin' && (
          <>
            <Button onClick={() => call('import', '/api/import-content')} disabled={busy !== null} buttonStyle="secondary">Import from files</Button>
            <Button onClick={() => { if (confirm('Reset every page to the files in the repository? Your edits in the dashboard will be lost.')) call('import', '/api/import-content?overwrite=1') }} disabled={busy !== null} buttonStyle="secondary">Reset to files</Button>
          </>
        )}
        <span className="status">Last change {fmt(s?.lastChangedAt)} · last published {fmt(s?.lastPublishedAt)}{s && !s.hookConfigured ? ' · publishing not connected yet' : ''}</span>
      </div>
      {s?.lastPublishNote && <p className="status" style={{ marginTop: '.6rem' }}>{s.lastPublishNote}</p>}
    </div>
  )
}
