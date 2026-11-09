// Reviewed illustrations from the original 30-card pilot. No personal photos.
// Exact wording guards against showing an obsolete scene after TSV/local edits.
const illustrations: Record<string, { ja: string; en: string }> = {
  "expr_1338": {
    "ja": "ほっとする",
    "en": "feel relieved"
  },
  "expr_0600": {
    "ja": "本当に感謝しています",
    "en": "I’m so grateful."
  },
  "expr_1091": {
    "ja": "〜するのを楽しみにする",
    "en": "look forward to + 動詞ing"
  },
  "expr_1207": {
    "ja": "勇気を出して〜する",
    "en": "gather the courage to ..."
  },
  "expr_1318": {
    "ja": "人に〜だと伝えて安心させる",
    "en": "reassure someone that ..."
  },
  "expr_1351": {
    "ja": "〜が気になる（心配）",
    "en": "be worried about ..."
  },
  "expr_1366": {
    "ja": "妻に仕事の愚痴をこぼす",
    "en": "vent to my wife about work"
  },
  "expr_1506": {
    "ja": "一番後悔しているのは〜だ",
    "en": "My biggest regret is ...ing."
  },
  "expr_1510": {
    "ja": "〜の時は我慢できない",
    "en": "I can't stand it when ..."
  },
  "expr_1593": {
    "ja": "それを聞いて安心した",
    "en": "I’m glad to hear ..."
  },
  "expr_1606": {
    "ja": "〜を終えた・もう〜はうんざり",
    "en": "I'm done with ..."
  },
  "expr_1630": {
    "ja": "その案に納得した・乗り気だ",
    "en": "I'm sold."
  },
  "expr_1675": {
    "ja": "最近元気がない",
    "en": "be kind of down lately"
  },
  "expr_1682": {
    "ja": "追い詰められている",
    "en": "have one's back against the wall"
  },
  "expr_1683": {
    "ja": "わずかな望みにすがる",
    "en": "grasp at straws"
  },
  "expr_1687": {
    "ja": "うますぎて信じられない",
    "en": "too good to be true"
  },
  "expr_1689": {
    "ja": "失礼に聞こえるかもしれませんが",
    "en": "at the risk of sounding rude"
  },
  "expr_1698": {
    "ja": "予定はどこへやら",
    "en": "so much for ..."
  },
  "expr_1700": {
    "ja": "人にずっと監視や催促をされる",
    "en": "be breathing down someone's neck"
  },
  "expr_1701": {
    "ja": "秘密をうっかり漏らす",
    "en": "let the cat out of the bag"
  },
  "expr_1704": {
    "ja": "全力でやってみる",
    "en": "give it my best shot"
  },
  "expr_1705": {
    "ja": "相手の立場に立つ",
    "en": "put yourself in someone's position"
  },
  "expr_1707": {
    "ja": "どうしてもする気になれない",
    "en": "can't bring myself to ..."
  },
  "expr_1709": {
    "ja": "気持ちや考えを整理する",
    "en": "organize my thoughts"
  },
  "expr_1718": {
    "ja": "聞き取れませんでした",
    "en": "Sorry, I did not quite catch that."
  },
  "expr_1731": {
    "ja": "気を遣う・相手の機嫌をうかがう",
    "en": "walk on eggshells"
  },
  "expr_1732": {
    "ja": "気を遣わなくていい",
    "en": "feel comfortable around someone"
  },
  "expr_1738": {
    "ja": "後ろめたい",
    "en": "guilty"
  },
  "expr_1743": {
    "ja": "手が回らない",
    "en": "be swamped"
  },
  "expr_1753": {
    "ja": "割り切る",
    "en": "accept it and move on"
  }
}

export function illustrationPath(note: { card_id: string; ja: string; en: string }): string | null {
  const source = Object.hasOwn(illustrations, note.card_id) ? illustrations[note.card_id] : undefined
  return source && source.ja === note.ja && source.en === note.en
    ? `illustrations/${note.card_id}.webp`
    : null
}
