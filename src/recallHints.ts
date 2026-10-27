import type { Note } from './data'

type Hint = { label: string; text: string }

function revealsAnswer(text: string, answer: string): boolean {
  const target = answer.trim().toLowerCase()
  const source = text.toLowerCase()
  if (!target) return false
  let index = source.indexOf(target)
  while (index !== -1) {
    const before = source[index - 1] ?? ''
    const after = source[index + target.length] ?? ''
    if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) return true
    index = source.indexOf(target, index + 1)
  }
  return false
}

export function recallHints(note: Pick<Note, 'en' | 'usage' | 'nuance'>): Hint[] {
  return ([
    { label: '使う場面', text: note.usage.trim() },
    { label: 'ニュアンス', text: note.nuance.trim() }
  ] as Hint[]).filter(hint => hint.text && !revealsAnswer(hint.text, note.en))
}
