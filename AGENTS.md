# Card updates and recall hints

- Keep existing card IDs, FSRS history, suspension state and local wording overrides intact.
- When updating `cards.tsv`, compare IDs and content with the existing source, and keep `public/data/cards.tsv` identical.
- Review the Japanese-to-English prompt hints on every TSV update. A useful hint describes the situation, intended meaning or tone in natural Japanese. Do not include English answers, fragments, alternatives, spellings or pronunciation clues. Do not turn an English comparison into a broken sentence by just deleting the English.
- Prompt hints use `usage` via `src/recallHints.ts`. Raw `nuance`, English examples and pronunciation belong on the answer side. If source context is unsuitable, rewrite `usage` as Japanese context, or add a reviewed exact-source rewrite in `src/recallHints.ts` while preserving useful answer explanations.
- Run `npm run check:cards`, `npm test` and `npm run build` after updating cards or hint logic. Fix failed checks; do not bypass the guard. Build/deploy and the app's TSV import must continue using the same hint validation.
