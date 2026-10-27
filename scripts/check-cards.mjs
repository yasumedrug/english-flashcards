import { readFile } from 'node:fs/promises'
import { parseTsv } from '../src/data.ts'
import { isSafeRecallHint, recallHints } from '../src/recallHints.ts'

const source = await readFile(new URL('../cards.tsv', import.meta.url), 'utf8')
const published = await readFile(new URL('../public/data/cards.tsv', import.meta.url), 'utf8')
if (source !== published) throw new Error('cards.tsv と public/data/cards.tsv の内容が一致していません。')

// Use the same parser/validation as the app's TSV update, not a separate rule.
const notes = parseTsv(source)
const active = notes.filter(note => note.active !== '0')
for (const note of active) {
  const hints = recallHints(note)
  if (!hints.length || hints.some(hint => !isSafeRecallHint(hint.text))) {
    throw new Error(`${note.card_id}: 回答前の日本語ヒントを修正してください。`)
  }
}
console.log(`${notes.length}件の形式・IDと、${active.length}件の日本語ヒントを検査しました。`)
