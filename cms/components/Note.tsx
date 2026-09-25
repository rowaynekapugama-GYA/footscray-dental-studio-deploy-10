'use client'
import React from 'react'

const box: React.CSSProperties = { border: '1px solid var(--theme-elevation-150)', borderRadius: 6, padding: '.8rem 1rem', margin: '.5rem 0 1rem', background: 'var(--theme-elevation-50)', fontSize: '.9rem' }

export const OffersNote = () => (
  <div style={box}>The offer cards themselves are managed under <a href="/admin/collections/offers">Special offers</a>. Add, remove or reorder them there and they update here and on the offers page.</div>
)
export const TeamNote = () => (
  <div style={box}>The practitioners on this page are managed under <a href="/admin/collections/team">Team</a>: names, roles, photos and bios.</div>
)
