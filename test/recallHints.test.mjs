import assert from 'node:assert/strict'
import test from 'node:test'
import { recallHints } from '../src/recallHints.ts'

test('the Japanese prompt gets context even when its translation is unique', () => {
  assert.deepEqual(recallHints({ en: 'usually', usage: '普段の習慣を話すとき。', nuance: '頻度は高いが毎回ではない。' }), [
    { label: '使う場面', text: '普段の習慣を話すとき。' },
    { label: 'ニュアンス', text: '頻度は高いが毎回ではない。' }
  ])
})

test('hints containing the English answer are hidden before reveal', () => {
  assert.deepEqual(recallHints({ en: 'wear', usage: '服を身につけている状態。', nuance: 'wear は状態を表す。' }), [
    { label: '使う場面', text: '服を身につけている状態。' }
  ])
  assert.deepEqual(recallHints({ en: 'tempura', usage: '英語でもtempuraで通じる。', nuance: '' }), [])
})
