import assert from 'node:assert/strict'
import test from 'node:test'
import { assertRecallHints, isSafeRecallHint, recallHints } from '../src/recallHints.ts'

test('the Japanese prompt uses context, not the answer-side comparisons', () => {
  assert.deepEqual(recallHints({ en: 'usually', usage: '普段の習慣を話すとき。', nuance: '頻度は高いが毎回ではない。' }), [
    { label: '使う場面・ニュアンス', text: '普段の習慣を話すとき。' }
  ])
  // Neither the whole answer nor fragments, synonyms or literal-word hints
  // from the explanation may appear on the front of the card.
  const usage = '予定がない時間。趣味や用事に使える。'
  for (const nuance of ['downtimeは休むニュアンスが強い。', 'freeという語を使う。', '暇という意味の別の英単語を使う。']) {
    assert.deepEqual(recallHints({ en: 'free time', usage, nuance }), [{ label: '使う場面・ニュアンス', text: usage }])
  }
})

test('unsafe context is rephrased as natural Japanese or withheld entirely', () => {
  assert.deepEqual(recallHints({ usage: '強勢の後半がPR。' }), [
    { label: '使う場面・ニュアンス', text: '予想していなかった出来事への驚きや、不意の出来事を話題にする。' }
  ])
  for (const usage of ['freeを使う表現。', 'ＤＯＷＮＴＩＭＥに近い。', 'caféで使う表現。', '発音は /təˈdeɪ/。', '頭文字は二文字目と同じ。', 'constructor', '']) {
    assert.equal(isSafeRecallHint(usage), false, usage)
    assert.deepEqual(recallHints({ usage }), [])
    assert.throws(() => assertRecallHints([{ card_id: 'new_card', active: '1', usage }]), /new_card/)
  }
  assert.doesNotThrow(() => assertRecallHints([{ card_id: 'inactive', active: '0', usage: '' }]))
})

test('a source update cannot silently reuse a rewrite for an old meaning', () => {
  assert.equal(recallHints({ usage: '英語でもtempuraで通じる。' }).length, 1)
  const changed = { card_id: 'expr_0180', active: '1', usage: '英語でもtempuraと呼ぶが、今回は別の意味。' }
  assert.deepEqual(recallHints(changed), [])
  assert.throws(() => assertRecallHints([changed]), /expr_0180/)
})
