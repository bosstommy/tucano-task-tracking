import { useState } from 'react'
import { CornerDownRight, MessageSquareText, CalendarRange, ChevronRight, Plus, Workflow, HelpCircle, Lock } from 'lucide-react'
import { BallChip, BallDot } from './Ball'
import { useCreateTask } from '../api/hooks'
import { useBoard, useTaskActions } from '../lib/board'
import { useUI } from '../ui'
import { humanDate } from '../lib/dates'
import { DoneCircle, DueChip, EstimateChip, FireIcon, ProgressRing, StatusPill, TagChip } from './bits'

interface Props {
  id: number
  showParent?: boolean
  hideStatus?: boolean
  className?: string
  style?: React.CSSProperties
  dragProps?: Record<string, unknown>
  innerRef?: (el: HTMLElement | null) => void
  /** Mostra il motivo per cui l'attività è ambigua. */
  showUnclear?: boolean
}

export function TaskCard({ id, showParent, hideStatus, className = '', style, dragProps, innerRef, showUnclear }: Props) {
  const board = useBoard()
  const { openTask, selectedId, expandOverrides, setExpanded } = useUI()
  const { toggleDone } = useTaskActions()
  const info = board.infos.get(id)
  if (!info) return null
  const canExpand = info.task.parent_id == null
  const expanded = canExpand && (expandOverrides.get(id) ?? (board.settings.expandSubtasks && info.children.length > 0))
  const { task, kind, children, parent, progress, schedule, status } = info
  const f = board.settings.cardFields
  const done = kind === 'done'
  const selected = selectedId === id
  const backlog = kind === 'todo'
  // Bordo: rosso = in fiamme, blu = palla da me, giallo/oro = palla agli altri. Tratteggiato = idea in backlog.
  const edge = done || info.ball === 'blocked' ? undefined
    : task.on_fire ? 'var(--coral)' : info.ball === 'out' ? 'var(--ball-out)' : 'var(--ball-me)'

  return (
    <div
      ref={innerRef}
      style={edge ? { ...style, borderColor: edge, borderWidth: 2, borderStyle: backlog ? 'dashed' : 'solid' } : style}
      {...dragProps}
      onClick={() => openTask(id)}
      className={`card group relative px-3.5 py-3 cursor-pointer transition-all hover:-translate-y-px hover:shadow-pop
        ${selected ? 'ring-2 ring-accent/60' : ''} ${done ? 'opacity-60' : ''} ${className}`}
    >
      {task.on_fire && !done && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-coral" />}
      <div className="flex gap-3">
      <div className="pt-0.5"><DoneCircle done={done} onToggle={() => toggleDone(task)} color={status?.color} /></div>

      <div className="min-w-0 flex-1">
        {showParent && parent && (
          <div className="flex items-center gap-1 text-[0.78rem] font-semibold text-ink-3 mb-0.5 truncate">
            <CornerDownRight size={11} />{parent.title}
          </div>
        )}
        <div className={`font-semibold leading-snug line-clamp-2 ${done ? 'line-through text-ink-3' : ''}`}>
          {task.is_flow && <Workflow size={14} className="inline -mt-0.5 mr-1 text-teal" />}
          {task.title}
        </div>
        {task.is_flow && info.currentStep && !done && (
          <div className="text-sm text-ink-2 mt-0.5 truncate" title="Tappa corrente">
            <span className="font-bold text-teal">{info.stepIndex}/{children.length}</span> {info.currentStep.title}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-1.5 empty:hidden">
          {f.fire && task.on_fire && !done && <FireIcon size={14} />}
          {info.ball === 'blocked' ? <BallChip info={info} /> : <BallDot info={info} />}
          {f.status && !hideStatus && backlog && <StatusPill status={status} small />}
          {f.progress && children.length > 0 && <ProgressRing value={progress} size={18} stroke={2.5} />}
          {f.due && <DueChip s={schedule} due={task.due_date ?? info.plan?.deadline ?? null} />}
          {f.estimate && <EstimateChip days={task.estimate_days} />}
          {f.dates && task.start_date && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-3" title="Inizio → fine">
              <CalendarRange size={12} />{humanDate(task.start_date)}{task.end_date ? ` → ${humanDate(task.end_date)}` : ''}
            </span>
          )}
          {f.notes && task.note_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink-3" title={`${task.note_count} note`}>
              <MessageSquareText size={12} />{task.note_count}
            </span>
          )}
          {f.tags && task.tag_ids.map((tid) => board.tagById.get(tid)).filter(Boolean).map((t) => <TagChip key={t!.id} tag={t!} />)}
          {canExpand && children.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(id, !expanded) }}
              onPointerDown={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-ink-2 bg-surface-2 hover:bg-teal-soft hover:text-ink"
              title={expanded ? 'Nascondi sottoattività' : 'Mostra sottoattività'}
            >
              <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
              {children.filter((c) => board.infos.get(c.id)?.kind === 'done').length}/{children.length} {task.is_flow ? 'tappe' : 'sottoattività'}
            </button>
          )}
        </div>
        {showUnclear && info.unclear && (
          <div className="mt-1.5 flex items-center gap-1 text-sm italic text-ink-2"><HelpCircle size={13} className="text-yellow" />{info.unclear}</div>
        )}
      </div>
      {canExpand && children.length === 0 && !expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(id, true) }}
          onPointerDown={(e) => e.stopPropagation()}
          className="self-start opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink p-0.5 rounded"
          title="Aggiungi sottoattività"
        >
          <Plus size={16} />
        </button>
      )}
      </div>
      {expanded && <SubtaskInline parentId={id} />}
    </div>
  )
}

/** Checklist dentro la card, con aggiunta rapida. */
function SubtaskInline({ parentId }: { parentId: number }) {
  const board = useBoard()
  const { toggleDone } = useTaskActions()
  const create = useCreateTask()
  const [text, setText] = useState('')
  const parentInfo = board.infos.get(parentId)
  const children = parentInfo?.children ?? []
  const isFlow = !!parentInfo?.task.is_flow

  const add = () => {
    const title = text.trim()
    if (!title) return
    create.mutate({ title, parent_id: parentId })
    setText('')
  }

  return (
    <div className="mt-2.5 ml-8 border-l-2 border-line pl-3 space-y-0.5" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      {children.map((c, i) => {
        const ci = board.infos.get(c.id)!
        const done = ci.kind === 'done'
        const blocked = ci.ball === 'blocked'
        return (
          <div key={c.id} className={`flex items-center gap-2 rounded-lg px-1.5 py-1 -mx-1.5 ${blocked ? 'opacity-55' : ''}`}>
            {isFlow && <span className="text-xs font-bold text-ink-3 w-4 text-right">{i + 1}</span>}
            {blocked ? <Lock size={14} className="text-ink-3 mx-px" /> : <DoneCircle done={done} onToggle={() => toggleDone(c)} size={16} />}
            <span className={`flex-1 min-w-0 truncate text-sm ${done ? 'line-through text-ink-3' : ''}`}>{c.title}</span>
          </div>
        )
      })}
      <div className="flex items-center gap-2 pt-0.5">
        <Plus size={14} className="text-ink-3 shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={isFlow ? 'Aggiungi tappa…' : 'Aggiungi voce…'}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm py-0.5 placeholder:text-ink-3"
        />
      </div>
    </div>
  )
}
