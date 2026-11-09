# 学習イラスト

## 方針

- 元の試作で承認された女性キャラクターと、温かい鉛筆画の絵柄を使う。
- 顔写真への似せ込みはしない。
- 表情・姿勢・相手との関係から、英語を言いたくなる気持ちや場面を描く。
- 英語の答えや文字を絵に入れず、慣用句を文字どおりの物体に置き換えない。
- 日本語訳が同じカードでも、英語の意味・用法に合わせて状況を分ける。

## 対応状況

```sh
node --experimental-strip-types scripts/illustration-status.mjs
node --experimental-strip-types scripts/illustration-status.mjs --json
```

JSONの `pending` は未対応、または文言変更によって再確認が必要なカード。
`needsReview: true` のカードは、画像の意味を確認してから対応する文言を更新する。

## 追加するとき

1. カードの日本語・英語・用法・例文を読み、場面を決めて個別に生成する。
2. 小さい画面でも意図が読み取れるか確認する。
3. 画像を軽量なWebPにし、`public/illustrations/カードID.webp` に置く。
4. `src/illustrations.ts` の `illustrationSources` に確認した日本語・英語を登録する。
5. `npm run check:cards`、`npm test`、`npm run build` を実行する。

画像の追加でカードID、TSV、IndexedDB、FSRS、学習履歴を変更しない。
日本語や英語を編集したカードには、古い内容の絵を表示しない。
画像のないカード、読み込みに失敗したカードでも学習操作を維持する。

## 保存と配信

生成原本・確認ページ・生成指示はGit管理外の `output/` に保存する。
公開するのは確認済みWebPと対応表のみ。
現在の配信ではWebPもPWAの事前キャッシュに含め、オフライン表示に対応する。
全件へ拡張する過程で、初回ダウンロード量とキャッシュ方式を再確認する。
