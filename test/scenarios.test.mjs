import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createEmptyCard, Rating } from 'ts-fsrs'
import { scenarioSources, scenarioFor, assertScenarios, registerLabels } from '../src/scenarios.ts'
import { db, parseTsv, getTodayPlan, scheduler, cardKey, createBackup, restoreBackup } from '../src/data.ts'

test('all current cards have a short reviewed scenario, English form and register; approved trial remains exact', async () => {
 const notes=parseTsv(await readFile(new URL('../cards.tsv',import.meta.url),'utf8'))
 assertScenarios(notes)
 assert.equal(Object.keys(scenarioSources).length,notes.length)
 for(const n of notes){const s=scenarioFor(n);assert.ok(s);assert.ok(Object.hasOwn(registerLabels,s.register));assert.match(s.form,/^[A-Za-z ·/]+$/);assert.equal(scenarioFor({...n,ja:n.ja+'編集'}),null);assert.equal(scenarioFor({...n,en:n.en+' edited'}),null);assert.equal(scenarioFor({...n,usage:n.usage+'変更'}),null)}
 assert.equal(scenarioFor({card_id:'constructor',ja:'',en:'',usage:''}),null)
 assert.equal(scenarioSources.expr_0267.prompt,'You promised to run an errand, but completely forgot.')
 assert.equal(scenarioSources.expr_0267.form,'Sentence')
 assert.equal(scenarioSources.expr_0268.form,'Verb phrase')
 assert.equal(scenarioSources.expr_0278.form,'Noun')
 const n=notes[0], original=scenarioSources[n.card_id]
 try{scenarioSources[n.card_id]={...original,prompt:'This perception is clear to everyone.'};assert.throws(()=>assertScenarios([n]),/答え/)}finally{scenarioSources[n.card_id]=original}
})

test('new cue resumes productive FSRS track and preserves reverse history, settings and full backup', async () => {
 const notes=parseTsv(await readFile(new URL('../cards.tsv',import.meta.url),'utf8'))
 const n=notes.find(n=>n.card_id==='expr_0267'), old=new Date('2026-11-01T00:00:00Z')
 await db.notes.put(n)
 await db.settings.put({id:'main',mode:'en_to_ja',newLimit:8,totalLimit:40,jaRatio:20})
 for(const direction of ['ja_to_en','en_to_ja']){
  const first=scheduler.next(createEmptyCard(old),old,Rating.Good).card
  const card=scheduler.next(first,new Date(+old+600000),Rating.Good).card
  const cardId=cardKey(n.card_id,direction)
  await db.reviewCards.put({cardId,noteId:n.card_id,direction,fsrsCard:card})
  await db.reviewLogs.add({cardId,noteId:n.card_id,direction,reviewedAt:new Date(+old+600000).toISOString(),rating:Rating.Good,responseTimeMs:500,previousDue:first.due.toISOString(),nextDue:card.due.toISOString()})
 }
 const before=JSON.parse(JSON.stringify(await createBackup()))
 const plan=await getTodayPlan(new Date('2026-11-13T00:00:00Z'))
 assert.equal(plan.candidate.direction,'ja_to_en');assert.equal(plan.candidate.isNew,false);assert.equal(plan.candidate.review.fsrsCard.reps,2);assert.equal(plan.due,1)
 const after=JSON.parse(JSON.stringify(await createBackup()))
 for(const field of ['notes','reviewCards','reviewLogs','settings','suspendedNotes','noteOverrides'])assert.deepEqual(after[field],before[field])
 await restoreBackup(before)
 const restored=JSON.parse(JSON.stringify(await createBackup()))
 assert.deepEqual(restored.reviewCards,before.reviewCards);assert.deepEqual(restored.reviewLogs,before.reviewLogs)
 assert.equal(restored.settings[0].mode,'en_to_ja')
})
