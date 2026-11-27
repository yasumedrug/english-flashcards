import 'fake-indexeddb/auto'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createEmptyCard } from 'ts-fsrs'
import { cardKey, db, getTodayPlan, parseTsv } from '../src/data.ts'
import { illustrationSources } from '../src/illustrations.ts'
import { scenarioSources } from '../src/scenarios.ts'

test('due reviews precede new cards and follow learning priority across due dates', async () => {
  const notes = parseTsv(await readFile(new URL('../cards.tsv', import.meta.url), 'utf8'))
  const pick = id => notes.find(note => note.card_id === id)
  const ids = ['expr_0093', 'expr_0319', 'expr_0001', 'expr_1413', 'expr_0132']
  const [first, second, p2, p3, p4] = ids.map(pick)
  const pending = { ...p2, card_id: 'test_new_unranked', source_no: '0' }
  scenarioSources[pending.card_id] = scenarioSources[p2.card_id]
  illustrationSources[pending.card_id] = illustrationSources[p2.card_id]

  const now = new Date('2026-11-27T12:00:00+09:00')
  await db.notes.bulkPut([p4, p3, pending, p2, second, first])
  const offered = async avoid => (await getTodayPlan(now, avoid)).candidate
  try {
    const schedule = async (note, due) => db.reviewCards.put({
      cardId: cardKey(note.card_id, 'ja_to_en'), noteId: note.card_id, direction: 'ja_to_en',
      fsrsCard: createEmptyCard(due)
    })
    const yesterday = new Date(+now - 24 * 60 * 60 * 1000)
    await schedule(p4, yesterday)
    await schedule(first, new Date(+now + 1000))
    assert.equal((await offered()).isNew, false)
    assert.equal((await offered()).note.card_id, p4.card_id)
    await schedule(first, now)
    assert.equal((await offered()).note.card_id, first.card_id)
    await schedule(second, new Date(+now - 1000))
    assert.equal((await offered()).note.card_id, second.card_id)
    await db.settings.put({ id: 'main', mode: 'ja_to_en', newLimit: 8, totalLimit: 40, jaRatio: 70, shuffleSeed: 123 })
    assert.equal((await offered(cardKey(second.card_id, 'ja_to_en'))).note.card_id, first.card_id)
    await db.reviewCards.delete(cardKey(second.card_id, 'ja_to_en'))
    assert.equal((await offered(cardKey(first.card_id, 'ja_to_en'))).note.card_id, first.card_id)
    await db.reviewCards.clear()
    await db.settings.delete('main')

    assert.equal((await offered()).note.card_id, first.card_id)
    await db.settings.put({ id: 'main', mode: 'ja_to_en', newLimit: 8, totalLimit: 40, jaRatio: 70, shuffleSeed: 123 })
    assert.equal((await offered(cardKey(first.card_id, 'ja_to_en'))).note.card_id, second.card_id)
    await db.notes.delete(second.card_id)
    assert.equal((await offered(cardKey(first.card_id, 'ja_to_en'))).note.card_id, first.card_id)
    await db.notes.delete(first.card_id)
    assert.equal((await offered()).note.card_id, p2.card_id)
    await db.notes.delete(p2.card_id)
    assert.equal((await offered()).note.card_id, pending.card_id)
    await db.notes.delete(pending.card_id)
    assert.equal((await offered()).note.card_id, p3.card_id)
  } finally {
    delete scenarioSources[pending.card_id]
    delete illustrationSources[pending.card_id]
  }
})
