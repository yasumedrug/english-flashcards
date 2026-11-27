import { readFile } from 'node:fs/promises'
import { parseTsv } from '../src/data.ts'
import { isSafeRecallHint, recallHints } from '../src/recallHints.ts'
import { assertScenarios, scenarioFor } from '../src/scenarios.ts'
import { illustrationPath } from '../src/illustrations.ts'
import { assertIllustrationReview } from './illustration-context-review.mjs'
import { assertLearningPriorities, hasMatchingPriority } from '../src/learningPriorities.ts'

const source = await readFile(new URL('../cards.tsv', import.meta.url), 'utf8')
const published = await readFile(new URL('../public/data/cards.tsv', import.meta.url), 'utf8')
if (source !== published) throw new Error('cards.tsv と public/data/cards.tsv の内容が一致していません。')

// Use the same parser/validation as the app's TSV update, not a separate rule.
const notes = parseTsv(source)
assertScenarios(notes)
assertLearningPriorities()
const reviews = JSON.parse(await readFile(new URL('../src/illustrationReviews.json', import.meta.url), 'utf8'))
let reviewedImages = 0
for (const note of notes) {
  const path = illustrationPath(note)
  if (!path) continue // Old wording stays hidden; its learning records remain intact.
  assertIllustrationReview(note.card_id, scenarioFor(note),
    await readFile(new URL(`../public/${path}`, import.meta.url)), reviews[note.card_id])
  reviewedImages++
}
const active = notes.filter(note => note.active !== '0')
const unranked = active.filter(note => !hasMatchingPriority(note))
if (unranked.length) console.log(`学習優先度は${unranked.length}件が未判定です。出題時はP2の後、P3の前に扱います。`)
for (const note of active) {
  const hints = recallHints(note)
  if (!hints.length || hints.some(hint => !isSafeRecallHint(hint.text))) {
    throw new Error(`${note.card_id}: 回答前の日本語ヒントを修正してください。`)
  }
}
console.log(`${notes.length}件の形式・ID・英語状況文・形式ラベル・分類と、${active.length}件の日本語ヒントを検査しました。`)
console.log(`${reviewedImages}件のイラストと状況文の目視確認記録が現在の画像・文言に一致しています。`)
