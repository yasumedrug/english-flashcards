import { readFile, access } from 'node:fs/promises'
import { parseTsv } from '../src/data.ts'
import { illustrationPath, illustrationSources } from '../src/illustrations.ts'

const notes = parseTsv(await readFile(new URL('../cards.tsv', import.meta.url), 'utf8')).filter(note => note.active !== '0')
const ready = []
const pending = []
for (const note of notes) {
  const path = illustrationPath(note)
  if (path) {
    await access(new URL(`../public/${path}`, import.meta.url))
    ready.push(note.card_id)
  } else pending.push({ card_id: note.card_id, ja: note.ja, en: note.en, usage: note.usage, needsReview: Object.hasOwn(illustrationSources, note.card_id) })
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ total: notes.length, ready, pending }, null, 2))
else console.log(`全${notes.length}件 / イラスト対応${ready.length}件 / 未対応・再確認${pending.length}件`)
