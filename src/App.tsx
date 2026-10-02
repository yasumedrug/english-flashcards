import { useEffect, useMemo, useRef, useState } from 'react'
import { createEmptyCard, Rating, type Card } from 'ts-fsrs'
import { cardKey, createBackup, dateKey, db, defaultSettings, getTodayPlan, importTsv, loadSettings, rateCard, reconcileReviewCards, restoreBackup, scheduler, type Mode, type Note, type ReviewCard, type ReviewRating, type Settings, type TodayPlan } from './data'

type Page = 'today' | 'study' | 'browse' | 'settings'
const ratings: { value: ReviewRating; label: string; className: string }[] = [
  { value: Rating.Again, label: 'もう一度', className: 'again' },
  { value: Rating.Hard, label: '難しい', className: 'hard' },
  { value: Rating.Good, label: '普通', className: 'good' },
  { value: Rating.Easy, label: '簡単', className: 'easy' }
]
const directionOptions: { id: Mode; label: string }[] = [
  { id: 'ja_to_en', label: '日 → 英' },
  { id: 'en_to_ja', label: '英 → 日' },
  { id: 'mixed', label: '混合' }
]

function DirectionSelector({ mode, onChange, disabled = false }: { mode: Mode; onChange: (mode: Mode) => void; disabled?: boolean }) {
  return <div className="segmented" role="group" aria-label="学習方向">
    {directionOptions.map(option => <button type="button" key={option.id} className={mode === option.id ? 'selected' : ''} aria-pressed={mode === option.id} disabled={disabled} onClick={() => onChange(option.id)}>{option.label}</button>)}
  </div>
}

function nextLabel(date: Date) {
  const minutes = Math.max(1, Math.round((+date - Date.now()) / 60000))
  if (minutes < 60) return `次: ${minutes}分後`
  if (minutes < 1440) return `次: ${Math.round(minutes / 60)}時間後`
  return `次: ${date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}`
}
const fullDate = (date: Date | string) => new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))

export default function App() {
  const [page, setPage] = useState<Page>('today')
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([])
  const [suspendedIds, setSuspendedIds] = useState<Set<string>>(new Set())
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [stats, setStats] = useState({ total: 0, streak: 0 })
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [scene, setScene] = useState('')
  const [tag, setTag] = useState('')
  const [browseNote, setBrowseNote] = useState<Note | null>(null)
  const [browseIndex, setBrowseIndex] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const startRef = useRef(Date.now())

  async function refresh(avoidCardId?: string) {
    const [nextPlan, allNotes, savedSettings, logs, cards, suspended] = await Promise.all([getTodayPlan(new Date(), avoidCardId), db.notes.toArray(), loadSettings(), db.reviewLogs.toArray(), db.reviewCards.toArray(), db.suspendedNotes.toArray()])
    setPlan(nextPlan)
    setNotes(allNotes)
    setReviewCards(cards)
    setSuspendedIds(new Set(suspended.map(item => item.noteId)))
    setSettings(savedSettings)
    const days = new Set(logs.map(log => dateKey(new Date(log.reviewedAt))))
    let cursor = new Date()
    if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1)
    let streak = 0
    while (days.has(dateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
    setStats({ total: logs.length, streak })
    return nextPlan
  }

  useEffect(() => {
    let alive = true
    async function start() {
      try {
        await importTsv()
      } catch (error) {
        if (alive) setMessage(`データ更新に失敗しました。保存済みのカードを使います。${error instanceof Error ? ` ${error.message}` : ''}`)
      }
      await reconcileReviewCards()
      if (alive) await refresh()
    }
    start().catch(error => setMessage(error instanceof Error ? error.message : 'データを開けません'))
    return () => { alive = false }
  }, [])

  const candidate = plan?.candidate ?? null
  const preview = useMemo(() => {
    if (!candidate) return null
    const card = candidate.review?.fsrsCard ?? createEmptyCard<Card>()
    return Object.fromEntries(ratings.map(item => [item.value, scheduler.next(card, new Date(), item.value).card.due])) as Record<Rating, Date>
  }, [candidate])

  async function answer(rating: ReviewRating) {
    if (!candidate || busy) return
    setBusy(true)
    try {
      const nextDue = await rateCard(candidate, rating, Date.now() - startRef.current)
      setRevealed(false)
      await refresh()
      startRef.current = Date.now()
      setMessage(`学習記録を保存しました。次回予定: ${fullDate(nextDue)}`)
    } catch (error) { setMessage(error instanceof Error ? error.message : '保存に失敗しました') }
    finally { setBusy(false) }
  }

  async function saveSettings(next: Settings) {
    const clean = { ...next, newLimit: Math.max(0, Math.min(100, Number(next.newLimit) || 0)), totalLimit: Math.max(1, Math.min(500, Number(next.totalLimit) || 1)), jaRatio: Math.max(0, Math.min(100, Number(next.jaRatio) || 0)) }
    setSettings(clean)
    await db.settings.put(clean)
    await refresh()
  }

  async function changeStudyMode(mode: Mode) {
    if (busy || settings.mode === mode) return
    setRevealed(false)
    startRef.current = Date.now()
    try { await saveSettings({ ...settings, mode }) }
    catch (error) { setMessage(error instanceof Error ? error.message : '学習方向を保存できませんでした') }
  }

  async function shuffleStudy() {
    if (!candidate || busy) return
    setBusy(true)
    try {
      const next = { ...settings, shuffleSeed: Date.now() }
      await db.settings.put(next)
      setSettings(next)
      const nextPlan = await refresh(cardKey(candidate.note.card_id, candidate.direction))
      setRevealed(false)
      startRef.current = Date.now()
      if (nextPlan.candidate && cardKey(nextPlan.candidate.note.card_id, nextPlan.candidate.direction) === cardKey(candidate.note.card_id, candidate.direction)) setMessage('今選べるカードはこの1枚です。')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'シャッフルに失敗しました') }
    finally { setBusy(false) }
  }

  async function suspendNote(noteId: string) {
    if (busy) return
    setBusy(true)
    try {
      await db.suspendedNotes.put({ noteId, suspendedAt: new Date().toISOString() })
      await refresh()
      setRevealed(false)
      startRef.current = Date.now()
      setMessage('この表現を学習から外しました。「探す」から再表示できます。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '非表示にできませんでした') }
    finally { setBusy(false) }
  }

  async function suspendCurrent() {
    if (candidate) await suspendNote(candidate.note.card_id)
  }

  async function resumeNote(noteId: string) {
    try {
      await db.suspendedNotes.delete(noteId)
      await refresh()
      setMessage('この表現を学習に戻しました。復習履歴は保持されています。')
    } catch (error) { setMessage(error instanceof Error ? error.message : '再表示に失敗しました') }
  }

  async function reload() {
    setBusy(true)
    try { const count = await importTsv(); await refresh(); setMessage(`${count}件のカードを更新しました。学習履歴は保持しています。`) }
    catch (error) { setMessage(error instanceof Error ? error.message : '更新に失敗しました') }
    finally { setBusy(false) }
  }

  async function exportBackup() {
    try {
      const data = await createBackup()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = `english-cards-${dateKey(new Date())}.json`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setMessage(error instanceof Error ? error.message : '書き出しに失敗しました') }
  }

  async function onRestore(file: File | undefined) {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (!window.confirm('現在の学習データをバックアップの内容に置き換えます。続けますか？')) return
      await restoreBackup(data)
      await refresh()
      setMessage('バックアップを復元しました')
    } catch (error) { setMessage(error instanceof Error ? error.message : '復元に失敗しました') }
    if (fileRef.current) fileRef.current.value = ''
  }

  function speak(text: string) {
    if (!('speechSynthesis' in window)) { setMessage('このブラウザでは読み上げを利用できません'); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'; utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
  }

  const scenes = [...new Set(notes.filter(n => n.active !== '0').map(n => n.scene).filter(Boolean))].sort()
  const tags = [...new Set(notes.filter(n => n.active !== '0').map(n => n.tag).filter(Boolean))].sort()
  const japaneseCounts = new Map<string, number>()
  for (const note of notes) if (note.active !== '0') japaneseCounts.set(note.ja, (japaneseCounts.get(note.ja) ?? 0) + 1)
  const found = notes.filter(n => n.active !== '0' && (!scene || n.scene === scene) && (!tag || n.tag === tag) && (!query || `${n.card_id} ${n.ja} ${n.en} ${n.usage} ${n.example_en}`.toLowerCase().includes(query.toLowerCase()))).slice(0, 100)
  const progress = plan ? Math.min(100, Math.round(plan.studied / plan.totalLimit * 100)) : 0

  return <div className="app">
    <header><div className="brand"><span className="brand-mark">E</span><span>English Cards</span></div><span className="date">{new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())}</span></header>
    <main>
      {message && <div className="notice" role="status"><span>{message}</span><button aria-label="閉じる" onClick={() => setMessage('')}>×</button></div>}
      {page === 'today' && <section className="page">
        <p className="eyebrow">TODAY'S PRACTICE</p><h1>今日の学習</h1><p className="intro">少しずつ、確実に覚えていきましょう。</p>
        <div className="hero-card"><div className="hero-top"><div><span className="label">今日の進捗</span><strong>{plan?.studied ?? 0}<small> / {plan?.totalLimit ?? 40}</small></strong></div><span className="percent">{progress}%</span></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><div className="hero-bottom"><span>復習待ち <b>{plan?.due ?? 0}</b></span><span>新規枠 <b>{Math.max(0, (plan?.newLimit ?? 8) - (plan?.newStudied ?? 0))}</b></span></div></div>
        <div className="stat-grid"><div><span>今日の学習</span><strong>{plan?.studied ?? 0}</strong><small>件</small></div><div><span>連続学習</span><strong>{stats.streak}</strong><small>日</small></div><div><span>累計レビュー</span><strong>{stats.total}</strong><small>回</small></div></div>
        {plan?.complete ? <div className="done"><span className="done-icon">✓</span><h2>今日の分は終了です</h2><p>お疲れさまでした。次の復習をお楽しみに。</p></div> : <button className="primary start" onClick={() => { setRevealed(false); startRef.current = Date.now(); setPage('study') }}>学習を始める <span>→</span></button>}
        <p className="hint">保存済みカード {notes.filter(n => n.active !== '0').length}件 · オフラインでも学習できます</p>
      </section>}
      {page === 'study' && <section className="page study-page">
        <div className="study-heading"><button className="text-button" onClick={() => setPage('today')}>← 今日へ</button><span>{plan?.studied ?? 0} / {plan?.totalLimit ?? 40}</span></div>
        <div className="panel study-direction"><h2>学習方向</h2><DirectionSelector mode={settings.mode} onChange={changeStudyMode} disabled={busy} /></div>
        {!candidate ? <div className="done"><span className="done-icon">✓</span><h2>今日の分は終了です</h2><p>また明日、少しずつ続けましょう。</p><button className="primary" onClick={() => setPage('today')}>今日の画面へ</button></div> : <>
          <div className="card-type"><span>{candidate.isNew ? 'NEW' : 'REVIEW'}</span><span>{candidate.direction === 'ja_to_en' ? '日本語 → 英語' : '英語 → 日本語'}</span></div>
          <article className="flashcard"><div className="context"><span>{candidate.note.scene}</span>{candidate.note.tag && <span>{candidate.note.tag}</span>}</div><p className="prompt-caption">{candidate.direction === 'ja_to_en' ? 'この表現を英語で？' : 'この表現の意味は？'}</p><h2>{candidate.direction === 'ja_to_en' ? candidate.note.ja : candidate.note.en}</h2>
            {candidate.direction === 'ja_to_en' && (japaneseCounts.get(candidate.note.ja) ?? 0) > 1 && candidate.note.usage.trim() && <div className="recall-hint"><span>使い方のヒント</span><p>{candidate.note.usage}</p></div>}
            <p className="card-meta">ID: {candidate.note.card_id}{candidate.review ? ` · 復習 ${candidate.review.fsrsCard.reps}回` : ' · 未学習'}{candidate.review?.fsrsCard.last_review ? ` · 前回 ${fullDate(candidate.review.fsrsCard.last_review)}` : ''}</p>
            {revealed && <div className="answer"><span className="answer-label">ANSWER</span><h3>{candidate.direction === 'ja_to_en' ? candidate.note.en : candidate.note.ja}</h3>{candidate.note.ipa && <p className="ipa">{candidate.note.ipa}</p>}{candidate.note.usage && <div className="detail"><b>使い所</b><p>{candidate.note.usage}</p></div>}{candidate.note.nuance && <div className="detail"><b>使い分け</b><p>{candidate.note.nuance}</p></div>}{candidate.note.example_en && <div className="example"><b>EXAMPLE</b><p>{candidate.note.example_en}</p>{candidate.note.example_ipa && <small>{candidate.note.example_ipa}</small>}</div>}<button className="speak" onClick={() => speak(candidate.note.en)}>▶ 英語を読み上げる</button></div>}
          </article>
          {!revealed ? <button className="primary reveal" onClick={() => setRevealed(true)}>答えを見る</button> : <div className="rating-area"><p>思い出せましたか？</p><div className="rating-grid">{ratings.map(item => <button key={item.value} className={`rating ${item.className}`} disabled={busy} onClick={() => answer(item.value)}><b>{item.label}</b><small>{preview ? nextLabel(preview[item.value]) : ''}</small></button>)}</div></div>}
          <div className="study-actions"><button disabled={busy} onClick={shuffleStudy}>↝ 順番をシャッフル</button><button disabled={busy} onClick={suspendCurrent}>今後表示しない</button></div>
        </>}
      </section>}
      {page === 'browse' && <section className="page">
        <p className="eyebrow">CARD LIBRARY</p><h1>カードを探す</h1><p className="intro">日本語・英語・カードIDから表現を見つけられます。</p>
        <input className="search" type="search" placeholder="日本語・英語・IDで検索" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="filters"><select aria-label="場面" value={scene} onChange={e => setScene(e.target.value)}><option value="">すべての場面</option>{scenes.map(s => <option key={s}>{s}</option>)}</select><select aria-label="タグ" value={tag} onChange={e => setTag(e.target.value)}><option value="">すべてのタグ</option>{tags.map(t => <option key={t}>{t}</option>)}</select></div>
        <p className="result-count">{found.length}件表示{found.length === 100 ? '（先頭100件）' : ''} · 非表示カードも検索できます</p>
        <div className="browse-list">{found.map(note => <button className="browse-item" key={note.card_id} onClick={() => { setBrowseNote(note); setBrowseIndex(found.indexOf(note)) }}><span><b>{note.en}{suspendedIds.has(note.card_id) && <em className="suspended-tag">非表示</em>}</b><small>{note.ja} · {note.card_id}</small></span><span>›</span></button>)}</div>
        {browseNote && <div className="modal-backdrop" onClick={() => setBrowseNote(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="カード詳細" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setBrowseNote(null)}>×</button><span className="eyebrow">CARD DETAIL · {browseNote.card_id}</span><h2>{browseNote.en}</h2><p className="ipa">{browseNote.ipa}</p><h3>{browseNote.ja}</h3><p>{browseNote.usage}</p><p>{browseNote.nuance}</p><div className="example"><b>EXAMPLE</b><p>{browseNote.example_en}</p><small>{browseNote.example_ipa}</small></div>
          <div className="review-status"><b>学習記録</b>{directionOptions.filter(option => option.id !== 'mixed').map(option => { const review = reviewCards.find(card => card.cardId === cardKey(browseNote.card_id, option.id as 'ja_to_en' | 'en_to_ja')); return <p key={option.id}>{option.label}: {review ? `${review.fsrsCard.reps}回 · 次回 ${fullDate(review.fsrsCard.due)}` : '未学習'}</p> })}</div>
          <div className="modal-actions"><button onClick={() => speak(browseNote.en)}>▶ 読み上げ</button><button onClick={() => { const next = found[(browseIndex + 1) % found.length]; setBrowseNote(next); setBrowseIndex((browseIndex + 1) % found.length) }}>次へ →</button></div>
          <button className="secondary" disabled={busy} onClick={() => suspendedIds.has(browseNote.card_id) ? resumeNote(browseNote.card_id) : suspendNote(browseNote.card_id)}>{suspendedIds.has(browseNote.card_id) ? '学習に戻す' : '今後表示しない'}</button>
        </div></div>}
      </section>}
      {page === 'settings' && <section className="page"><p className="eyebrow">PREFERENCES & DATA</p><h1>設定とデータ</h1><p className="intro">自分のペースに合わせて調整できます。</p><div className="panel"><h2>学習ペース</h2><label className="field"><span>新規カード / 日</span><input type="number" min="0" max="100" inputMode="numeric" value={settings.newLimit} onChange={e => setSettings({ ...settings, newLimit: Number(e.target.value) })} onBlur={() => saveSettings(settings)} /></label><label className="field"><span>総学習数 / 日</span><input type="number" min="1" max="500" inputMode="numeric" value={settings.totalLimit} onChange={e => setSettings({ ...settings, totalLimit: Number(e.target.value) })} onBlur={() => saveSettings(settings)} /></label><p className="field-help">入力後、欄の外をタップすると保存されます。</p></div><div className="panel"><h2>学習方向</h2><DirectionSelector mode={settings.mode} onChange={mode => saveSettings({ ...settings, mode })} />{settings.mode === 'mixed' && <label className="range-field"><span>日本語 → 英語: {settings.jaRatio}%</span><input type="range" min="0" max="100" step="10" value={settings.jaRatio} onChange={e => setSettings({ ...settings, jaRatio: Number(e.target.value) })} onPointerUp={() => saveSettings(settings)} onKeyUp={() => saveSettings(settings)} /><small>残り {100 - settings.jaRatio}% は英語 → 日本語</small></label>}</div><div className="panel"><h2>カードデータ</h2><p className="panel-copy">TSVを更新したら、ここから再読み込みしてください。学習履歴は保持されます。</p><button className="secondary" disabled={busy} onClick={reload}>データを更新</button></div><div className="panel"><h2>バックアップ</h2><p className="panel-copy">機種変更やブラウザデータ消失に備えて、定期的に保存してください。</p><button className="secondary" onClick={exportBackup}>JSONを書き出す</button><button className="secondary" onClick={() => fileRef.current?.click()}>JSONから復元</button><input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" onChange={e => onRestore(e.target.files?.[0])} /></div></section>}
    </main>
    <nav className="bottom-nav" aria-label="メインメニュー">{([{ id: 'today', icon: '◫', label: '今日' }, { id: 'study', icon: '▣', label: '学習' }, { id: 'browse', icon: '⌕', label: '探す' }, { id: 'settings', icon: '⚙', label: '設定' }] as const).map(item => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => { setPage(item.id); setBrowseNote(null); if (item.id === 'study') { setRevealed(false); startRef.current = Date.now() } }}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
  </div>
}
