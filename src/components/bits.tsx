import { Check, Flame, CalendarClock, AlertTriangle, Play, Clock, BellRing } from 'lucide-react'
import type { Status, Tag } from '../types'
import { humanDate } from '../lib/dates'
import type { ScheduleInfo } from '../lib/schedule'

/** px di progetto → rem, così tutto segue la dimensione del testo scelta. */
export const rem = (px: number) => `${px / 16}rem`

export function ProgressRing({ value, size = 22, stroke = 3 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = value >= 100 ? 'var(--leaf)' : value > 0 ? 'var(--teal)' : 'var(--border)'
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-2" title={`Avanzamento ${value}%`}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: rem(size), height: rem(size) }} className="-rotate-90 shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      {value}%
    </span>
  )
}

export const FireIcon = ({ size = 15, animate = true }: { size?: number; animate?: boolean }) => (
  <span className={animate ? 'animate-flicker' : ''} title="In fiamme" style={{ color: 'var(--coral)' }}>
    <Flame size={size} fill="currentColor" strokeWidth={2} />
  </span>
)

export function DueChip({ s, due }: { s: ScheduleInfo; due: string | null }) {
  if (!due) return null
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap'
  switch (s.risk) {
    case 'late':
      return s.daysLeft != null && s.daysLeft < 0
        ? <span className={`${base} bg-coral-soft text-coral`} title={`Scadenza ${due}`}><AlertTriangle size={12} />scaduta {humanDate(due)}</span>
        : <span className={`${base} bg-coral-soft text-coral`} title={`Scadenza ${due}`}><AlertTriangle size={12} />dovevi iniziare {humanDate(s.latestStart!)}</span>
    case 'risk':
      return <span className={`${base} bg-coral-soft text-coral`} title="Il lavoro stimato rimasto non ci sta più prima della scadenza"><AlertTriangle size={12} />a rischio · {humanDate(due)}</span>
    case 'start':
      if (s.latestStart === due) return <span className={`${base} bg-accent-soft text-accent`} title="Promemoria: la scadenza si avvicina"><BellRing size={12} />scade {humanDate(due)}</span>
      return <span className={`${base} bg-accent-soft text-accent`} title={`Scadenza ${humanDate(due)}`}><Play size={11} fill="currentColor" />inizia entro {humanDate(s.latestStart!)}</span>
    case 'soon':
      return <span className={`${base} bg-yellow-soft text-ink`}><CalendarClock size={12} className="text-yellow" />{humanDate(due)}</span>
    case 'done':
      return <span className={`${base} bg-leaf-soft text-leaf`}><Check size={12} />{humanDate(due)}</span>
    default:
      return <span className={`${base} bg-surface-2 text-ink-2`}><CalendarClock size={12} />{humanDate(due)}</span>
  }
}

export function StatusPill({ status, small }: { status?: Status; small?: boolean }) {
  if (!status) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap ${small ? 'text-[0.78rem] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
      style={{ background: `color-mix(in srgb, ${status.color} 16%, transparent)`, color: `color-mix(in srgb, ${status.color} 75%, var(--ink))` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
      {status.name}
    </span>
  )
}

export function TagChip({ tag, onClick, active }: { tag: Tag; onClick?: () => void; active?: boolean }) {
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.78rem] font-bold ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: `color-mix(in srgb, ${tag.color} ${active ? 30 : 14}%, transparent)`,
        color: `color-mix(in srgb, ${tag.color} 70%, var(--ink))`,
        outline: active ? `1.5px solid ${tag.color}` : undefined,
      }}
    >
      #{tag.name}
    </span>
  )
}

export function EstimateChip({ days }: { days: number | null }) {
  if (!days) return null
  const label = days < 1 ? `${Math.round(days * 8)}h` : `${days}g`
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-3" title="Stima di lavoro"><Clock size={12} />{label}</span>
}

/** Cerchio di completamento, grande area cliccabile. */
export function DoneCircle({ done, onToggle, size = 20, color }: { done: boolean; onToggle: () => void; size?: number; color?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      title={done ? 'Riapri' : 'Segna come fatta'}
      className="group/done shrink-0 grid place-items-center rounded-full transition-all"
      style={{
        width: rem(size), height: rem(size),
        border: `2px solid ${done ? 'var(--leaf)' : color ?? 'var(--ink-3)'}`,
        background: done ? 'var(--leaf)' : 'transparent',
      }}
    >
      <Check style={{ width: rem(size * 0.62), height: rem(size * 0.62) }} strokeWidth={3.5} className={done ? 'text-white' : 'text-leaf opacity-0 group-hover/done:opacity-100'} />
    </button>
  )
}

/** Interruttore "in fiamme": l'unica priorità esplicita. */
export function FireToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      title={on ? 'Togli "in fiamme"' : 'Segna come in fiamme (urgentissima)'}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold transition-all"
      style={{ background: on ? 'var(--coral-soft)' : 'var(--surface-2)', color: on ? 'var(--coral)' : 'var(--ink-2)' }}
    >
      <Flame size={15} fill={on ? 'currentColor' : 'none'} />In fiamme
    </button>
  )
}
