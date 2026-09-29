import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createEmptyCard, Rating } from 'ts-fsrs'

const { cardKey, createBackup, db, getTodayPlan, rateCard, reconcileReviewCards, restoreBackup, scheduler } = await import('../src/data.ts')

const note = (id, ja) => ({
  card_id: id, source_no: id.slice(-1), ja, en: `word ${id}`, ipa: '',
  usage: '', nuance: '', example_en: '', example_ipa: '',
  tag: '', scene: '', priority: 'normal', active: '1', source_version: '1'
})

test('a learned card stays hidden until its saved due date and its FSRS state survives repair', async () => {
  const firstDay = new Date('2026-09-29T09:00:00+09:00')
  const secondReview = new Date(+firstDay + 10 * 60_000)
  const key = cardKey('expr_1', 'ja_to_en')
  await db.notes.bulkPut([note('expr_1', '同じ日本語'), note('expr_2', '別の表現')])

  const first = scheduler.next(createEmptyCard(firstDay), firstDay, Rating.Good).card
  const second = scheduler.next(first, secondReview, Rating.Good).card
  assert.equal(second.scheduled_days, 2)
  await db.reviewCards.put({ cardId: key, noteId: 'expr_1', direction: 'ja_to_en', fsrsCard: second })
  await db.reviewLogs.bulkAdd([
    { cardId: key, noteId: 'expr_1', direction: 'ja_to_en', reviewedAt: firstDay.toISOString(), rating: Rating.Good, responseTimeMs: 1000, previousDue: null, nextDue: first.due.toISOString() },
    { cardId: key, noteId: 'expr_1', direction: 'ja_to_en', reviewedAt: secondReview.toISOString(), rating: Rating.Good, responseTimeMs: 1000, previousDue: first.due.toISOString(), nextDue: second.due.toISOString() }
  ])

  const nextDay = new Date('2026-09-30T12:00:00+09:00')
  let plan = await getTodayPlan(nextDay)
  assert.equal(plan.candidate?.note.card_id, 'expr_2')
  assert.equal(plan.due, 0)

  // A missing or stale reviewCards row must not turn saved reviews into a new card.
  await db.reviewCards.delete(key)
  plan = await getTodayPlan(nextDay)
  assert.equal(plan.candidate?.note.card_id, 'expr_2')
  assert.equal(plan.due, 0)
  await reconcileReviewCards()
  const repaired = await db.reviewCards.get(key)
  assert.equal(repaired?.fsrsCard.reps, 2)
  assert.equal(+new Date(repaired.fsrsCard.due), +second.due)

  plan = await getTodayPlan(new Date(+second.due + 1000))
  assert.equal(plan.candidate?.note.card_id, 'expr_1')
  assert.equal(plan.candidate?.isNew, false)
  const third = scheduler.next(repaired.fsrsCard, new Date(+second.due + 1000), Rating.Good).card
  assert.ok(third.scheduled_days > second.scheduled_days)
})

test('shuffle avoids the current card; suspension survives backup and can be undone', async () => {
  const today = new Date('2026-09-30T12:00:00+09:00')
  await db.notes.bulkPut([note('expr_3', '三番目'), note('expr_4', '四番目')])
  await db.settings.put({ id: 'main', newLimit: 8, totalLimit: 40, mode: 'ja_to_en', jaRatio: 70, shuffleSeed: 12345 })
  const first = await getTodayPlan(today)
  const firstId = first.candidate?.note.card_id
  assert.ok(firstId)
  const shuffled = await getTodayPlan(today, cardKey(firstId, 'ja_to_en'))
  assert.notEqual(shuffled.candidate?.note.card_id, firstId)

  await db.suspendedNotes.put({ noteId: firstId, suspendedAt: today.toISOString() })
  const afterSuspend = await getTodayPlan(today)
  assert.notEqual(afterSuspend.candidate?.note.card_id, firstId)
  const backup = JSON.parse(JSON.stringify(await createBackup()))
  await restoreBackup(backup)
  assert.ok(await db.suspendedNotes.get(firstId))
  await db.suspendedNotes.delete(firstId)
  assert.equal(await db.suspendedNotes.get(firstId), undefined)
})

test('rating writes both the FSRS state and append-only logs, and later ratings lengthen the interval', async () => {
  const current = note('expr_5', '五番目')
  await db.notes.put(current)
  const candidate = { note: current, direction: 'ja_to_en', isNew: true }
  await rateCard(candidate, Rating.Good, 500)
  const first = await db.reviewCards.get(cardKey(current.card_id, 'ja_to_en'))
  assert.equal(first?.fsrsCard.reps, 1)
  assert.equal(await db.reviewLogs.where('cardId').equals(first.cardId).count(), 1)

  const secondDue = await rateCard(candidate, Rating.Good, 600)
  const second = await db.reviewCards.get(first.cardId)
  assert.equal(second?.fsrsCard.reps, 2)
  assert.equal(await db.reviewLogs.where('cardId').equals(first.cardId).count(), 2)
  assert.ok(secondDue > first.fsrsCard.due)
  assert.ok(second.fsrsCard.scheduled_days >= 2)
  const tomorrowAt = new Date(Date.now() + 24 * 60 * 60_000)
  assert.ok(secondDue > tomorrowAt)
  const tomorrow = await getTodayPlan(tomorrowAt)
  assert.notEqual(tomorrow.candidate?.note.card_id, current.card_id)
})
