import { Lock } from 'lucide-react'
import { useTaskActions, type TaskInfo } from '../lib/board'
import type { Task } from '../types'

const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap'

/** Pallina disegnata: blu = da me, giallo/oro = nel campo degli altri. */
export function BallIcon({ out, size = 12 }: { out: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 16 16" style={{ width: size / 16 + 'rem', height: size / 16 + 'rem' }} className="shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill={out ? 'var(--ball-out)' : 'var(--ball-me)'} />
      <path d="M2.5 6.5 Q8 9 13.5 6.5 M4 12 Q8 7.5 12 12" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.8" />
    </svg>
  )
}

/** Chip sulla card: compare solo quando la palla non è da me. */
export function BallChip({ info }: { info: TaskInfo }) {
  if (info.ball === 'blocked' && info.blockedBy)
    return <span className={`${chip} bg-surface-2 text-ink-3`} title={`Si sblocca dopo "${info.blockedBy.title}"`}><Lock size={11} />dopo "{info.blockedBy.title.slice(0, 24)}"</span>
  if (info.ball !== 'out') return null
  return (
    <span className={`${chip} bg-ball-out-soft text-ink`} title="La palla è nel campo degli altri: stai aspettando">
      <BallIcon out />agli altri{info.ballDays > 0 ? ` · ${info.ballDays}g` : ''}
    </span>
  )
}

/** Interruttore principale: Da me / Agli altri. */
export function BallToggle({ task, size = 'md' }: { task: Task; size?: 'sm' | 'md' }) {
  const { update } = useTaskActions()
  const btn = (out: boolean, label: string) => {
    const active = task.ball_out === out
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (!active) update(task.id, { ball_out: out }) }}
        className={`inline-flex items-center gap-1.5 rounded-full font-bold transition-all ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}`}
        style={{
          background: active ? (out ? 'var(--ball-out)' : 'var(--ball-me)') : 'transparent',
          color: active ? (out ? 'var(--ball-out-ink)' : '#fff') : 'var(--ink-2)',
        }}
        title={out ? 'Ho passato la palla: sto aspettando gli altri' : 'La palla è da me: tocca a me'}
      >
        {size === 'md' && <BallIcon out={out} size={14} />}{label}
      </button>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-surface-2 p-0.5">
      {btn(false, 'Da me')}
      {btn(true, 'Agli altri')}
    </span>
  )
}

/**
 * Piccola palla cliccabile: blu = da me, giallo/oro = agli altri.
 * Un clic la passa / la riprende.
 */
export function BallDot({ info, size = 18 }: { info: TaskInfo; size?: number }) {
  const { update } = useTaskActions()
  if (info.kind === 'done') return null
  if (info.ball === 'blocked') return <span title="Tappa bloccata: aspetta quella prima"><Lock size={13} className="text-ink-3" /></span>
  if (info.task.parent_id != null) return null
  const holder = info.task
  const out = holder.ball_out
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()
  return (
    <button
      type="button"
      onClick={(e) => { stop(e); update(holder.id, { ball_out: !out }) }}
      onPointerDown={stop}
      className="inline-flex items-center gap-1 rounded-full hover:scale-110 transition-transform text-xs font-bold text-ink-2"
      title={out ? `Palla agli altri${info.ballDays ? ` da ${info.ballDays} gg` : ''} — clic per riprenderla` : 'Palla da me — clic per passarla agli altri'}
      aria-label={out ? 'Riprendi la palla' : 'Passa la palla agli altri'}
    >
      <BallIcon out={out} size={size} />
      {out && info.ballDays > 0 && <span>{info.ballDays}g</span>}
    </button>
  )
}
