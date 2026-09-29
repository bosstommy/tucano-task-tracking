import { describe, expect, it } from 'vitest'
import { quickParse, parseDue, parseEstimate } from './quickParse'
import { computeSchedule } from './schedule'
import { workdaysBackInclusive, subtractWorkdays } from './dates'

// Venerdì 25 settembre 2026
const today = '2026-09-25'

describe('quickParse', () => {
  it('riconosce tutta la sintassi', () => {
    const p = quickParse('Audit fornitore ! ? #qualità @30/10 ~3g', { today })
    expect(p).toMatchObject({
      title: 'Audit fornitore', onFire: true, ballOut: true,
      tags: ['qualità'], due: '2026-10-30', estimateDays: 3, parentQuery: null,
    })
  })
  it('fuoco', () => {
    expect(quickParse('Server giù 🔥', { today })).toMatchObject({ title: 'Server giù', onFire: true })
    expect(quickParse('Server giù !!!', { today })).toMatchObject({ onFire: true })
  })
  it('stima in ore', () => {
    expect(quickParse('Report ~4h', { today })).toMatchObject({ title: 'Report', estimateDays: 0.5 })
  })
  it('sottoattività con >', () => {
    expect(quickParse('Chiamare Rossi @domani > audit', { today })).toMatchObject({
      title: 'Chiamare Rossi', due: '2026-09-26', parentQuery: 'audit',
    })
  })
  it('lascia nel titolo i token non validi', () => {
    expect(quickParse('Email a mario@ditta.it @boh', { today }).title).toBe('Email a mario@ditta.it @boh')
  })
})

describe('parseDue', () => {
  it('date relative e giorni', () => {
    expect(parseDue('oggi', today)).toBe(today)
    expect(parseDue('+3', today)).toBe('2026-09-28')
    expect(parseDue('+2s', today)).toBe('2026-10-09')
    expect(parseDue('lun', today)).toBe('2026-09-28')
    expect(parseDue('ven', today)).toBe('2026-10-02') // prossimo venerdì, non oggi
    expect(parseDue('venerdì', today)).toBe('2026-10-02')
    expect(parseDue('mer', today)).toBe('2026-09-30')
  })
  it('giorno/mese passato va all\'anno dopo', () => {
    expect(parseDue('10/01', today)).toBe('2027-01-10')
    expect(parseDue('30/10/2026', today)).toBe('2026-10-30')
    expect(parseDue('31/13', today)).toBeNull()
  })
  it('stima', () => {
    expect(parseEstimate('2,5g')).toBe(2.5)
    expect(parseEstimate('abc')).toBeNull()
  })
})

describe('giorni lavorativi', () => {
  it('conta all\'indietro saltando il weekend', () => {
    // scadenza lunedì 5/10, 3 giorni di lavoro → si inizia giovedì 1/10
    expect(workdaysBackInclusive('2026-10-05', 3)).toBe('2026-10-01')
    expect(subtractWorkdays('2026-10-05', 1)).toBe('2026-10-02')
  })
})

describe('computeSchedule', () => {
  it('in tempo, lontano', () => {
    expect(computeSchedule({ due_date: '2026-12-01', estimate_days: 3 }, 'todo', 0, { today }).risk).toBe('ok')
  })
  it('da iniziare quando si entra nel preavviso', () => {
    // scadenza 9/10, 5 gg → inizia entro lun 5/10; preavviso 2 → dal 1/10
    const s = computeSchedule({ due_date: '2026-10-09', estimate_days: 5 }, 'todo', 0, { today: '2026-10-01', leadDays: 2 })
    expect(s.latestStart).toBe('2026-10-05')
    expect(s.risk).toBe('start')
  })
  it('in ritardo se non partita oltre inizia-entro', () => {
    expect(computeSchedule({ due_date: '2026-10-09', estimate_days: 5 }, 'todo', 0, { today: '2026-10-06' }).risk).toBe('late')
  })
  it('a rischio se in corso ma non ci sta', () => {
    expect(computeSchedule({ due_date: '2026-09-29', estimate_days: 6 }, 'doing', 0, { today }).risk).toBe('risk')
    expect(computeSchedule({ due_date: '2026-09-29', estimate_days: 6 }, 'doing', 80, { today }).risk).toBe('soon')
  })
  it('scaduta e completata', () => {
    expect(computeSchedule({ due_date: '2026-09-20', estimate_days: null }, 'todo', 0, { today }).risk).toBe('late')
    expect(computeSchedule({ due_date: '2026-09-20', estimate_days: null }, 'done', 100, { today }).risk).toBe('done')
  })
  it('promemoria: avvisa N giorni prima della scadenza', () => {
    const t = { due_date: '2026-11-10', estimate_days: null, remind_days: 10 }
    expect(computeSchedule(t, 'todo', 0, { today: '2026-10-30' }).risk).toBe('ok')
    expect(computeSchedule(t, 'todo', 0, { today: '2026-10-31' }).risk).toBe('start')
    expect(computeSchedule({ ...t, remind_days: null }, 'todo', 0, { today: '2026-10-31' }).risk).toBe('ok')
  })
})
