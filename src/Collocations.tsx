import type { Note } from './data'
import sources from './collocationSources.json'

type CollocationNote = Pick<Note, 'card_id' | 'ja' | 'en' | 'usage'>
type CollocationSource = Omit<CollocationNote, 'card_id'> & {
  items: { en: string; ja: string }[]
}

const entries: Record<string, CollocationSource | undefined> = sources

export default function Collocations({ note }: { note: CollocationNote }) {
  const entry = entries[note.card_id]
  if (!entry || entry.ja !== note.ja || entry.en !== note.en || entry.usage !== note.usage) return null

  return (
    <section className="detail" aria-label="よく使う組み合わせ">
      <b>よく使う組み合わせ</b>
      <ul className="collocations">
        {entry.items.map(item => (
          <li key={item.en}>
            <span lang="en">{item.en}</span>
            <small>{item.ja}</small>
          </li>
        ))}
      </ul>
    </section>
  )
}
