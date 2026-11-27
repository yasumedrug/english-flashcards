import sources from './learningPrioritySources.json' with { type: 'json' }

const priorityRanks = { P1: 1, P2: 2, P3: 4, P4: 5 } as const
type Priority = keyof typeof priorityRanks
type PrioritySource = { priority: Priority; ja: string; en: string; usage: string }
type PrioritizableNote = Pick<PrioritySource, 'ja' | 'en' | 'usage'> & { card_id: string }

const cards: Record<string, PrioritySource> = sources.cards as Record<string, PrioritySource>
const topOrder = new Map(sources.top150.map((id, index) => [id, index]))

export function hasMatchingPriority(note: PrioritizableNote): boolean {
  const entry = Object.hasOwn(cards, note.card_id) ? cards[note.card_id] : undefined
  return !!entry && entry.ja === note.ja && entry.en === note.en && entry.usage === note.usage
}

export function learningRank(note: PrioritizableNote): number {
  if (!hasMatchingPriority(note)) return 3
  return priorityRanks[cards[note.card_id].priority]
}

export function newLearningRank(note: PrioritizableNote): number {
  const rank = learningRank(note)
  return rank === priorityRanks.P1 && topOrder.has(note.card_id) ? 0 : rank
}

export function topLearningOrder(id: string): number {
  return topOrder.get(id) ?? sources.top150.length
}

export function assertLearningPriorities(): void {
  for (const [id, entry] of Object.entries(cards)) {
    if (!id || !Object.hasOwn(priorityRanks, entry.priority) ||
        [entry.ja, entry.en, entry.usage].some(field => typeof field !== 'string') || !entry.ja || !entry.en) {
      throw new Error(`${id}: 学習優先度または判定時の文言が不正です。`)
    }
  }
  if (topOrder.size !== 150 || sources.top150.length !== 150 || sources.top150.some(id => cards[id]?.priority !== 'P1')) {
    throw new Error('トップ150には重複のないP1カードIDを150件登録してください。')
  }
}
