import sources from './scenarioSources.json' with { type: 'json' }

export type UsageRegister = 'daily' | 'formal' | 'written'
export type ScenarioSource = {
  ja: string; en: string; usage: string; prompt: string; form: string; register: UsageRegister
}
export const scenarioSources = sources as Record<string, ScenarioSource>
export const registerLabels: Record<UsageRegister, string> = {
  daily: '日常生活で使う', formal: 'ややフォーマル', written: '文書・プレゼン中心'
}

// Content is a separate, read-only layer. Never change IDs or stored learning
// records to enable this cue. Changed wording requires a fresh content review.
export function scenarioFor(note: { card_id: string; ja: string; en: string; usage: string }): ScenarioSource | null {
  const source = Object.hasOwn(scenarioSources, note.card_id) ? scenarioSources[note.card_id] : undefined
  return source && source.ja === note.ja && source.en === note.en && source.usage === note.usage ? source : null
}

export function assertScenarios(notes: { card_id: string; ja: string; en: string; usage: string; active: string }[]): void {
  for (const note of notes.filter(n => n.active !== '0')) {
    const s = scenarioFor(note)
    if (!s) throw new Error(`${note.card_id}: 状況文・形式・分類を現在の内容に合わせて確認してください。`)
    if (!s.form || !Object.hasOwn(registerLabels, s.register) || /[\u3040-\u30ff\u3400-\u9fff]/u.test(s.prompt) || s.prompt.trim().split(/\s+/).length > 16 || s.prompt.trim().split(/\s+/).length < 5) {
      throw new Error(`${note.card_id}: 短い英語の状況文・形式・分類を確認してください。`)
    }
    const normalize = (value: string) => value.toLowerCase().replace(/[’‘]/g, "'").replace(/[.!?]+$/, '').trim()
    const answer = normalize(s.en)
    // Common short words (it, that, etc.) are unavoidable in natural situations.
    if (/^[a-z-]{4,}$/i.test(answer) && new RegExp(`\\b${answer}\\b`, 'i').test(s.prompt)) {
      throw new Error(`${note.card_id}: 状況文に答えの単語が含まれています。`)
    }
    if (answer.includes(' ') && !answer.includes('...') && normalize(s.prompt).includes(answer)) {
      throw new Error(`${note.card_id}: 状況文に答えの表現が含まれています。`)
    }
  }
}
