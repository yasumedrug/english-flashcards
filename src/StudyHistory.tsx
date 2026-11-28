import { useMemo, useState } from 'react'
import { dateKey, type Note, type ReviewLog } from './data'

const dayLabel = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
type HistoryEntry = { lastReview: number; count: number }

export default function StudyHistory({ logs, notes }: { logs: ReviewLog[]; notes: Note[] }) {
  const [selectedDay, setSelectedDay] = useState('')
  const today = dateKey(new Date())
  const byDay = useMemo(() => {
    const days = new Map<string, Map<string, HistoryEntry>>()
    for (const log of logs) {
      const reviewedAt = new Date(log.reviewedAt)
      if (!Number.isFinite(+reviewedAt)) continue
      const day = dateKey(reviewedAt)
      const entries = days.get(day) ?? new Map<string, HistoryEntry>()
      const noteId = log.noteId || log.cardId
      const previous = entries.get(noteId)
      entries.set(noteId, {
        lastReview: Math.max(previous?.lastReview ?? +reviewedAt, +reviewedAt),
        count: (previous?.count ?? 0) + 1
      })
      days.set(day, entries)
    }
    return days
  }, [logs])
  const notesById = useMemo(() => new Map(notes.map(note => [note.card_id, note])), [notes])
  const days = [today, ...Array.from(byDay.keys()).filter(day => day !== today).sort().reverse()]
  const day = byDay.has(selectedDay) ? selectedDay : today
  const entries = Array.from(byDay.get(day) ?? []).sort(([, a], [, b]) => b.lastReview - a.lastReview)

  return (
    <section className="panel study-history" aria-labelledby="study-history-heading">
      <h2 id="study-history-heading">日付別の学習履歴</h2>
      <label className="study-history-date">
        <span>学習日</span>
        <select value={day} onChange={event => setSelectedDay(event.target.value === today ? '' : event.target.value)}>
          {days.map(key => (
            <option key={key} value={key}>
              {key === today ? '今日' : dayLabel.format(new Date(`${key}T12:00:00`))}
              {`（${byDay.get(key)?.size ?? 0}語）`}
            </option>
          ))}
        </select>
      </label>
      {entries.length ? (
        <ul className="study-history-list">
          {entries.map(([noteId, entry]) => {
            const note = notesById.get(noteId)
            return (
              <li key={noteId}>
                <div>
                  {note ? <><strong lang="en">{note.en}</strong><span>{note.ja}</span></> : <><strong>{noteId}</strong><span>カード情報なし</span></>}
                </div>
                <small>{entry.count}回</small>
              </li>
            )
          })}
        </ul>
      ) : <p className="study-history-empty">この日の学習記録はまだありません。</p>}
    </section>
  )
}
