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
export type Settings = { id: 'main'; newLimit: number; totalLimit: number; mode: Mode; jaRatio: number }
export type ImportMetadata = { id: 'cards'; importedAt: string; count: number; sourceVersion: string }

class CardsDB extends Dexie {
  notes!: EntityTable<Note, 'card_id'>
  reviewCards!: EntityTable<ReviewCard, 'cardId'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  settings!: EntityTable<Settings, 'id'>
  importMetadata!: EntityTable<ImportMetadata, 'id'>
  constructor() {
    super('english-flashcards')
    this.version(1).stores({
      notes: 'card_id, scene, tag, active',
      reviewCards: 'cardId, noteId, direction',
      reviewLogs: '++id, cardId, noteId, reviewedAt',
      settings: 'id',
      importMetadata: 'id'
    })
  }
}
export const db = new CardsDB()
export const scheduler = fsrs()
export const defaultSettings: Settings = { id: 'main', newLimit: 8, totalLimit: 40, mode: 'ja_to_en', jaRatio: 70 }
export const cardKey = (noteId: string, direction: Direction) => `${noteId}:${direction}`
export const dateKey = (date: Date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')

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

export async function getTodayPlan(now = new Date()): Promise<TodayPlan> {
  const [settings, notes, cards, logs] = await Promise.all([loadSettings(), db.notes.toArray(), db.reviewCards.toArray(), db.reviewLogs.toArray()])
  const day = dateKey(now)
  const todayLogs = logs.filter(log => dateKey(new Date(log.reviewedAt)) === day)
  const studied = todayLogs.length
  const newStudied = todayLogs.filter(log => log.previousDue === null).length
  const active = notes.filter(note => note.active !== '0')
  const byId = new Map(active.map(note => [note.card_id, note]))
  const directions: Direction[] = settings.mode === 'mixed' ? ['ja_to_en', 'en_to_ja'] : [settings.mode]
  const eligible = cards.filter(card => directions.includes(card.direction) && byId.has(card.noteId))
  const dueCards = eligible.filter(card => new Date(card.fsrsCard.due) <= now).sort((a, b) => +new Date(a.fsrsCard.due) - +new Date(b.fsrsCard.due))
  const cardIds = new Set(cards.map(card => card.cardId))
  const unseen: Candidate[] = active.flatMap(note => directions.filter(direction => !cardIds.has(cardKey(note.card_id, direction))).map(direction => ({ note, direction, isNew: true })))
  unseen.sort((a, b) => (b.note.priority === 'high' ? 1 : 0) - (a.note.priority === 'high' ? 1 : 0) || Number(a.note.source_no) - Number(b.note.source_no))
  const chooseDirection = <T extends { direction: Direction }>(items: T[]): T | undefined => {
    if (settings.mode !== 'mixed') return items[0]
    const jaToday = todayLogs.filter(log => log.direction === 'ja_to_en').length
    const desiredJa = (studied + 1) * settings.jaRatio / 100
    const target: Direction = jaToday < desiredJa ? 'ja_to_en' : 'en_to_ja'
    return items.find(item => item.direction === target) ?? items[0]
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

export async function rateCard(candidate: Candidate, rating: ReviewRating, responseTimeMs: number): Promise<void> {
  const now = new Date()
  await db.transaction('rw', db.reviewCards, db.reviewLogs, async () => {
    const prior = await db.reviewCards.get(cardKey(candidate.note.card_id, candidate.direction))
    const result = scheduler.next(prior?.fsrsCard ?? createEmptyCard<Card>(now), now, rating)
    await db.reviewCards.put({ cardId: cardKey(candidate.note.card_id, candidate.direction), noteId: candidate.note.card_id, direction: candidate.direction, fsrsCard: result.card })
    await db.reviewLogs.add({ cardId: cardKey(candidate.note.card_id, candidate.direction), noteId: candidate.note.card_id, direction: candidate.direction, reviewedAt: now.toISOString(), rating, responseTimeMs, previousDue: prior ? new Date(prior.fsrsCard.due).toISOString() : null, nextDue: new Date(result.card.due).toISOString() })
  })
}

type Backup = { format: 'english-flashcards'; version: 1; exportedAt: string; notes: Note[]; reviewCards: ReviewCard[]; reviewLogs: ReviewLog[]; settings: Settings[]; importMetadata: ImportMetadata[] }

export async function createBackup(): Promise<Backup> {
  const [notes, reviewCards, reviewLogs, settings, importMetadata] = await Promise.all([db.notes.toArray(), db.reviewCards.toArray(), db.reviewLogs.toArray(), db.settings.toArray(), db.importMetadata.toArray()])
  return { format: 'english-flashcards', version: 1, exportedAt: new Date().toISOString(), notes, reviewCards, reviewLogs, settings, importMetadata }
}

export async function restoreBackup(value: unknown): Promise<void> {
  const data = value as Backup
  if (data?.format !== 'english-flashcards' || data.version !== 1 || ![data.notes, data.reviewCards, data.reviewLogs, data.settings, data.importMetadata].every(Array.isArray)) throw new Error('対応していないバックアップです')
  if (data.notes.some(note => !note.card_id || !note.ja || !note.en) || data.reviewCards.some(card => !card.cardId || !card.noteId || !card.fsrsCard?.due) || data.reviewLogs.some(log => !log.cardId || !log.reviewedAt)) throw new Error('バックアップの内容が不正です')
  await db.transaction('rw', db.notes, db.reviewCards, db.reviewLogs, db.settings, db.importMetadata, async () => {
    await Promise.all([db.notes.clear(), db.reviewCards.clear(), db.reviewLogs.clear(), db.settings.clear(), db.importMetadata.clear()])
    await db.notes.bulkAdd(data.notes)
    await db.reviewCards.bulkAdd(data.reviewCards)
    await db.reviewLogs.bulkAdd(data.reviewLogs)
    await db.settings.bulkAdd(data.settings)
    await db.importMetadata.bulkAdd(data.importMetadata)
  })
}
