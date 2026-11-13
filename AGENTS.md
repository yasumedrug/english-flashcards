# Card updates and recall hints

- Keep existing card IDs, FSRS history, suspension state and local wording overrides intact.
- When updating `cards.tsv`, compare IDs and content with the existing source, and keep `public/data/cards.tsv` identical.
- Review the Japanese-to-English prompt hints on every TSV update. A useful hint describes the situation, intended meaning or tone in natural Japanese. Do not include English answers, fragments, alternatives, spellings or pronunciation clues. Do not turn an English comparison into a broken sentence by just deleting the English.
- Prompt hints use `usage` via `src/recallHints.ts`. Raw `nuance`, English examples and pronunciation belong on the answer side. If source context is unsuitable, rewrite `usage` as Japanese context, or add a reviewed exact-source rewrite in `src/recallHints.ts` while preserving useful answer explanations.
- Run `npm run check:cards`, `npm test` and `npm run build` after updating cards or hint logic. Fix failed checks; do not bypass the guard. Build/deploy and the app's TSV import must continue using the same hint validation.

# Situation recall (approved 2026-11-13)

- `src/scenarioSources.json` contains one reviewed English situation, English grammatical form and usage register per card ID, with exact source Japanese, English and usage snapshots. Keep this sidecar in sync on every TSV update. Write a simple 5–16 word situation, normally about 9–13 words. Describe a real situation; never copy the answer, its distinctive fragments or its pronunciation. Review closely related expressions together. Keep the approved 12-card trial wording/forms unless the user requests changes.
- The question side shows only the English situation, English form and illustration. Japanese meanings, contextual tags, review metadata and register labels belong on the answer side.
- Registers are `daily` (日常生活で使う), `formal` (ややフォーマル), `written` (文書・プレゼン中心). They describe the learning context for the current sense, not an absolute prohibition on spoken use. Do not infer register simply from difficulty, a work tag, or the fact that a sentence is long.
- Only notes with both a matching illustration and matching scenario enter the learning queue. Existing `ja_to_en` card IDs/FSRS states continue as the situation→English track. Preserve every `en_to_ja` record and old direction preference in storage and backups; do not merge, reset or delete them.
- When generating an illustration, also read this card's `scenarioSources` situation and make sure the image supports that situation as well as the source usage/example. Do not regenerate existing or held images merely because the question language changed. Keep automatic publication limited to the reviewed images and mapping; include no unrelated scenario/source changes in an image-only commit.
