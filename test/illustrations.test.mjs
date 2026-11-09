import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { illustrationPath, illustrationSources } from '../src/illustrations.ts'
import { parseTsv } from '../src/data.ts'

test('reviewed illustration assets match current cards and never survive changed wording', async () => {
  const notes = parseTsv(await readFile(new URL('../cards.tsv', import.meta.url), 'utf8'))
  const illustrated = notes.filter(note => illustrationPath(note))
  assert.ok(illustrated.length > 0)
  const files = await readdir(new URL('../public/illustrations/', import.meta.url))
  assert.equal(files.length, Object.keys(illustrationSources).length)
  for (const [card_id, wording] of Object.entries(illustrationSources)) {
    const note = { card_id, ...wording }
    const path = illustrationPath(note)
    assert.ok(files.includes(path.split('/').at(-1)))
    const bytes = await readFile(new URL(`../public/${path}`, import.meta.url))
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
    assert.equal(illustrationPath({ ...note, ja: `${note.ja}（編集）` }), null)
    assert.equal(illustrationPath({ ...note, en: `${note.en} edited` }), null)
  }
  // Wording edits intentionally hide the old scene without blocking TSV updates.
  for (const note of notes) {
    const source = illustrationSources[note.card_id]
    if (source && (source.ja !== note.ja || source.en !== note.en)) assert.equal(illustrationPath(note), null)
  }
  assert.equal(illustrationPath({ card_id: 'constructor', ja: '', en: '' }), null)
  assert.equal(illustrationPath({ card_id: 'unknown', ja: '', en: '' }), null)
})
