import { useEffect, useMemo, useRef } from 'react'
import { useBoard } from '../lib/board'
import { addDays, diffDays, fromISODate, isWorkday } from '../lib/dates'
import type { Risk } from '../lib/schedule'
import { useUI } from '../ui'
import { FireIcon } from '../components/bits'
import { EmptyState } from './common'
import type { Task } from '../types'

const DAY = 38
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const RISK_COLOR: Record<Risk, string> = {
  none: 'var(--ink-3)', ok: 'var(--teal)', soon: 'var(--yellow)', start: 'var(--accent)',
  risk: 'var(--coral)', late: 'var(--coral)', done: 'var(--leaf)',
}

export function TimelineView() {
  const board = useBoard()
  const { openTask } = useUI()
  const scroller = useRef<HTMLDivElement>(null)
  const today = board.today

  const rows = useMemo(() => {
    const out: { task: Task; depth: number }[] = []
    const hasDates = (t: Task) => !!t.due_date
    for (const t of board.visibleTop) {
      const kids = board.infos.get(t.id)!.children.filter(hasDates)
      if (!hasDates(t) && !kids.length) continue
      out.push({ task: t, depth: 0 })
      for (const k of kids) out.push({ task: k, depth: 1 })
    }
    return out
  }, [board])

  const range = useMemo(() => {
    let start = addDays(today, -7)
    let end = addDays(today, 30)
    for (const { task } of rows) {
      if (task.start_date && task.start_date < start) start = task.start_date
      if (task.due_date && task.due_date > end) end = task.due_date
    }
    start = start < addDays(today, -60) ? addDays(today, -60) : start
    end = addDays(end > addDays(today, 180) ? addDays(today, 180) : end, 5)
    const days: string[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
    return { start, days }
  }, [rows, today])

  useEffect(() => {
    scroller.current?.scrollTo({ left: Math.max(0, (diffDays(range.start, today) - 3) * DAY) })
  }, [range.start, today])

  if (!rows.length) return <EmptyState title="Nessuna scadenza" text="La timeline mostra le attività con una scadenza. Aggiungine una con @data nella barra rapida." />

  const x = (d: string) => diffDays(range.start, d) * DAY
  const noDue = board.visibleTop.filter((t) => !t.due_date && board.infos.get(t.id)!.kind !== 'done').length

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h1 className="text-2xl font-bold">Timeline</h1>
        <span className="text-sm text-ink-3">barra = inizio → scadenza · ▲ = inizia entro{noDue ? ` · ${noDue} attività senza scadenza non mostrate` : ''}</span>
      </div>
      <div className="card overflow-hidden flex">
        {/* Colonna titoli */}
        <div className="w-56 shrink-0 border-r border-line bg-surface z-10">
          <div className="h-14 border-b border-line" />
          {rows.map(({ task, depth }) => {
            const done = board.infos.get(task.id)!.kind === 'done'
            return (
              <button
                key={task.id}
                onClick={() => openTask(task.id)}
                className={`h-10 w-full flex items-center gap-1.5 px-3 text-left text-sm hover:bg-surface-2 border-b border-line/50
                  ${depth ? 'pl-7 text-ink-2 font-semibold' : 'font-bold'} ${done ? 'line-through text-ink-3' : ''}`}
              >
                {task.on_fire && !done && <FireIcon size={12} animate={false} />}
                <span className="truncate">{task.title}</span>
              </button>
            )
          })}
        </div>

        {/* Griglia giorni */}
        <div ref={scroller} className="overflow-x-auto flex-1">
          <div style={{ width: range.days.length * DAY }} className="relative">
            <div className="h-14 border-b border-line flex relative">
              {range.days.map((d) => {
                const dt = fromISODate(d)
                const first = dt.getDate() === 1 || d === range.start
                return (
                  <div key={d} style={{ width: DAY }} className={`shrink-0 relative text-center ${isWorkday(d) ? '' : 'bg-surface-2/60'}`}>
                    {first && <span className="absolute left-1 top-1 text-[0.78rem] font-bold text-ink-2 whitespace-nowrap">{MONTHS[dt.getMonth()]}</span>}
                    <span className={`absolute bottom-1.5 inset-x-0 text-[0.78rem] font-bold ${d === today ? 'text-accent' : 'text-ink-3'}`}>{dt.getDate()}</span>
                  </div>
                )
              })}
            </div>

            {/* Weekend e oggi */}
            <div className="absolute top-14 bottom-0 left-0 right-0 flex pointer-events-none">
              {range.days.map((d) => <div key={d} style={{ width: DAY }} className={`shrink-0 ${isWorkday(d) ? '' : 'bg-surface-2/60'}`} />)}
            </div>
            <div className="absolute top-10 bottom-0 w-0.5 bg-accent/70 pointer-events-none z-[1]" style={{ left: x(today) + DAY / 2 }} />

            {rows.map(({ task, depth }) => {
              const info = board.infos.get(task.id)!
              const due = task.due_date!
              const start = task.start_date && task.start_date <= due ? task.start_date : info.schedule.latestStart ?? due
              const color = RISK_COLOR[info.schedule.risk]
              const left = x(start)
              const width = (diffDays(start, due) + 1) * DAY
              return (
                <div key={task.id} className="h-10 relative border-b border-line/50">
                  <button
                    onClick={() => openTask(task.id)}
                    title={`${task.title}\n${start} → ${due}`}
                    className="absolute top-2 h-6 rounded-full overflow-hidden transition-transform hover:scale-y-110"
                    style={{
                      left: left + 2, width: width - 4,
                      background: `color-mix(in srgb, ${color} ${depth ? 22 : 30}%, transparent)`,
                      border: `1.5px solid ${color}`,
                    }}
                  >
                    <span className="absolute inset-y-0 left-0" style={{ width: `${info.progress}%`, background: color, opacity: 0.55 }} />
                  </button>
                  {info.schedule.latestStart && task.estimate_days && info.kind !== 'done' && (
                    <span
                      className="absolute bottom-0 text-[0.72rem] leading-none -translate-x-1/2"
                      style={{ left: x(info.schedule.latestStart) + DAY / 2, color }}
                      title={`Inizia entro ${info.schedule.latestStart}`}
                    >▲</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
