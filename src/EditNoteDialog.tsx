import { useState, type FormEvent } from 'react'
import type { EditableNoteContent, Note } from './data'

const fields: { key: keyof EditableNoteContent; label: string; rows: number; required?: boolean }[] = [
  { key: 'ja', label: '日本語訳', rows: 2, required: true },
  { key: 'en', label: '英語表現', rows: 2, required: true },
  { key: 'ipa', label: '発音記号', rows: 2 },
  { key: 'usage', label: '使い所', rows: 3 },
  { key: 'nuance', label: '使い分け', rows: 3 },
  { key: 'example_en', label: '英語例文', rows: 3 },
  { key: 'example_ipa', label: '例文の発音記号', rows: 2 }
]

export default function EditNoteDialog({ note, hasEdits, busy, onClose, onSave, onReset }: {
  note: Note
  hasEdits: boolean
  busy: boolean
  onClose: () => void
  onSave: (content: EditableNoteContent) => void
  onReset: () => void
}) {
  const [draft, setDraft] = useState<EditableNoteContent>(() => ({
    ja: note.ja, en: note.en, ipa: note.ipa, usage: note.usage,
    nuance: note.nuance, example_en: note.example_en, example_ipa: note.example_ipa
  }))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onSave(draft)
  }

  return <div className="modal-backdrop" onClick={() => { if (!busy) onClose() }}>
    <div className="modal edit-modal" role="dialog" aria-modal="true" aria-label="カードの文言を編集" onClick={event => event.stopPropagation()}>
      <button className="modal-close" type="button" aria-label="編集を閉じる" disabled={busy} onClick={onClose}>×</button>
      <span className="eyebrow">EDIT CARD · {note.card_id}</span>
      <h2>カードの文言を編集</h2>
      <p className="editor-help">この端末に保存します。学習履歴と復習予定は変わりません。</p>
      <form onSubmit={submit}>
        {fields.map(field => <label className="editor-field" key={field.key}>
          <span>{field.label}{field.required && <small>必須</small>}</span>
          <textarea rows={field.rows} required={field.required} value={draft[field.key]} disabled={busy} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} />
        </label>)}
        <button className="primary editor-save" type="submit" disabled={busy}>変更を保存</button>
      </form>
      {hasEdits && <button className="secondary editor-reset" type="button" disabled={busy} onClick={onReset}>元の文言に戻す</button>}
      <button className="text-button editor-cancel" type="button" disabled={busy} onClick={onClose}>キャンセル</button>
    </div>
  </div>
}
