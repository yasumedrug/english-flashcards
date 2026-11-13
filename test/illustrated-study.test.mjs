import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createEmptyCard, Rating } from 'ts-fsrs'
import { illustrationSources } from '../src/illustrations.ts'
import { db, parseTsv, cardKey, getTodayPlan, createBackup, restoreBackup, saveNoteEdits, resetNoteEdits, scheduler } from '../src/data.ts'

test('only illustrated new and due cards are offered; waiting history survives backup and resumes its saved schedule', async () => {
  const all = parseTsv(await readFile(new URL('../cards.tsv', import.meta.url), 'utf8'))
  const ready = all.find(n => illustrationSources[n.card_id])
  const waiting = all.find(n => !illustrationSources[n.card_id])
  const waitingNew = all.find(n => !illustrationSources[n.card_id] && n.card_id !== waiting.card_id)
  await db.notes.bulkPut([ready, waiting, waitingNew])
  const reviewedAt = new Date('2026-11-01T10:00:00+09:00')
  for (const direction of ['ja_to_en', 'en_to_ja']) {
    const card = scheduler.next(createEmptyCard(reviewedAt), reviewedAt, Rating.Good).card
    await db.reviewCards.put({ cardId: cardKey(waiting.card_id, direction), noteId: waiting.card_id, direction, fsrsCard: card })
    await db.reviewLogs.add({ cardId: cardKey(waiting.card_id, direction), noteId: waiting.card_id, direction, reviewedAt: reviewedAt.toISOString(), rating: Rating.Good, responseTimeMs: 1000, previousDue: null, nextDue: card.due.toISOString() })
  }
  const now = new Date('2026-11-12T10:00:00+09:00')
  for (const mode of ['ja_to_en', 'en_to_ja', 'mixed']) {
    await db.settings.put({ id: 'main', mode, newLimit: 8, totalLimit: 40, jaRatio: 70, shuffleSeed: 123 })
    const before = await createBackup()
    const plan = await getTodayPlan(now)
    assert.equal(plan.candidate.note.card_id, ready.card_id)
    assert.equal(plan.due, 0)
    assert.equal(plan.newAvailable, 1)
    assert.equal(plan.candidate.direction, 'ja_to_en')
    assert.equal((await db.settings.get('main')).mode, mode)
    assert.deepEqual((await createBackup()).reviewCards, before.reviewCards)
    assert.deepEqual((await createBackup()).reviewLogs, before.reviewLogs)
  }
  // Simulate a future illustration release. The original review is still due,
  // and is offered as a review rather than being reset to an unseen card.
  const backup = JSON.parse(JSON.stringify(await createBackup()))
  await restoreBackup(backup)
  assert.equal(await db.notes.count(), 3)
  illustrationSources[waiting.card_id] = { ja: waiting.ja, en: waiting.en }
  try {
    const plan = await getTodayPlan(now)
    assert.equal(plan.candidate.note.card_id, waiting.card_id)
    assert.equal(plan.candidate.isNew, false)
    const saved = backup.reviewCards.find(c => c.cardId === cardKey(waiting.card_id, plan.candidate.direction))
    assert.equal(+plan.candidate.review.fsrsCard.due, +new Date(saved.fsrsCard.due))
    assert.equal(plan.candidate.review.fsrsCard.reps, saved.fsrsCard.reps)
    await saveNoteEdits(waiting.card_id, { ...waiting, ja: waiting.ja + '（自分の編集）' })
    assert.equal((await getTodayPlan(now)).candidate.note.card_id, ready.card_id)
    await resetNoteEdits(waiting.card_id)
    assert.equal((await getTodayPlan(now)).candidate.isNew, false)
    await db.suspendedNotes.put({ noteId: waiting.card_id, suspendedAt: now.toISOString() })
    assert.equal((await getTodayPlan(now)).candidate.note.card_id, ready.card_id)
    const after = await createBackup()
    assert.deepEqual(JSON.parse(JSON.stringify(after.reviewCards)), backup.reviewCards)
    assert.deepEqual(after.reviewLogs, backup.reviewLogs)
  } finally { delete illustrationSources[waiting.card_id] }
})
