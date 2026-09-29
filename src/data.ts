import Dexie, { type EntityTable } from 'dexie'
import { createEmptyCard, fsrs, type Card, type Rating } from 'ts-fsrs'

export type Direction = 'ja_to_en' | 'en_to_ja'
export type Mode = Direction | 'mixed'
export type ReviewRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy
export type Note = {
  card_id: string; source_no: string; ja: string; en: string; ipa: string;
  usage: string; nuance: string; example_en: string; example_ipa: string;
  tag: string; scene: string; priority: string; active: string; source_version: string
}
export type ReviewCard = { cardId: string; noteId: string; direction: Direction; fsrsCard: Card }
export type ReviewLog = {
  id?: number; cardId: string; noteId: string; direction: Direction;
  reviewedAt: string; rating: ReviewRating; responseTimeMs: number;
  previousDue: string | null; nextDue: string
}
export type Settings = { id: 'main'; newLimit: number; totalLimit: number; mode: Mode; jaRatio: number; shuffleSeed?: number }
export type ImportMetadata = { id: 'cards'; importedAt: string; count: number; sourceVersion: string }
export type SuspendedNote = { noteId: string; suspendedAt: string }

class CardsDB extends Dexie {
  notes!: EntityTable<Note, 'card_id'>
  reviewCards!: EntityTable<ReviewCard, 'cardId'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  settings!: EntityTable<Settings, 'id'>
  importMetadata!: EntityTable<ImportMetadata, 'id'>
  suspendedNotes!: EntityTable<SuspendedNote, 'noteId'>
  constructor() {
    super('english-flashcards')
    this.version(1).stores({
      notes: 'card_id, scene, tag, active',
      reviewCards: 'cardId, noteId, direction',
      reviewLogs: '++id, cardId, noteId, reviewedAt',
      settings: 'id',
      importMetadata: 'id'
    })
    this.version(2).stores({
      notes: 'card_id, scene, tag, active',
      reviewCards: 'cardId, noteId, direction',
      reviewLogs: '++id, cardId, noteId, reviewedAt',
      settings: 'id',
      importMetadata: 'id',
      suspendedNotes: 'noteId'
    })
  }
}
export const db = new CardsDB()
export const scheduler = fsrs()
export const defaultSettings: Settings = { id: 'main', newLimit: 8, totalLimit: 40, mode: 'ja_to_en', jaRatio: 70 }
export const cardKey = (noteId: string, direction: Direction) => `${noteId}:${direction}`
export const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
const validDate = (value: Date | string | undefined | null): Date | null => {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(+date) ? date : null
}
const orderHash = (seed: number, id: string): number => {
  let hash = seed | 0
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619)
  return hash >>> 0
}

function replayLogs(logs: ReviewLog[]): Card | null {
  const ordered = [...logs].sort((a, b) => +new Date(a.reviewedAt) - +new Date(b.reviewedAt) || (a.id ?? 0) - (b.id ?? 0))
  if (!ordered.length) return null
  let card = createEmptyCard<Card>(new Date(ordered[0].reviewedAt))
  for (const log of ordered) card = scheduler.next(card, new Date(log.reviewedAt), log.rating).card
  const loggedDue = validDate(ordered.at(-1)?.nextDue)
  return loggedDue ? { ...card, due: loggedDue } : card
}

function reviewNeedsRepair(existing: ReviewCard | undefined, history: ReviewLog[]): boolean {
  if (!existing) return true
  const latest = history.at(-1)!
  const savedDue = validDate(existing.fsrsCard?.due)
  const loggedDue = validDate(latest.nextDue)
  const lastReview = validDate(existing.fsrsCard?.last_review)
  return existing.fsrsCard.reps < history.length || !savedDue || (loggedDue !== null && +savedDue !== +loggedDue) || !lastReview || +lastReview < +new Date(latest.reviewedAt)
}

export async function reconcileReviewCards(): Promise<void> {
  const [cards, logs] = await Promise.all([db.reviewCards.toArray(), db.reviewLogs.toArray()])
  const byCard = new Map(cards.map(card => [card.cardId, card]))
  const groups = new Map<string, ReviewLog[]>()
  for (const log of logs) groups.set(log.cardId, [...(groups.get(log.cardId) ?? []), log])
  const repairs: ReviewCard[] = []
  for (const [cardId, history] of groups) {
    const latest = history.at(-1)!
    const existing = byCard.get(cardId)
    if (!reviewNeedsRepair(existing, history)) continue
    const fsrsCard = replayLogs(history)
    if (fsrsCard) repairs.push({ cardId, noteId: latest.noteId, direction: latest.direction, fsrsCard })
  }
  if (repairs.length) await db.reviewCards.bulkPut(repairs)
}

export function parseTsv(text: string): Note[] {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  const columns = lines.shift()?.split('\t') ?? []
  const required: (keyof Note)[] = ['card_id', 'source_no', 'ja', 'en', 'ipa', 'usage', 'nuance', 'example_en', 'example_ipa', 'tag', 'scene', 'priority', 'active', 'source_version']
  if (required.some(key => !columns.includes(key))) throw new Error('TSVの列が不足しています')
  const ids = new Set<string>()
  return lines.filter(Boolean).map((line, i) => {
    const values = line.split('\t')
    if (values.length !== columns.length) throw new Error(`TSV ${i + 2}行目の列数が違います`)
    const note = Object.fromEntries(required.map(key => [key, values[columns.indexOf(key)].trim()])) as Note
    if (!note.card_id || !note.ja || !note.en || ids.has(note.card_id)) throw new Error(`TSV ${i + 2}行目のIDまたは内容が不正です`)
    ids.add(note.card_id)
    return note
  })
}

export async function importTsv(): Promise<number> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/cards.tsv`, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`TSVを取得できません (${response.status})`)
  const notes = parseTsv(await response.text())
  await db.transaction('rw', db.notes, db.importMetadata, async () => {
    await db.notes.bulkPut(notes)
    await db.importMetadata.put({ id: 'cards', importedAt: new Date().toISOString(), count: notes.length, sourceVersion: notes[0]?.source_version ?? '' })
  })
  return notes.length
}

export async function loadSettings(): Promise<Settings> {
  return (await db.settings.get('main')) ?? defaultSettings
}

export type Candidate = { note: Note; direction: Direction; review?: ReviewCard; isNew: boolean }
export type TodayPlan = { candidate: Candidate | null; due: number; newAvailable: number; studied: number; newStudied: number; totalLimit: number; newLimit: number; complete: boolean }

export async function getTodayPlan(now = new Date(), avoidCardId?: string): Promise<TodayPlan> {
  const [settings, notes, cards, logs, suspended] = await Promise.all([loadSettings(), db.notes.toArray(), db.reviewCards.toArray(), db.reviewLogs.toArray(), db.suspendedNotes.toArray()])
  const day = dateKey(now)
  const todayLogs = logs.filter(log => dateKey(new Date(log.reviewedAt)) === day)
  const studied = todayLogs.length
  const newStudied = todayLogs.filter(log => log.previousDue === null).length
  const suspendedIds = new Set(suspended.map(item => item.noteId))
  const active = notes.filter(note => note.active !== '0' && !suspendedIds.has(note.card_id))
  const byId = new Map(active.map(note => [note.card_id, note]))
  const directions: Direction[] = settings.mode === 'mixed' ? ['ja_to_en', 'en_to_ja'] : [settings.mode]
  const latestLog = new Map<string, ReviewLog>()
  for (const log of logs) latestLog.set(log.cardId, log)
  const cardById = new Map(cards.map(card => [card.cardId, card]))
  for (const [cardId, latest] of latestLog) {
    if (!cardById.has(cardId)) {
      const history = logs.filter(log => log.cardId === cardId)
      const fsrsCard = replayLogs(history)
      if (fsrsCard) cardById.set(cardId, { cardId, noteId: latest.noteId, direction: latest.direction, fsrsCard })
    }
  }
  const eligible = [...cardById.values()].filter(card => directions.includes(card.direction) && byId.has(card.noteId))
  const dueAt = (card: ReviewCard) => validDate(latestLog.get(card.cardId)?.nextDue) ?? validDate(card.fsrsCard.due) ?? new Date(0)
  const dueCards = eligible.filter(card => dueAt(card) <= now).sort((a, b) => settings.shuffleSeed ? orderHash(settings.shuffleSeed, a.cardId) - orderHash(settings.shuffleSeed, b.cardId) : +dueAt(a) - +dueAt(b))
  const cardIds = new Set([...cardById.keys(), ...latestLog.keys()])
  const unseen: Candidate[] = active.flatMap(note => directions.filter(direction => !cardIds.has(cardKey(note.card_id, direction))).map(direction => ({ note, direction, isNew: true })))
  unseen.sort((a, b) => (b.note.priority === 'high' ? 1 : 0) - (a.note.priority === 'high' ? 1 : 0) || (settings.shuffleSeed ? orderHash(settings.shuffleSeed, cardKey(a.note.card_id, a.direction)) - orderHash(settings.shuffleSeed, cardKey(b.note.card_id, b.direction)) : Number(a.note.source_no) - Number(b.note.source_no)))
  const chooseDirection = <T extends ReviewCard | Candidate>(items: T[]): T | undefined => {
    const available = items.filter(item => !avoidCardId || ('cardId' in item ? item.cardId : cardKey(item.note.card_id, item.direction)) !== avoidCardId)
    const choices = available.length ? available : items
    if (settings.mode !== 'mixed') return choices[0]
    const jaToday = todayLogs.filter(log => log.direction === 'ja_to_en').length
    const desiredJa = (studied + 1) * settings.jaRatio / 100
    const target: Direction = jaToday < desiredJa ? 'ja_to_en' : 'en_to_ja'
    return choices.find(item => item.direction === target) ?? choices[0]
  }
  const due = dueCards.length
  const newAvailable = unseen.length
  let candidate: Candidate | null = null
  if (studied < settings.totalLimit) {
    const review = chooseDirection(dueCards)
    if (review) candidate = { note: byId.get(review.noteId)!, direction: review.direction, review, isNew: false }
    else if (newStudied < settings.newLimit) candidate = chooseDirection(unseen) ?? null
  }
  return { candidate, due, newAvailable, studied, newStudied, totalLimit: settings.totalLimit, newLimit: settings.newLimit, complete: !candidate }
}

export async function rateCard(candidate: Candidate, rating: ReviewRating, responseTimeMs: number): Promise<Date> {
  const now = new Date()
  return db.transaction('rw', db.reviewCards, db.reviewLogs, async () => {
    const cardId = cardKey(candidate.note.card_id, candidate.direction)
    const saved = await db.reviewCards.get(cardId)
    const history = await db.reviewLogs.where('cardId').equals(cardId).toArray()
    const prior = history.length && reviewNeedsRepair(saved, history)
      ? { cardId, noteId: candidate.note.card_id, direction: candidate.direction, fsrsCard: replayLogs(history)! }
      : saved
    const result = scheduler.next(prior?.fsrsCard ?? createEmptyCard<Card>(now), now, rating)
    await db.reviewCards.put({ cardId, noteId: candidate.note.card_id, direction: candidate.direction, fsrsCard: result.card })
    await db.reviewLogs.add({ cardId, noteId: candidate.note.card_id, direction: candidate.direction, reviewedAt: now.toISOString(), rating, responseTimeMs, previousDue: prior ? new Date(prior.fsrsCard.due).toISOString() : null, nextDue: new Date(result.card.due).toISOString() })
    return new Date(result.card.due)
  })
}

type Backup = { format: 'english-flashcards'; version: 1 | 2; exportedAt: string; notes: Note[]; reviewCards: ReviewCard[]; reviewLogs: ReviewLog[]; settings: Settings[]; importMetadata: ImportMetadata[]; suspendedNotes?: SuspendedNote[] }

export async function createBackup(): Promise<Backup> {
  const [notes, reviewCards, reviewLogs, settings, importMetadata, suspendedNotes] = await Promise.all([db.notes.toArray(), db.reviewCards.toArray(), db.reviewLogs.toArray(), db.settings.toArray(), db.importMetadata.toArray(), db.suspendedNotes.toArray()])
  return { format: 'english-flashcards', version: 2, exportedAt: new Date().toISOString(), notes, reviewCards, reviewLogs, settings, importMetadata, suspendedNotes }
}

export async function restoreBackup(value: unknown): Promise<void> {
  const data = value as Backup
  if (data?.format !== 'english-flashcards' || ![1, 2].includes(data.version) || ![data.notes, data.reviewCards, data.reviewLogs, data.settings, data.importMetadata].every(Array.isArray) || (data.version === 2 && !Array.isArray(data.suspendedNotes))) throw new Error('対応していないバックアップです')
  if (data.notes.some(note => !note.card_id || !note.ja || !note.en) || data.reviewCards.some(card => !card.cardId || !card.noteId || !card.fsrsCard?.due) || data.reviewLogs.some(log => !log.cardId || !log.reviewedAt) || data.suspendedNotes?.some(item => !item.noteId)) throw new Error('バックアップの内容が不正です')
  await db.transaction('rw', [db.notes, db.reviewCards, db.reviewLogs, db.settings, db.importMetadata, db.suspendedNotes], async () => {
    await Promise.all([db.notes.clear(), db.reviewCards.clear(), db.reviewLogs.clear(), db.settings.clear(), db.importMetadata.clear(), db.suspendedNotes.clear()])
    await db.notes.bulkAdd(data.notes)
    await db.reviewCards.bulkAdd(data.reviewCards)
    await db.reviewLogs.bulkAdd(data.reviewLogs)
    await db.settings.bulkAdd(data.settings)
    await db.importMetadata.bulkAdd(data.importMetadata)
    if (data.suspendedNotes?.length) await db.suspendedNotes.bulkAdd(data.suspendedNotes)
  })
  await reconcileReviewCards()
}
