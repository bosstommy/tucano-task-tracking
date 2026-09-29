import { subtractWorkdays, workdaysBackInclusive } from './dates'

export interface StepPlanInput {
  id: number
  due_date: string | null
  estimate_days: number | null
  done: boolean
}

export interface StepPlan {
  /** Entro quando la tappa deve essere finita perché il flusso rispetti la scadenza. */
  deadline: string
  /** Ultimo giorno utile per iniziarla. */
  latestStart: string
}

/**
 * Pianificazione a ritroso: parte dalla scadenza del flusso e risale le tappe aperte.
 * Ogni tappa deve finire il giorno lavorativo prima che inizi la successiva;
 * una data di scadenza messa a mano sulla tappa vince sul calcolo.
 */
export function planFlow(steps: StepPlanInput[], flowDue: string | null): Map<number, StepPlan> {
  const out = new Map<number, StepPlan>()
  if (!flowDue) return out
  let nextStart: string | null = null
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i]
    if (s.done) continue
    const deadline: string = s.due_date ?? (nextStart ? subtractWorkdays(nextStart, 1) : flowDue)
    const est = Math.ceil(s.estimate_days ?? 0)
    const latestStart: string = est > 0 ? workdaysBackInclusive(deadline, est) : deadline
    out.set(s.id, { deadline, latestStart })
    nextStart = latestStart
  }
  return out
}
