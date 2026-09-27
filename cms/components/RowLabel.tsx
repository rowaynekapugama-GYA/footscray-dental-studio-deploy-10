'use client'
import { useRowLabel } from '@payloadcms/ui'

const strip = (s: string) => String(s || '').replace(/\*\*|\[|\]\([^)]*\)/g, '')

export const FaqRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ question?: string }>()
  return <span>{data?.question ? strip(data.question) : `Question ${(rowNumber ?? 0) + 1}`}</span>
}

export const SectionRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ heading?: string; key?: string }>()
  return <span>{data?.heading ? strip(data.heading) : data?.key || `Section ${(rowNumber ?? 0) + 1}`}</span>
}

export const TitleRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ title?: string; label?: string; days?: string; text?: string }>()
  const t = data?.title || data?.label || data?.days || data?.text
  return <span>{t ? strip(t).slice(0, 60) : `Item ${(rowNumber ?? 0) + 1}`}</span>
}
