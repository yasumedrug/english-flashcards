import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { assertIllustrationReview } from '../scripts/illustration-context-review.mjs'
import { scenarioSources } from '../src/scenarios.ts'
import { illustrationSources } from '../src/illustrations.ts'

const reviews = JSON.parse(await readFile(new URL('../src/illustrationReviews.json', import.meta.url), 'utf8'))

test('every published image has a visual review for its exact current situation, form and meaning', async () => {
  for (const id of Object.keys(illustrationSources)) {
    const image = await readFile(new URL(`../public/illustrations/${id}.webp`, import.meta.url))
    assert.doesNotThrow(() => assertIllustrationReview(id, scenarioSources[id], image, reviews[id]))
  }
})

test('changing a situation or image independently requires a fresh pair review', async () => {
  const id = 'expr_0002', scenario = scenarioSources[id]
  const image = await readFile(new URL(`../public/illustrations/${id}.webp`, import.meta.url))
  const check = (cue, bytes = image, review = reviews[id]) => assertIllustrationReview(id, cue, bytes, review)
  // Reproduce the reported mismatch without changing any real files or learning data.
  assert.throws(() => check({ ...scenario, prompt: 'You finally notice how much noise your phone makes.' }), /再確認/)
  for (const field of ['ja', 'en', 'usage', 'form', 'register']) {
    assert.throws(() => check({ ...scenario, [field]: scenario[field] + ' changed' }), /再確認/)
  }
  assert.throws(() => check(scenario, Buffer.concat([image, Buffer.from('changed')])), /再確認/)
  assert.throws(() => assertIllustrationReview(id, scenario, image, undefined), /再確認/)
  assert.throws(() => check(null), /再確認/)
})

test('automatic registration holds missing or stale context reviews and accepts only the exact reviewed pair', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { fileURLToPath } = await import('node:url')
  const { spawnSync } = await import('node:child_process')
  const root = await mkdtemp(join(tmpdir(), 'english-context-registration-'))
  const script = fileURLToPath(new URL('../scripts/register-reviewed-illustrations.py', import.meta.url))
  try {
    const id = 'expr_0002', context = scenarioSources[id]
    const image = await readFile(new URL(`../public/illustrations/${id}.webp`, import.meta.url))
    // Use the old special-cased batch name to verify it cannot bypass review.
    const batch = join(root, 'output/illustration-expansion/batch-002')
    for (const dir of [batch, join(root, 'src'), join(root, 'public/illustrations')]) await mkdir(dir, { recursive: true })
    await writeFile(join(root, 'cards.tsv'), 'card_id\tja\ten\tusage\n' + [id, context.ja, context.en, context.usage].join('\t') + '\n')
    await writeFile(join(root, 'src/scenarioSources.json'), JSON.stringify({ [id]: context }))
    await writeFile(join(root, 'src/illustrations.ts'), 'export const illustrationSources = {}\n')
    await writeFile(join(root, 'src/illustrationReviews.json'), '{}\n')
    await writeFile(join(batch, id + '.webp'), image)
    const verify = async (review, approved = true) => {
      await writeFile(join(batch, 'manifest.json'), JSON.stringify([{ card_id: id, ...context, reviewStatus: approved ? 'approved' : 'pending', reviewedContext: review }]))
      const r = spawnSync('python3', [script, '--dry-run'], { cwd: root, encoding: 'utf8' })
      assert.equal(r.status, 0, r.stderr)
      return JSON.parse(r.stdout)
    }
    assert.equal((await verify(undefined)).added, 0)
    assert.equal((await verify({ ...reviews[id], context: { ...context, prompt: 'An unrelated phone makes a loud noise.' } })).added, 0)
    assert.equal((await verify({ ...reviews[id], imageSha256: 'wrong-image' })).added, 0)
    assert.equal((await verify(reviews[id], false)).added, 0)
    assert.equal((await verify(reviews[id])).added, 1)
    assert.equal(await readFile(join(root, 'src/illustrationReviews.json'), 'utf8'), '{}\n')
    assert.equal(await readFile(join(root, 'src/illustrations.ts'), 'utf8'), 'export const illustrationSources = {}\n')
  } finally { await rm(root, { recursive: true, force: true }) }
})
