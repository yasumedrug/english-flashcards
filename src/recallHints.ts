import type { Note } from './data'

type Hint = { label: string; text: string }

// Match the source text, rather than the card ID, so a later TSV edit cannot
// silently keep an out-of-date hint. These are contextual cues, not translations
// of the English comparisons and grammar explanations on the answer side.
const contextRewrites: Record<string, string> = {
  'レジ前の長い列。米語でline。': '買い物の会計を待つ人が、レジの前に並んでいる場面。',
  '英語でもtempuraで通じる。': '魚介や野菜に衣をつけて揚げる、日本の料理について話すとき。',
  'matは薄い敷物、mattressは厚い寝具。': '床などに敷く薄い物と、寝るための厚い物を区別するとき。',
  'for nowは当面、so farはここまでの経過。': '当面の対応なのか、これまでの経過なのかを区別するとき。',
  'A→BだけでなくB→Aも成り立つ。': '一方から他方への関係が、逆向きにも成り立つことを付け加える。',
  '場所に入らない、または trouble など好ましくない状況を避ける。': '立ち入ってはいけない場所や、巻き込まれたくない状況を避ける。',
  'a/an を含む名詞句全体を only が限定するとき。': '数量の少なさや役割の小ささを示し、それだけにすぎないと述べる。',
  '判断や計算に要因Xを含める。': '結論を出す前に、ある条件も判断材料として考慮する。',
  '要因Xを判断材料から除外する。': 'ある条件をいったん考慮せず、残りの条件で判断する。',
  '完全な Yes ではなく部分的に肯定する。': '全面的には賛成できないが、一部はそうだと認める返事。',
  '柔らかい No。': '相手を強く否定せず、やんわりと違うと伝える返事。',
  '確信が弱い・少し気乗りしない Yes にもなる。': '自信を持って言い切れないときや、少し気乗りしないまま同意するとき。',
  'want より柔らかく希望を伝える。': '注文や依頼で、自分の希望を控えめに伝える。',
  'need を断言せず探索状態として希望を伝える。': '店などで、探している物を伝えて相談する。',
  '過小評価されそうな対象が同等にAだと強調する。': '低く見られがちな対象にも、同じ程度の性質があると強調する。',
  'AをBに例えて理解・説明する。': '性質の似た別の物にたとえ、相手が理解しやすいように説明する。',
  '場所を名詞で表す場合はtoが必要。': '移動した結果、駅という目的地に着くことを話す。',
  '否定句を文頭に置くと主語とbe動詞が倒置する。': '文章や改まった発言で、決してそうではないと強く否定する。',
  'Aという表現では弱くBほど強い。': '普通の程度を超えており、さらに強い言い方が必要だと伝える。',
  '実態の強さは表現Aをはるかに超える。': '実際のすごさや深刻さは、普通の言葉ではとても言い尽くせない。',
  '強勢の後半がPR。': '予想していなかった出来事への驚きや、不意の出来事を話題にする。',
  '強勢の後半がPL。': '仕事や活動に備えて使う、文房具や備品などをまとめて指す。',
  'AをBという枠組みで捉える。': 'ある物事を、特定の見方や位置づけで捉える意見を述べる。',
  '否定文中の anything but は「〜以外のもの」を指す。': '飲み物について、ある一種類以外は欲しくないと伝える。',
  '悪い状態・やり方を表すほか、need/wantとともに強い必要・欲求を表す。': 'やり方のまずさを述べるほか、何かを強く必要とする気持ちを強調する。',
  'good は良い結果ではなく、可能性の高さを表す。': '望ましいかどうかに関係なく、起こる見込みが高いと伝える。',
  'what + to + 動詞で、何をするか・すべきかという内容を作る。': '取るべき行動や、次にすることを考える。',
  'how + to + 動詞で、対処する方法を表す。': '困った状況に、どのように対処すればよいかを考える。',
  'where + to + 動詞で、行き先の選択を表す。': 'いくつかの候補から、どこへ行けばよいかを考える。',
  '場所には in the side を使う。': '箱の側面を加工し、穴を開ける作業について話す。',
  '否定文で any を使い、少しも進まないことを強調。': '邪魔や問題があり、仕事を少しも進められず困っている。',
  'Aにも当てはまる余地を残し、より正確な焦点をBに置く。': '最初の説明を完全には否定せず、別の説明のほうが的確だと言い直す。',
  '米国英語で内科医。': '成人の内科診療を担当する医師について話すとき。',
  '日本語のホットケーキを英語で言うときの基本語。': '朝食やおやつに食べる、平たい甘い焼き菓子について話すとき。'
}

export function isSafeRecallHint(text: string): boolean {
  const normalized = text.normalize('NFKC')
  // Reject English fragments, full-width letters, accented letters and IPA.
  // Never delete just the English and leave a broken comparison as a hint.
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(normalized)
    && !/[\p{Script=Latin}\u0250-\u02ff\u1d00-\u1dbf]/u.test(normalized)
    && !/頭文字|スペル|強勢|アルファベット|ローマ字|語頭|語尾|綴り|つづり|発音記号/.test(normalized)
}

export function recallHints(note: Pick<Note, 'usage'>): Hint[] {
  // nuance is an answer-side explanation: it often names alternatives or
  // describes the English construction, even when it omits the full answer.
  const source = note.usage.trim()
  const text = Object.hasOwn(contextRewrites, source) ? contextRewrites[source] : source
  return isSafeRecallHint(text) ? [{ label: '使う場面・ニュアンス', text }] : []
}

export function assertRecallHints(notes: Pick<Note, 'card_id' | 'active' | 'usage'>[]): void {
  const invalid = notes.filter(note => note.active !== '0' && recallHints(note).length === 0)
  if (invalid.length) {
    throw new Error(`日本語だけの文脈ヒントを確認してください（${invalid.map(note => note.card_id).join(', ')}）。使い所を自然な日本語に修正してから更新してください。`)
  }
}
