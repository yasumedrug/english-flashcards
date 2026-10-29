import type { Note } from './data'

// The TSV's tag column mixes grammar labels with themes such as work and food.
// Only use it as a part of speech when it actually describes grammar.
const tagLabels: Record<string, string> = {
  noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞',
  preposition: '前置詞', 'phrasal verb': '句動詞', idiom: '慣用表現'
}

const wordLabels: Record<string, string> = {}
for (const [label, words] of Object.entries({
  名詞: 'perception|awareness|recognition|downtime|tantrum|meltdown|conduct|recap|refresher|overtime|boss|subordinate|outline|convenience|intuition|instinct|recruitment|adoption|field|area|discipline|result|consequence|flashcard|tempura|enhancement|advancement|entirety|gene|mess|landscape|dough|batter|snacks|sweets|gist|footwear|cushion|accountability|internist|onboarding|pancake|development|evolution|portion|passenger|rider|commuter|leftovers|dollars|bucks|savings|suffering|distress|contractor|vendor',
  動詞: 'wear|join|attend|sell|hold|host|delegate|disregard|ponder|contemplate|float|foster|portray|illustrate|comprise|acknowledge|assist|attain|predict|foresee|anticipate|recall|retrieve|praise|compliment|discover|uncover|integrate|merge|annoy|irritate|bother|afflict|highlight|show|indicate|demonstrate|suggest|reveal|signal|reflect',
  形容詞: 'so-called|retrospective|equivalent|consistent|coherent|stringent|lenient|genetic|ubiquitous|manifold|extra|excess|superfluous|redundant|drunk|wasted|lukewarm|applicable|noteworthy|bland',
  副詞: 'chiefly|predominantly|initially|seriously|incrementally|lately|recently|still|actually|really',
  代名詞: 'they|it|that',
  接続詞: 'once',
  接尾辞: '-ish'
})) for (const word of words.split('|')) wordLabels[word] = label

const phraseLabels: Record<string, string> = {}
for (const [label, phrases] of Object.entries({
  名詞句: 'free time|alumni reunion|study session|social gathering|clinical practice|junior colleague|senior colleague|women’s intuition|developmental disability|special needs school|cognitive science|household supplies|older adult|drama queen|umbrella term|packed lunch|lunch box|back-and-forth interaction|one of my students|picky eating|selective eating|clinical setting|healthcare setting|disease entity|hindsight bias|medically underserved area|separate toilet|bathroom with a tub and shower|discharge planning|service provider|front and back|only one correct answer|someone who watches me grow|as-needed medication|prn medication',
  動詞句: 'put on|serve as|take it for granted|leave it to someone|throw away|have something to do with|tend to|engage on their own initiative|take a bath|stand for|take care of the trash|go with the flow|sway in the wind|mess with|dumb down|wing it|hit a wall|think it over|think it through|get on the bus|come across|can tell|cater to someone|get used to something|get dumped|take a day off|keep doing|keep on doing|keep going|feel rushed|consist of|be made up of|end up + -ing|look at|have always dreamed of|have always wanted to be|look good on you|have a big appetite|go to bed late|get into the habit of ...ing|build up my savings|be there for patients who are suffering|do it instead|resonate with me|get there|get here|get home|get to the station|account for|get into the habit of|tell a from b / tell apart|have a company do ...|get to attend ...|leave food on my plate|not finish my meal|save some for later|fall back asleep|think of|think about|think of a as b',
  形容詞句: 'a bit different|on sale|be obsessed with|be inclined to|typically developing|on my period|be on a roll|be stuck|out of stock|out of order|be game for something|be biased|to be expected|behind schedule|way too much|way too many|worth keeping an eye on|out of breath|hit or miss',
  副詞句: 'looking back now|in retrospect|to put it nicely|to put it bluntly|since they were kids|at first|than i expected|one day|for now|as it turns out|ahead of time|come to think of it|bright and early|on the fly|give or take|pretty much|now / these days|for now / so far|until now / up to now|vice versa|just to be safe|just in case|of course|right here|over here|in here|out here|up here|down here|around here|over there|out there|somewhere along the way|even now|to this day|... at the time|back then|after discharge|in the meantime|looking back / now|in my mind, ...|not remotely ...|by no means ...|far from ...|as needed',
  前置詞句: 'because of|due to|thanks to',
  '文・会話表現': 'none of them worked|feels like|first, then, and then|see if ...|as you can see, ...|if it’s not too much trouble, ...|if we break it down into five stages, ...|if we think of it as five stages, ...|no one in their right mind ...',
  会話表現: 'speaking of ...',
  名詞: 'mat / mattress|faux pas',
  '形容詞・名詞': 'opposite',
  文法表現: 'as ... as|only + a/an + noun|no more a than b|not ... at all|no less a than b|just as a as b|every bit as a as b|no less than + 数量|anything but ...|nothing but ...',
  助動詞表現: 'may well|might well|might as well|may as well',
  数量表現: 'a bunch of|a multitude of|an enormous amount of|an enormous number of|a ton of|a couple of|loads of|tons of|way too many|way too much'
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

// New cards tagged as "expression" still need a useful label on the study card.
for (const [label, phrases] of Object.entries({
  動詞句: 'like to do things in a certain order|keep an eye on ... from a little way off|break ... down into three parts|think of it as a spectrum|negotiate another 50,000 yen off',
  名詞句: 'something that seems useless at first',
  副詞句: 'apparently, ...|to begin with, ...|all the way through',
  文法表現: 'almost + 過去形|as ...',
  '文・会話表現': "could stand to be simpler|if i remember correctly, ...|part of me feels ...|part of me wants to ...|the thing is, ...|not after ...|if that works for you|if you're comfortable talking about it"
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  前置詞句: 'other than ...|apart from ...',
  名詞句: 'what to do|how to handle it|where to go|something that bothered me',
  動詞句: "ask someone to lunch|ask someone to come with us|can't reach someone|can't get any work done|add up over time|mean a lot to someone",
  副詞句: 'on my own|by myself|at some point, ...',
  文法表現: 'even though + 文|so + 形容詞 + that + 文',
  助動詞表現: 'must have + 過去分詞',
  '文・会話表現': 'instead of ..., i ...|being able to ... makes me feel ...|a can reduce b, allowing us to ...|... is becoming an integral part of ...|all i have to do is + 動詞の原形'
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  形容詞: 'finite|enduring',
  名詞句: 'cultural heritage|how some tourists behave|international tourists',
  動詞句: 'hold special memories for ...|throw it away',
  形容詞句: 'good to go',
  副詞句: 'from the off|with time, ...|back and forth|here and there',
  前置詞句: 'in terms of + 評価の軸',
  助動詞表現: 'could have been ...|might have been ...',
  会話表現: 'speaking of which, ...|cut it out|knock it off|spit it out|step on it|keep it up|not a chance|good for him / her',
  '文・会話表現': 'were in our sixth year of medical school|most people would ..., but he ...'
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  名詞句: 'mutual respect',
  動詞句: 'impose a on b|sleep on it|let it slide|get it right|have a lot of nerve|leave it alone|sit on it',
  句動詞: 'hand it over|let her in|pass it on to ...|pass on it|set him up|hear him out|show her around|start over|snap him out of it',
  形容詞: 'half-assed',
  形容詞句: 'be flooded with tourists|be full of it|be on pins and needles|out of the ordinary',
  副詞句: 'quite a bit|one at a time|all at once|through word of mouth',
  前置詞句: 'instead of them|with the help of ...'
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  名詞: 'creativity',
  形容詞: 'realistic|detailed',
  名詞句: 'something that looks like ...|peace of mind',
  動詞句: 'make a look like b|closely resemble the original|be based on ...',
  句動詞: 'put her down|let him in on it|keep him out of it|talk someone out of ...|run something by someone|let it sink in|get it together|put someone through ...|snap out of it|put someone up to ...|talk someone into ...|get it over with',
  形容詞句: 'one of a kind',
  前置詞句: 'with no ... experience',
  助動詞表現: "shouldn't have been ...|couldn't have been ...|wouldn't have been ...",
  会話表現: 'believe it or not, ...',
  '文・会話表現': "the challenge is to ...|even someone like me can ...|if i had to pick one, i'd say ..."
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  副詞: 'almost always|usually|often|sometimes|hardly ever',
  副詞句: 'not very often|a lot|while you still can',
  形容詞: 'former + 名詞|previous + 名詞|subsequent + 名詞',
  形容詞句: 'under review|under construction|under consideration|be particular about ...|be concerned that ...|seem stressed|feel relieved|feel less stressed',
  名詞: 'soundproofing',
  名詞句: 'prior experience|my ex|the former|the latter|someone i would never have met otherwise|someone i never expected to meet|work clothes|the founder of ...|the head of ...',
  動詞: 'soundproof',
  動詞句: 'look at ... from three different perspectives|get in the way of ...|get together in person from time to time|stick to ...|articulate my thoughts|care about someone|have what it takes to ...|want to ... so badly|wait outside the ticket gates|take the train a few stops|ask someone to ...|give it a try|seem to + 動詞の原形|help someone + 動詞の原形',
  前置詞句: 'prior to ...',
  接続詞: 'even if + 文|while + 動詞ing',
  文法表現: 'the more ..., the fewer chances ...|..., followed by ...|i\'ve been + 動詞ing|try + 動詞ing',
  会話表現: 'not to brag, but ...|for all that\'s been said, ...'
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  名詞句: 'rubber gloves|disposable gloves',
  動詞句: 'take shape|take it personally|sit around waiting|get a drink|have a distinctive style|want to ... so bad',
  形容詞句: 'be worried about ...|be curious about ...|... is on my mind|be close to ...ing',
  副詞句: 'in a good way|fair and square|from the start|not necessarily ...|not always ...|all the time|all the way|all the more ...|all the same|all day|from a distance|all the while|all the better',
  前置詞句: 'before ...|until ...|by ...',
  接続詞: 'now that ..., ...|now that i\'m used to ...',
  文法表現: '... is followed by ...|now it\'s ... that ...|not everyone ...',
  '文・会話表現': '... bothers me|chances are (that) ...'
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  前置詞句: 'in the interview|at the interview|in the meeting|at the meeting|aside from ...',
  動詞句: "meet at takashimaya|be in takashimaya|get hold of someone|have ... on hand|seem a bit aloof|hardly spoke|can't shake the feeling that ...|get ... ready ahead of time|get ... ready the night before|take a step back from ...|step away from ... for a bit|give ... a try out of curiosity|reinforce each other|have the good fortune to ...",
  句動詞: 'fizzle out',
  形容詞句: 'on the ball|on top of things',
  副詞: 'earlier',
  副詞句: 'most of all|just now|last time',
  名詞句: "lack of sleep|someone's passing",
  慣用表現: 'par for the course',
  文法表現: "whoever's free ...",
  会話表現: "if that's what it takes",
  '文・会話表現': 'my take is that ...'
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

for (const [label, phrases] of Object.entries({
  副詞句: 'at the end of the day, ...|from that day forward, ...|just to be on the safe side|... for a living',
  名詞句: 'japanese-style cream stew|store-bought stew mix',
  動詞句: 'work as ...|complement ...',
  文法表現: 'the more ..., the more ...',
  会話表現: "if that's even a thing",
  '文・会話表現': "don't make it all about ...|just wanted to check ...|for some reason, i always ...|my view is that ...|most news stories aren't ...|whenever ..., we'd ...|all i knew back then was that ..."
})) for (const phrase of phrases.split('|')) phraseLabels[phrase] = label

export function partOfSpeech(note: Pick<Note, 'en' | 'ja' | 'tag'>): string {
  const english = note.en.trim()
  const japanese = note.ja.trim()
  const lower = english.toLowerCase()
  if (tagLabels[note.tag]) return tagLabels[note.tag]
  if (wordLabels[lower]) return wordLabels[lower]
  if (phraseLabels[lower]) return phraseLabels[lower]
  if (note.tag === 'concept' || note.tag === 'food') return '名詞・名詞句'
  if (note.tag === 'discourse') return '会話表現'
  if (/^(?:i|we|you|he|she|they|it|there|what|who|why|how|when|where|this|that)\b/i.test(english) || (/[.!?]$/.test(english) && !/\.\.\.$/.test(english))) return '文・会話表現'
  if (/^(?:a|an|the|my|your|his|her|our|their)\s/i.test(english)) return '名詞句'
  if (/(?:する|させる|できる|している|した|される|を[\p{Script=Han}\p{Script=Hiragana}]+[うくぐすつぬぶむる])$/u.test(japanese)) return '動詞句'
  if (/(?:な|い|っぽい|的な)$/.test(japanese)) return '形容詞句'
  if (/(?:に|く|として|について|によって)$/.test(japanese)) return '副詞句'
  return '語句・表現'
}
