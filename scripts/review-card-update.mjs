import { readFile } from 'node:fs/promises'
import { parseTsv } from '../src/data.ts'
import { hasMatchingPriority } from '../src/learningPriorities.ts'

const [incomingPath, scenarioPath] = process.argv.slice(2)
if (!incomingPath) throw new Error('使い方: npm run review:card-update -- 新しいcards.tsv [新しいscenarioSources.json]')

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const [currentTsv, incomingTsv, currentScenarios, incomingScenarios, imageReviews] = await Promise.all([
  readFile(new URL('../cards.tsv', import.meta.url), 'utf8'),
  readFile(incomingPath, 'utf8'),
  readJson(new URL('../src/scenarioSources.json', import.meta.url)),
  scenarioPath ? readJson(scenarioPath) : null,
  readJson(new URL('../src/illustrationReviews.json', import.meta.url)),
])
const current = new Map(parseTsv(currentTsv).map(note => [note.card_id, note]))
const incoming = new Map(parseTsv(incomingTsv).map(note => [note.card_id, note]))
const meaningFields = ['ja', 'en', 'usage', 'nuance', 'example_en']
const contextFields = ['ja', 'en', 'usage', 'prompt', 'form', 'register']
const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const byAnswer = new Map()
for (const note of incoming.values()) {
  const key = normalize(note.en)
  if (!byAnswer.has(key)) byAnswer.set(key, [])
  byAnswer.get(key).push(note.card_id)
}

const review = []
const pendingPriority = []
for (const note of incoming.values()) {
  const id = note.card_id
  const before = current.get(id)
  const changed = before ? Object.keys(note).filter(key => note[key] !== before[key]) : []
  const scenario = (incomingScenarios ?? currentScenarios)[id]
  const scenarioChanges = contextFields.filter(key => scenario?.[key] !== currentScenarios[id]?.[key])
  const priorityMissing = !hasMatchingPriority(note)
  if (note.active !== '0' && priorityMissing) pendingPriority.push(id)
  if (before && !changed.length && !scenarioChanges.length) continue

  const scenarioNeedsUpdate = !scenario || ['ja', 'en', 'usage'].some(key => scenario[key] !== note[key])
  const reviewed = imageReviews[id]
  const illustrationReview = !reviewed ? 'no_existing_review' :
    scenarioNeedsUpdate || contextFields.some(key => reviewed.context[key] !== scenario[key]) ? 'visual_recheck_required' :
      changed.some(key => meaningFields.includes(key)) ? 'recheck_if_meaning_or_usage_changes' : 'context_same'
  review.push({
    id, en: note.en, change: before ? 'updated' : 'added', changed, scenarioChanges,
    checkPriority: !before || changed.some(key => meaningFields.includes(key)) || scenarioChanges.includes('register'),
    priorityMissing, scenarioNeedsUpdate, illustrationReview,
    sameAnswerCandidates: byAnswer.get(normalize(note.en)).filter(otherId => otherId !== id),
  })
}

console.log(JSON.stringify({
  currentCount: current.size, incomingCount: incoming.size,
  removedIds: [...current.keys()].filter(id => !incoming.has(id)),
  pendingPriority, review,
}, null, 2))
