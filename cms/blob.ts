/**
 * Reads the Vercel Blob token defensively.
 *
 * Payload's Blob adapter throws, and takes the whole dashboard down with it, when
 * BLOB_READ_WRITE_TOKEN is not exactly vercel_blob_rw_<store>_<random>. A value pasted
 * with its quotes or with the "BLOB_READ_WRITE_TOKEN=" name in front is cleaned up here;
 * anything still unusable switches photo uploads off with a clear message instead of an
 * application error. The message never prints the secret part of the token.
 */
const FORMAT = /^vercel_blob_rw_[a-z\d]+_[a-z\d]+$/i

export function blobToken(): { token: string; ok: boolean; note: string } {
  const raw = process.env.BLOB_READ_WRITE_TOKEN || ''
  const token = raw.trim()
    .replace(/^export\s+/, '')
    .replace(/^BLOB_READ_WRITE_TOKEN\s*=\s*/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
  if (!token) return { token: '', ok: false, note: 'BLOB_READ_WRITE_TOKEN is not set, so photo uploads are off.' }
  if (FORMAT.test(token)) return { token, ok: true, note: '' }
  const start = token.startsWith('vercel_blob_rw_') ? 'vercel_blob_rw_...' : `"${token.slice(0, 6)}..."`
  return {
    token: '', ok: false,
    note: `BLOB_READ_WRITE_TOKEN does not look like a Blob read-write token (starts ${start}, ${token.length} characters, ${token.split('_').length} parts). Photo uploads are off until it is replaced with the vercel_blob_rw_ value from Storage > the Blob store > .env.local.`,
  }
}
