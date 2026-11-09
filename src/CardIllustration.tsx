import { useState } from 'react'
import { illustrationPath } from './illustrations'

export default function CardIllustration({ note }: { note: { card_id: string; ja: string; en: string } }) {
  const path = illustrationPath(note)
  const [failedPath, setFailedPath] = useState<string | null>(null)
  if (!path || failedPath === path) return null
  return <img className="card-illustration" src={`${import.meta.env.BASE_URL}${path}`}
    alt="" width="640" height="640" decoding="async"
    onError={() => setFailedPath(path)} />
}
