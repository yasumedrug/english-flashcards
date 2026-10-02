# English Cards

自分専用の英語フラッシュカードPWAです。学習履歴は、このブラウザのIndexedDBに保存されます。

## Macで起動

Node.js 20以上を用意し、このフォルダで以下を実行します。

```sh
npm install
npm run dev
```

表示された `http://localhost:5173/english-flashcards/` をブラウザで開きます。終了するときはターミナルで `Control + C`。

本番ビルドの確認は `npm run build` です。PWAのサービスワーカーは本番ビルドで生成されます。

## カードを更新

元データ `cards.tsv` を編集し、同じ内容を `public/data/cards.tsv` にコピーしてから、アプリの「設定」→「データを更新」を押します。既存カードの `card_id` を変えないでください。カードの文章を変えても学習履歴は保持されます。`active=0` にすると学習対象から外れます。

## バックアップ

「設定」→「JSONを書き出す」で保存します。「JSONから復元」は現在のローカル学習データを置き換えます。ブラウザデータの消去や機種変更の前にバックアップを保存してください。

## 学習中の操作

「順番をシャッフル」で次に出るカードを入れ替えられます。「今後表示しない」でその表現を学習対象から外せます。非表示にしたカードは「探す」で日本語・英語・カードIDから見つけて「学習に戻す」を押せば復帰できます。学習履歴と非表示設定はJSONバックアップにも含まれます。カードの下に表示されるIDで、同じ日本語を持つ別カードを区別できます。

日本語→英語では、同じ日本語訳のカードが複数あるときだけ、答えを見る前に短い「使い方のヒント」を表示します。これはTSVの `usage` 欄から表示し、カードIDや学習履歴は変更しません。

## 将来GitHub Pagesで公開する場合

`main` にpushするとGitHub Actionsがビルドし、`dist` をGitHub Pagesへデプロイします。GitHubのリポジトリ設定で **Settings → Pages → Build and deployment → Source: GitHub Actions** を選んでください。公開URLは `https://yasumedrug.github.io/english-flashcards/` です。公開後、iPhoneのSafariで開き、共有ボタンから「ホーム画面に追加」を選びます。
