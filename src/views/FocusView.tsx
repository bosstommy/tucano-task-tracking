import { useMemo } from 'react'
import { Flame, PlayCircle, Lightbulb, CheckCircle2 } from 'lucide-react'
import { useBoard } from '../lib/board'
import { RISK_RANK } from '../lib/schedule'
import { TaskCard } from '../components/TaskCard'
import { Group, EmptyState, cardGrid } from './common'
import type { Task } from '../types'

const greeting = () => {
  const h = new Date().getHours()
  return h < 5 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
}

export function FocusView() {
  const board = useBoard()
  const byStatus = board.settings.groupByStatus

  const s = useMemo(() => {
    const inf = (t: Task) => board.infos.get(t.id)!
    // Le sottoattività sono voci della checklist: le rappresenta la card madre.
    const open = board.visibleTop.filter((t) => inf(t).kind !== 'done')
    const rank = (t: Task) => {
      const i = inf(t)
      const idea = i.kind === 'todo' ? 3 : 0
      return t.on_fire ? 0 : idea + (i.ball === 'out' ? 2 : 1)
    }
    const byRisk = (a: Task, b: Task) => RISK_RANK[inf(a).schedule.risk] - RISK_RANK[inf(b).schedule.risk] || a.position - b.position
    // Prima le rosse in fiamme, poi palla da me, poi palla agli altri (chi aspetta da più tempo per primo); le idee in fondo.
    const order = (a: Task, b: Task) => rank(a) - rank(b)
      || (inf(a).ball === 'out' && inf(b).ball === 'out' ? inf(b).ballDays - inf(a).ballDays : 0)
      || byRisk(a, b)
    const all = [...open].sort(order)
    const fire = all.filter((t) => t.on_fire)
    const backlog = all.filter((t) => !t.on_fire && inf(t).kind === 'todo')
    const doing = all.filter((t) => !t.on_fire && inf(t).kind !== 'todo')
    const done = board.visibleTop.filter((t) => inf(t).kind === 'done')
      .sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))
    const outCount = all.filter((t) => inf(t).ball === 'out').length
    return { all, fire, doing, backlog, done, outCount }
  }, [board])

  if (!board.isLoading && board.tasks.length === 0) {
    return <EmptyState title="Mente libera 🌴" text={<>Detta col microfono in basso o scrivi nella barra in alto e premi <b>Invio</b>. Al resto ci penso io.</>} />
  }

  const grid = (list: Task[]) => (
    <div className={cardGrid}>{list.map((t) => <TaskCard key={t.id} id={t.id} showUnclear />)}</div>
  )
  const openCount = s.all.length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">{greeting()} 👋</h1>
        <p className="text-ink-2 mt-1">
          {board.filtering ? `Filtro attivo: ${openCount} attività.` : openCount === 0
            ? 'Tutto fatto. Goditi la calma.'
            : <>
                {s.fire.length > 0 && <><b className="text-coral">{s.fire.length} in fiamme</b> · </>}
                <b>{openCount - s.outCount}</b> con la palla da te · <b>{s.outCount}</b> nel campo degli altri
              </>}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-bold text-ink-3">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2" style={{ borderColor: 'var(--coral)' }} />in fiamme</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2" style={{ borderColor: 'var(--ball-me)' }} />palla da me</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2" style={{ borderColor: 'var(--ball-out)' }} />palla agli altri</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-dashed" style={{ borderColor: 'var(--ink-3)' }} />idea in backlog</span>
        </p>
      </div>

      {byStatus ? (
        <>
          {s.fire.length > 0 && <Group id="st-fire" title="In fiamme" icon={<Flame size={17} fill="currentColor" />} tone="var(--coral)" count={s.fire.length}>{grid(s.fire)}</Group>}
          {s.doing.length > 0 && <Group id="st-doing" title="In corso" icon={<PlayCircle size={17} />} tone="var(--ball-me)" count={s.doing.length}>{grid(s.doing)}</Group>}
          {s.backlog.length > 0 && <Group id="st-backlog" title="Backlog (idee)" icon={<Lightbulb size={17} />} count={s.backlog.length}>{grid(s.backlog)}</Group>}
        </>
      ) : s.all.length > 0 && <div className="mb-6">{grid(s.all)}</div>}
      {s.done.length > 0 && <Group id="done" title="Completate di recente" icon={<CheckCircle2 size={17} />} tone="var(--leaf)" count={s.done.length} defaultOpen={false}>{grid(s.done)}</Group>}
    </div>
  )
}
