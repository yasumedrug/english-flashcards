import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import Dexie from 'dexie'
import { createEmptyCard } from 'ts-fsrs'

test('upgrading an existing database keeps its cards and FSRS history', async () => {
  const legacy = new Dexie('english-flashcards')
  legacy.version(2).stores({
    notes: 'card_id, scene, tag, active',
    reviewCards: 'cardId, noteId, direction',
    reviewLogs: '++id, cardId, noteId, reviewedAt',
    settings: 'id',
    importMetadata: 'id',
    suspendedNotes: 'noteId'
  })
  await legacy.open()
  const note = {
    card_id: 'expr_legacy', source_no: '1', ja: '元の訳', en: 'original', ipa: '',
    usage: '', nuance: '', example_en: '', example_ipa: '', tag: 'expression',
    scene: '', priority: 'normal', active: '1', source_version: '1'
  }
  const fsrsCard = createEmptyCard(new Date('2026-10-01T00:00:00Z'))
  await legacy.table('notes').put(note)
  await legacy.table('reviewCards').put({ cardId: 'expr_legacy:ja_to_en', noteId: note.card_id, direction: 'ja_to_en', fsrsCard })
  await legacy.table('reviewLogs').add({ cardId: 'expr_legacy:ja_to_en', noteId: note.card_id, direction: 'ja_to_en', reviewedAt: '2026-10-01T00:00:00Z', rating: 3, responseTimeMs: 1000, previousDue: null, nextDue: fsrsCard.due.toISOString() })
  legacy.close()

  const { db, getEffectiveNotes, saveNoteEdits } = await import('../src/data.ts')
  await db.open()
  assert.equal((await db.notes.get(note.card_id)).ja, '元の訳')
  assert.equal(await db.reviewLogs.count(), 1)
  assert.deepEqual((await db.reviewCards.get('expr_legacy:ja_to_en')).fsrsCard, fsrsCard)

  await saveNoteEdits(note.card_id, { ja: '修正した訳', en: note.en, ipa: '', usage: '', nuance: '', example_en: '', example_ipa: '' })
  assert.equal((await getEffectiveNotes())[0].ja, '修正した訳')
  assert.equal(await db.reviewLogs.count(), 1)
  assert.deepEqual((await db.reviewCards.get('expr_legacy:ja_to_en')).fsrsCard, fsrsCard)
  db.close()
})
