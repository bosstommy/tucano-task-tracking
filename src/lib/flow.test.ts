import { describe, expect, it } from 'vitest'
import { planFlow } from './flow'
import { quickParse } from './quickParse'
import { voiceToQuick } from './voice'

const today = '2026-09-25' // venerdì

describe('planFlow', () => {
  it('pianifica a ritroso saltando weekend e tappe chiuse', () => {
    // scadenza ven 30/10
    const plan = planFlow([
      { id: 1, due_date: null, estimate_days: null, done: true },
      { id: 2, due_date: null, estimate_days: null, done: false }, // commerciale
      { id: 3, due_date: null, estimate_days: 1, done: false },    // pesi
      { id: 4, due_date: null, estimate_days: 1, done: false },    // documenti
      { id: 5, due_date: null, estimate_days: null, done: false }, // invio
    ], '2026-10-30')
    expect(plan.get(5)).toEqual({ deadline: '2026-10-30', latestStart: '2026-10-30' })
    expect(plan.get(4)).toEqual({ deadline: '2026-10-29', latestStart: '2026-10-29' })
    expect(plan.get(3)).toEqual({ deadline: '2026-10-28', latestStart: '2026-10-28' })
    expect(plan.get(2)?.deadline).toBe('2026-10-27')
    expect(plan.has(1)).toBe(false)
  })
  it('una scadenza manuale della tappa vince', () => {
    const plan = planFlow([
      { id: 1, due_date: null, estimate_days: 2, done: false },
      { id: 2, due_date: '2026-10-12', estimate_days: 1, done: false },
    ], '2026-10-30')
    expect(plan.get(2)?.deadline).toBe('2026-10-12')
    expect(plan.get(1)).toEqual({ deadline: '2026-10-09', latestStart: '2026-10-08' })
  })
  it('senza scadenza del flusso non pianifica', () => {
    expect(planFlow([{ id: 1, due_date: null, estimate_days: 1, done: false }], null).size).toBe(0)
  })
})

describe('palla nella barra rapida', () => {
  it('? passa la palla agli altri', () => {
    expect(quickParse('Valutazione prodotti ? @6/10', { today })).toMatchObject({ title: 'Valutazione prodotti', ballOut: true, due: '2026-10-06' })
    expect(quickParse('Perché? capire', { today })).toMatchObject({ title: 'Perché? capire', ballOut: false })
  })
})

describe('dettatura', () => {
  const p = (s: string) => quickParse(voiceToQuick(s), { today })
  it('priorità, scadenza, stima e tag', () => {
    expect(p('chiamare Rossi urgente entro venerdì')).toMatchObject({ title: 'Chiamare Rossi', onFire: true, due: '2026-10-02' })
    expect(p('preparare offerta per il 30 ottobre ci vogliono 2 giorni tag qualità')).toMatchObject({
      title: 'Preparare offerta', due: '2026-10-30', estimateDays: 2, tags: ['qualità'],
    })
    expect(p('server bloccato urgentissimo')).toMatchObject({ onFire: true })
    expect(p('rinnovo contratto scadenza tra 2 settimane')).toMatchObject({ due: '2026-10-09' })
  })
  it('palla agli altri', () => {
    expect(p('valutazione prodotti aspetto risposta da commerciale')).toMatchObject({ title: 'Valutazione prodotti · commerciale', ballOut: true })
    expect(p('offerta Bianchi palla agli altri')).toMatchObject({ title: 'Offerta Bianchi', ballOut: true })
  })
  it('sottoattività', () => {
    expect(p('richiedere certificati sotto audit fornitore')).toMatchObject({ title: 'Richiedere certificati', parentQuery: 'audit fornitore' })
  })
  it('non tocca frasi normali', () => {
    expect(p('per favore ordinare toner').title).toBe('Per favore ordinare toner')
  })
})
