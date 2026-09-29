import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'
import { useSettings, useStatuses, useTags, useTasks, useUpdateTask, useDeleteTask, useRestoreTask } from '../api/hooks'
import { useUI } from '../ui'
import type { Status, StatusKind, Tag, Task, TaskPatch } from '../types'
import { addDays, diffDays, todayISO } from './dates'
import { computeProgress, computeSchedule, type ScheduleInfo } from './schedule'
import { planFlow, type StepPlan } from './flow'

/** Dov'è la palla: da me, nel campo degli altri, ferma (tappa bloccata) o partita chiusa. */
export type Ball = 'me' | 'out' | 'blocked' | 'done'

export interface TaskInfo {
  task: Task
  status: Status | undefined
  kind: StatusKind
  children: Task[]
  parent: Task | undefined
  progress: number
  schedule: ScheduleInfo
  archived: boolean
  ball: Ball
  /** Giorni da quando la palla è nel campo degli altri. */
  ballDays: number
  /** Flusso: tappa corrente e numero (1-based). */
  currentStep: Task | undefined
  stepIndex: number
  /** Tappa: la tappa precedente ancora aperta che la blocca. */
  blockedBy: Task | undefined
  /** Tappa: pianificazione a ritroso. */
  plan: StepPlan | undefined
  /** Motivo per cui l'attività è ambigua ("Da chiarire"), se lo è. */
  unclear: string | null
}

/** Modello derivato unico, calcolato una volta: tutte le viste leggono da qui. */
function useBoardModel() {
  const { data: tasks = [], isLoading } = useTasks()
  const { data: statuses = [] } = useStatuses()
  const { data: tags = [] } = useTags()
  const settings = useSettings()
  const { search, tagFilter } = useUI()

  return useMemo(() => {
    const today = todayISO()
    const statusById = new Map(statuses.map((s) => [s.id, s]))
    const tagById = new Map<number, Tag>(tags.map((t) => [t.id, t]))
    const byId = new Map(tasks.map((t) => [t.id, t]))
    const kids = new Map<number, Task[]>()
    for (const t of tasks) {
      if (t.parent_id != null) {
        if (!kids.has(t.parent_id)) kids.set(t.parent_id, [])
        kids.get(t.parent_id)!.push(t)
      }
    }
    for (const list of kids.values()) list.sort((a, b) => a.position - b.position)
    const archiveBefore = settings.hideDoneAfterDays > 0 ? addDays(today, -settings.hideDoneAfterDays) : null
    const kindOf = (t: Task) => statusById.get(t.status_id)?.kind ?? 'todo'

    // Piani dei flussi e tappe correnti
    const plans = new Map<number, StepPlan>()
    const currentOf = new Map<number, Task | undefined>()
    for (const t of tasks) {
      if (!t.is_flow) continue
      const steps = kids.get(t.id) ?? []
      currentOf.set(t.id, steps.find((s) => kindOf(s) !== 'done'))
      const plan = planFlow(steps.map((s) => ({ id: s.id, due_date: s.due_date, estimate_days: s.estimate_days, done: kindOf(s) === 'done' })), t.due_date)
      for (const [id, p] of plan) plans.set(id, p)
    }

    const infos = new Map<number, TaskInfo>()
    for (const t of tasks) {
      const status = statusById.get(t.status_id)
      const kind = status?.kind ?? 'todo'
      const children = kids.get(t.id) ?? []
      const progress = computeProgress(t, children, statusById)
      const parent = t.parent_id != null ? byId.get(t.parent_id) : undefined
      const plan = plans.get(t.id)

      const currentStep = t.is_flow ? currentOf.get(t.id) : undefined
      let blockedBy: Task | undefined
      if (parent?.is_flow && kind !== 'done') {
        const cur = currentOf.get(parent.id)
        if (cur && cur.id !== t.id) blockedBy = cur
      }
      // La palla è solo della card madre: le sottoattività sono voci spuntabili.
      const holder = t
      const out = parent ? false : t.ball_out
      const ball: Ball = kind === 'done' ? 'done' : blockedBy ? 'blocked' : out ? 'out' : 'me'

      let unclear: string | null = null
      if (kind !== 'done') {
        if (t.is_flow && !currentStep && children.length) unclear = 'Tutte le tappe sono fatte: chiudi il flusso?'
        else if (t.is_flow && !children.length) unclear = 'Flusso senza tappe: aggiungi il primo passo.'
        else if (!t.is_flow && children.length && progress === 100) unclear = 'Sottoattività tutte fatte: chiudi o aggiungi un passo?'
      }

      infos.set(t.id, {
        task: t, status, kind, children, parent, progress,
        schedule: computeSchedule(plan && !t.due_date ? { ...t, due_date: plan.deadline } : t, kind, progress, { today, leadDays: settings.leadDays }),
        archived: kind === 'done' && !!archiveBefore && !!t.end_date && t.end_date < archiveBefore,
        ball, ballDays: out && holder.ball_since ? Math.max(0, diffDays(holder.ball_since, today)) : 0,
        currentStep, stepIndex: currentStep ? children.indexOf(currentStep) + 1 : 0,
        blockedBy, plan, unclear,
      })
    }

    const q = search.trim().toLowerCase()
    const selfMatches = (t: Task) =>
      (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) &&
      (tagFilter == null || t.tag_ids.includes(tagFilter))
    const matches = (t: Task): boolean => selfMatches(t) || (kids.get(t.id) ?? []).some(selfMatches)

    const top = tasks.filter((t) => t.parent_id == null).sort((a, b) => a.position - b.position)
    const visibleTop = top.filter((t) => !infos.get(t.id)!.archived && matches(t))

    return {
      isLoading, tasks, statuses, tags, settings, today,
      statusById, tagById, byId, infos, top, visibleTop, matches, selfMatches,
      info: (id: number) => infos.get(id)!,
      firstStatusOf: (kind: StatusKind) => statuses.find((s) => s.kind === kind) ?? statuses[0],
      filtering: !!q || tagFilter != null,
    }
  }, [tasks, statuses, tags, settings, search, tagFilter, isLoading])
}

export type Board = ReturnType<typeof useBoardModel>

const BoardCtx = createContext<Board>(null!)
export const useBoard = () => useContext(BoardCtx)
export function BoardProvider({ children }: { children: ReactNode }) {
  return createElement(BoardCtx.Provider, { value: useBoardModel() }, children)
}

/** Azioni comuni con conferme e annulla. */
export function useTaskActions() {
  const board = useBoard()
  const update = useUpdateTask()
  const del = useDeleteTask()
  const restore = useRestoreTask()
  const { confirm, toast, closeTask, selectedId } = useUI()

  const setStatus = async (task: Task, statusId: number, extra: TaskPatch = {}) => {
    const target = board.statusById.get(statusId)
    const openKids = (board.infos.get(task.id)?.children ?? []).filter((c) => board.statusById.get(c.status_id)?.kind !== 'done')
    let cascade = false
    if (target?.kind === 'done' && openKids.length) {
      cascade = await confirm(
        `Ci sono ${openKids.length} sottoattività aperte. Le chiudo tutte insieme?`,
        { ok: 'Sì, chiudi tutto', cancel: 'Solo questa' },
      )
    }
    update.mutate({ id: task.id, patch: { ...extra, status_id: statusId, cascade_done: cascade || undefined } })
  }

  const toggleDone = (task: Task) => {
    const kind = board.statusById.get(task.status_id)?.kind
    const target = kind === 'done' ? board.firstStatusOf('doing') : board.firstStatusOf('done')
    if (target) setStatus(task, target.id)
  }

  const remove = (task: Task) => {
    if (selectedId === task.id) closeTask()
    del.mutate(task.id)
    toast(`"${task.title.slice(0, 40)}" eliminata`, { label: 'Annulla', run: () => restore.mutate(task.id) })
  }

  return {
    update: (id: number, patch: Parameters<typeof update.mutate>[0]['patch']) => update.mutate({ id, patch }),
    setStatus, toggleDone, remove,
  }
}
