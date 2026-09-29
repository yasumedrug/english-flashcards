# Codex向け実装指示：英語表現フラッシュカードPWA

## 目的
iPhoneで自分一人が使う、英語表現学習用のフラッシュカードPWAを作成してください。
App Store公開は不要です。Safariから「ホーム画面に追加」してアプリのように使えることを前提にします。
Anki/Distinctionのように復習間隔を自動調整しますが、見た目や実装は独自でよく、最優先は「実装が簡単・壊れにくい・データ更新が容易」です。

## 技術方針
- Vite + React + TypeScript
- PWA対応（vite-plugin-pwa）
- 学習データと学習履歴は IndexedDB に保存。Dexie を使用してよい
- 間隔反復は ts-fsrs を使用
- TSV読み込みは PapaParse 等を使用してよい
- バックエンド、ログイン、クラウドDBは作らない
- iPhone縦画面を最優先
- GitHub Pagesで静的配信できる構成
- オフラインでも、最後に取得したデータで学習できるようにする

## 入力データ
`public/data/cards.tsv` を読み込む。
列は以下。

card_id
source_no
ja
en
ipa
usage
nuance
example_en
example_ipa
tag
scene
priority
active
source_version

重要:
- `card_id` が永続ID。既存カードの更新時に変えない
- データ更新時は `card_id` で upsert
- 内容を更新しても学習履歴・復習予定は保持
- 新しい `card_id` だけ新規カード扱い
- `active=0` は学習対象から外すが履歴は削除しない
- データファイルから消えただけのカードは勝手に削除しない
- `priority=high` は新規導入時に少し優先するが、一日に大量投入しない

## 学習方向
同じnoteから以下2方向のreview cardを作れるようにする。
1. `ja_to_en`: 日本語を見て英語を思い出す
2. `en_to_ja`: 英語を見て日本語を思い出す

両方向は学習履歴を別々に持つこと。
設定で以下を選択できるようにする。
- 日本語→英語のみ
- 英語→日本語のみ
- 混合

初期値は「日本語→英語のみ」。
混合は日本語→英語70%、英語→日本語30%を初期値にし、設定で変更可能にする。

## 1日の負荷制御
初回インポートで全カードを一気に復習対象にしない。
未学習カードは new pool に入れ、設定された数だけ毎日導入する。

設定:
- 新規カード上限/日: 初期値 8
- 総学習カード上限/日: 初期値 40
- 値は設定画面で変更可能

優先順位:
1. 今日が期限の復習カード
2. `priority=high` の未学習カード
3. その他の未学習カード

ただし総学習上限を超えない。
「今日の分が終わったら終了」と明確に表示する。
バックログが多くても一気に出さない。

## FSRS評価
答えを表示した後、4ボタンを出す。
- もう一度 = Again
- 難しい = Hard
- 普通 = Good
- 簡単 = Easy

ts-fsrsのRatingに対応させ、次回予定を保存する。
各ボタンには可能なら「次は約○日後」のプレビューを小さく表示する。

## カードUI
### 日本語→英語
表:
- 日本語・場面
- scene/tag を小さく表示
- 「答えを見る」

裏:
- English を大きく
- IPA
- 使い所
- 使い分けメモ
- Example
- Example IPA
- 英語の読み上げボタン（Web Speech APIで実装可能なら実装）
- 評価4ボタン

### 英語→日本語
表:
- English
- IPAは原則隠す（答え表示後に見せる）
- 「答えを見る」

裏:
- 日本語・場面
- IPA
- 使い所
- 使い分けメモ
- Example
- Example IPA
- 読み上げ
- 評価4ボタン

## 画面
最低限、以下4画面。
1. Today
   - 今日の予定数
   - 新規/復習の内訳
   - 進捗リングまたはバー
   - 「学習を始める」
2. Study
   - 1カード集中表示
   - 大きなタップ領域
   - 答え表示→評価
3. Browse
   - 検索
   - scene/tagフィルタ
   - 日本語/英語どちらでも検索
4. Settings/Data
   - 新規/日
   - 総学習/日
   - 学習方向
   - 混合比率
   - TSV再読み込み
   - JSONバックアップ
   - JSON復元

## 学習記録
IndexedDBに最低限以下を保存。
- notes
- reviewCards
- reviewLogs
- settings
- importMetadata

reviewLogsはappend-onlyにする。
最低限保存するもの:
- cardId
- noteId
- direction
- reviewedAt
- rating
- responseTimeMs
- previousDue
- nextDue

Today画面で:
- 今日の学習数
- 連続学習日数
- 累計レビュー数
を表示する。

## データ更新
アプリ起動時または「データ更新」ボタンで `public/data/cards.tsv` を読み込む。
`source_version` が変わっていたらupsertする。
既存card_idの学習履歴は絶対にリセットしない。

## バックアップ
ブラウザデータ消失に備えて、
- 「バックアップを書き出す」→ JSONダウンロード
- 「バックアップを復元」→ JSONファイル選択
を実装する。

バックアップには reviewCards, reviewLogs, settings, importMetadata を含める。
可能なら notes も含める。

## iPhone UX
- 片手操作
- ボタン高さ44px以上
- safe-areaを考慮
- 横スクロール禁止
- 文字サイズは小さすぎない
- ratingボタンは画面下部に固定してもよい
- ダークモードは余裕があれば対応
- Distinctionのコピーではなく、白基調・青アクセント程度のシンプルな独自UI

## PWA
- manifest
- service worker
- standalone表示
- アイコンは仮のシンプルなものを生成またはSVGで用意
- GitHub Pagesのサブパスでも動作するbase path設定
- オフライン起動を確認

## 実装方針
一度に作り込みすぎず、まずMVPを完成させる。
不要:
- アカウント
- サーバー
- SNS
- ランキング
- 通知
- 複雑な統計
- AI機能
- 音声録音/採点

## 完了条件
1. `npm install`
2. `npm run dev`
3. `npm run build`
が通る。
初回TSVを読み込み、カードが表示される。
評価後に再読込しても履歴が残る。
データTSVを差し替えても既存履歴が残る。
iPhone幅でレイアウト崩れがない。
PWAとしてホーム画面追加できる。

## 作業の進め方
まずリポジトリを確認し、不足ファイルを作成。
実装後に自分でビルド・テスト。
最後に以下を短く報告:
- 作成したもの
- 実行コマンド
- GitHub Pages公開に必要な設定
- iPhoneでホーム画面追加する手順
- 今後TSVを更新する手順

質問は、本当に実装を止める情報がない場合だけしてください。それ以外は妥当な初期値で進めてください。
