import type { Status, StatusKind, Task } from '../types'
import { diffDays, subtractWorkdays, todayISO, workdaysBackInclusive, workdaysBetweenInclusive } from './dates'

/**
 * none  — nessuna scadenza
 * ok    — in tempo
 * soon  — scadenza entro 7 giorni
 * start — è il momento di iniziare (raggiunto il preavviso su "inizia entro" o il promemoria)
 * risk  — già iniziata ma il lavoro residuo non ci sta più
 * late  — scadenza passata, oppure "inizia entro" superato senza essere partita
 * done  — completata
 */
export type Risk = 'none' | 'ok' | 'soon' | 'start' | 'risk' | 'late' | 'done'

export interface ScheduleInfo {
  risk: Risk
  /** Ultimo giorno utile per iniziare e finire in tempo. */
  latestStart: string | null
  /** Giorni di calendario alla scadenza (negativi = scaduta). */
  daysLeft: number | null
}

export function computeSchedule(
  task: Pick<Task, 'due_date' | 'estimate_days'> & { remind_days?: number | null },
  kind: StatusKind,
  progress: number,
  opts: { today?: string; leadDays?: number } = {},
): ScheduleInfo {
  const today = opts.today ?? todayISO()
  const leadDays = opts.leadDays ?? 2
  if (!task.due_date) return { risk: kind === 'done' ? 'done' : 'none', latestStart: null, daysLeft: null }

  const due = task.due_date
  const est = task.estimate_days ?? 0
  const latestStart = est > 0 ? workdaysBackInclusive(due, Math.ceil(est)) : due
  const daysLeft = diffDays(today, due)
  if (kind === 'done') return { risk: 'done', latestStart, daysLeft }
  if (today > due) return { risk: 'late', latestStart, daysLeft }

  const started = kind === 'doing' || kind === 'waiting'
  let risk: Risk
  if (!started) {
    if (est > 0 && today > latestStart) risk = 'late'
    else if (est > 0 && today >= subtractWorkdays(latestStart, leadDays)) risk = 'start'
    else risk = daysLeft <= 7 ? 'soon' : 'ok'
  } else {
    const remaining = Math.ceil(est * (1 - progress / 100))
    risk = remaining > workdaysBetweenInclusive(today, due) ? 'risk' : daysLeft <= 7 ? 'soon' : 'ok'
  }
  // Promemoria personale: "avvisami N giorni prima della scadenza".
  if (task.remind_days && daysLeft <= task.remind_days && (risk === 'ok' || risk === 'soon')) risk = 'start'
  return { risk, latestStart, daysLeft }
}

/** Avanzamento 0–100: dalle sottoattività se presenti, altrimenti dallo stato. */
export function computeProgress(task: Task, children: Task[], statusById: Map<number, Status>): number {
  if (children.length) {
    const done = children.filter((c) => statusById.get(c.status_id)?.kind === 'done').length
    return Math.round((done / children.length) * 100)
  }
  const kind = statusById.get(task.status_id)?.kind
  return kind === 'done' ? 100 : kind === 'doing' || kind === 'waiting' ? 50 : 0
}

export const RISK_RANK: Record<Risk, number> = { late: 0, risk: 1, start: 2, soon: 3, ok: 4, none: 5, done: 6 }
