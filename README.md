# English Cards

自分専用の英語フラッシュカードPWAです。学習履歴は、このブラウザのIndexedDBに保存されます。

## Macで起動

Node.js 20以上を用意し、このフォルダで以下を実行します。

```sh
npm install
npm run dev
```

表示された `http://localhost:5173/` をブラウザで開きます。終了するときはターミナルで `Control + C`。

本番ビルドの確認は `npm run build` です。PWAのサービスワーカーは本番ビルドで生成されます。

## カードを更新

元データ `cards.tsv` を編集し、同じ内容を `public/data/cards.tsv` にコピーしてから、アプリの「設定」→「データを更新」を押します。既存カードの `card_id` を変えないでください。カードの文章を変えても学習履歴は保持されます。`active=0` にすると学習対象から外れます。

## バックアップ

「設定」→「JSONを書き出す」で保存します。「JSONから復元」は現在のローカル学習データを置き換えます。ブラウザデータの消去や機種変更の前にバックアップを保存してください。

## 将来GitHub Pagesで公開する場合

GitHubにリポジトリを作り、このフォルダをpushします。リポジトリ名が `english-flashcards` の場合、`VITE_BASE_PATH=/english-flashcards/ npm run build` でサブパス対応のビルドができます。GitHub Pagesの配信元には `dist` をデプロイするGitHub Actionsを設定します。公開後、iPhoneのSafariでURLを開き、共有ボタンから「ホーム画面に追加」を選びます。PWAのオフライン起動は公開URLまたはlocalhostの本番プレビューで確認してください。
