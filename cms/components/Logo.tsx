import React from 'react'

/* The practice's own logo files, served from the site's /assets folder. */
export const Logo = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/assets/img/logo.png" alt="Footscray Dental Studio" width={300} height={78} style={{ width: 300, height: 'auto', maxWidth: '100%' }} />
)
export const Icon = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/assets/img/admin-mark.png" alt="" width={28} height={28} style={{ width: 28, height: 28 }} />
)
