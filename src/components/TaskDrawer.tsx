import { useEffect, useState } from 'react'
import { X, Trash2, CornerLeftUp, Plus, Flame, Lightbulb, Play, CalendarDays, ListChecks, Info, Lock, ArrowUp, ArrowDown, Workflow, BookmarkPlus, History, BellRing } from 'lucide-react'
import { BallToggle } from './Ball'
import { useTemplateMutations } from '../api/hooks'
import { useBoard, useTaskActions, type TaskInfo } from '../lib/board'
import { useCreateTask } from '../api/hooks'
import { useUI } from '../ui'
import { humanDate } from '../lib/dates'
import { DoneCircle, DueChip, FireIcon, TagChip } from './bits'
import { NotesPanel, AutoTextarea } from './NotesPanel'
import type { Tag } from '../types'

export function TaskDrawer() {
  const { selectedId, closeTask } = useUI()
  const board = useBoard()
  const info = selectedId != null ? board.infos.get(selectedId) : undefined

  useEffect(() => {
    if (selectedId != null && !info && !board.isLoading) closeTask()
  }, [selectedId, info, board.isLoading, closeTask])

  if (!info) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10 animate-fade lg:hidden" onClick={closeTask} />
      <aside
        key={info.task.id}
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[34rem] bg-surface border-l border-line shadow-pop animate-slide flex flex-col"
      >
        <DrawerBody id={info.task.id} />
      </aside>
    </>
  )
}

function Section({ icon, title, children, right }: { icon: React.ReactNode; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="py-4 border-t border-line first:border-t-0">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-3 mb-3">
        {icon}{title}<span className="flex-1" />{right}
      </h3>
      {children}
    </section>
  )
}

function DrawerBody({ id }: { id: number }) {
  const board = useBoard()
  const { closeTask, openTask } = useUI()
  const { update, toggleDone, remove } = useTaskActions()
  const info = board.info(id)
  const { task, kind, children, parent, progress, schedule } = info
  const [title, setTitle] = useState(task.title)
  const [desc, setDesc] = useState(task.description)
  const isSub = task.parent_id != null
  const hasPlanning = !!(task.due_date || task.remind_days)
  const [planOpen, setPlanOpen] = useState(!isSub || hasPlanning)

  useEffect(() => { setTitle(task.title); setDesc(task.description) }, [task.title, task.description])

  const saveTitle = () => { const t = title.trim(); if (t && t !== task.title) update(id, { title: t }); else setTitle(task.title) }

  return (
    <>
      <header className="flex items-center gap-2 px-5 pt-4 pb-2">
        {parent ? (
          <button onClick={() => openTask(parent.id)} className="btn btn-ghost !px-2 text-sm min-w-0" title="Torna all'attività">
            <CornerLeftUp size={15} /><span className="truncate max-w-[16rem]">{parent.title}</span>
          </button>
        ) : <span className="text-xs font-bold uppercase tracking-wider text-ink-3">Attività</span>}
        <span className="flex-1" />
        <button onClick={() => remove(task)} className="btn btn-ghost !p-2 hover:!text-coral" title="Elimina"><Trash2 size={17} /></button>
        <button onClick={closeTask} className="btn btn-ghost !p-2" title="Chiudi (Esc)"><X size={19} /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <div className="flex items-start gap-3 pt-1 pb-3">
          <div className="pt-1.5"><DoneCircle done={kind === 'done'} onToggle={() => toggleDone(task)} size={24} /></div>
          <AutoTextarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
            className={`flex-1 bg-transparent outline-none resize-none text-xl font-bold leading-snug rounded-lg px-1 -mx-1 hover:bg-surface-2 focus:bg-surface-2 ${kind === 'done' ? 'line-through text-ink-3' : ''}`}
          />
          {task.on_fire && kind !== 'done' && <div className="pt-1.5"><FireIcon size={20} /></div>}
        </div>

        {parent?.is_flow && (
          <div className="flex items-center gap-2 text-sm text-ink-2 pb-3">
            <Workflow size={15} className="text-teal" />
            Tappa {board.info(parent.id).children.indexOf(task) + 1} di {board.info(parent.id).children.length} di «{parent.title}»
          </div>
        )}

        {kind !== 'done' && <div className="pb-4"><DrawerBall info={info} /></div>}

        {kind !== 'done' && !isSub && <div className="pb-4"><StateSelector info={info} /></div>}

        <Section
          icon={<CalendarDays size={14} />}
          title="Pianificazione"
          right={isSub && !planOpen ? <button className="normal-case tracking-normal text-accent font-bold" onClick={() => setPlanOpen(true)}>Mostra</button> : <DueChip s={schedule} due={task.due_date ?? info.plan?.deadline ?? null} />}
        >
          {planOpen && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <DateField label="Inizio" value={task.start_date} onChange={(v) => update(id, { start_date: v })} />
                <DateField label="Scadenza" value={task.due_date} onChange={(v) => update(id, { due_date: v })} />
              </div>
              <ReminderField value={task.remind_days} hasDue={!!(task.due_date ?? info.plan?.deadline)} onChange={(v) => update(id, { remind_days: v })} />
              {!task.due_date && info.plan && kind !== 'done' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                  <Info size={15} className="text-teal mt-0.5 shrink-0" />
                  <span>Perché il flusso rispetti la scadenza, questa tappa va chiusa entro <b className="text-accent">{humanDate(info.plan.deadline)}</b>.</span>
                </div>
              )}
              {task.due_date && task.is_flow && kind !== 'done' && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
                  <Info size={15} className="text-teal mt-0.5 shrink-0" />
                  <span>La scadenza del flusso fissa a ritroso le date di ogni tappa.</span>
                </div>
              )}
            </>
          )}
        </Section>

        <Section icon={<span className="font-bold">#</span>} title="Tag">
          <TagEditor tagIds={task.tag_ids} onChange={(ids, names) => update(id, { tag_ids: ids, tag_names: names })} />
        </Section>

        <Section icon={<PenIcon />} title="Descrizione">
          <AutoTextarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => desc !== task.description && update(id, { description: desc })}
            placeholder="Dettagli, link, contesto…"
            className="field resize-none text-sm leading-relaxed"
            minRows={2}
          />
        </Section>

        {!isSub && (
          <Section
            icon={task.is_flow ? <Workflow size={14} /> : <ListChecks size={14} />}
            title={task.is_flow ? 'Tappe del flusso' : 'Sottoattività'}
            right={
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-ink-2 font-bold normal-case tracking-normal" title="Le voci diventano tappe in sequenza: si sblocca una alla volta">
                <input type="checkbox" className="accent-[var(--teal)] w-4 h-4" checked={task.is_flow} onChange={(e) => update(id, { is_flow: e.target.checked })} />
                In sequenza
              </label>
            }
          >
            {children.length > 0 && <ProgressBar value={progress} />}
            <SubtaskList parentId={id} />
          </Section>
        )}

        <Section icon={<History size={14} />} title="Diario e note">
          <NotesPanel taskId={id} />
        </Section>

        <p className="text-[0.78rem] text-ink-3 pt-2">
          Creata il {new Date(task.created_at).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>
    </>
  )
}

const PenIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>

function DateField({ label, value, onChange, hint }: { label: string; value: string | null; onChange: (v: string | null) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink-2">{label}</span>
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={`field mt-1 text-sm ${!value ? 'text-ink-3' : ''}`}
      />
      {!value && hint && <span className="text-[0.72rem] text-ink-3">{hint}</span>}
    </label>
  )
}

/** Promemoria: "Avvisami N giorni prima della scadenza". */
function ReminderField({ value, hasDue, onChange }: { value: number | null; hasDue: boolean; onChange: (v: number | null) => void }) {
  const [v, setV] = useState(value?.toString() ?? '3')
  useEffect(() => { if (value) setV(value.toString()) }, [value])
  const commit = () => {
    const n = Math.round(Number(v))
    if (Number.isFinite(n) && n >= 1 && n !== value) onChange(n)
    else setV(value?.toString() ?? '3')
  }
  return (
    <div className={`mt-3 flex flex-wrap items-center gap-2 text-sm ${value ? '' : 'text-ink-2'}`}>
      <label className="inline-flex items-center gap-2 cursor-pointer font-bold">
        <input type="checkbox" className="accent-[var(--accent)] w-4 h-4" checked={!!value} onChange={(e) => onChange(e.target.checked ? Math.max(1, Math.round(Number(v)) || 3) : null)} />
        <BellRing size={14} className={value ? 'text-accent' : 'text-ink-3'} />
        Avvisami
      </label>
      <input
        inputMode="numeric"
        value={v}
        disabled={!value}
        onChange={(e) => setV(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="field !w-14 !py-0.5 text-center text-sm disabled:opacity-50"
        aria-label="Giorni di preavviso"
      />
      <span>giorni prima della scadenza</span>
      {value && !hasDue && <span className="w-full text-[0.78rem] text-ink-3">Imposta una scadenza per attivare il promemoria.</span>}
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-2.5" title={`Avanzamento ${value}%`}>
      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: value >= 100 ? 'var(--leaf)' : 'var(--teal)' }} />
      </div>
      <span className="text-xs font-bold text-ink-2 w-9 text-right">{value}%</span>
    </div>
  )
}

export function TagEditor({ tagIds, onChange }: { tagIds: number[]; onChange: (ids: number[], newNames: string[]) => void }) {
  const board = useBoard()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const active = tagIds.map((t) => board.tagById.get(t)).filter(Boolean) as Tag[]
  const toggle = (tid: number) => onChange(tagIds.includes(tid) ? tagIds.filter((x) => x !== tid) : [...tagIds, tid], [])
  const addNew = () => {
    const n = name.trim().replace(/^#/, '')
    if (!n) return
    const existing = board.tags.find((t) => t.name.toLowerCase() === n.toLowerCase())
    if (existing) { if (!tagIds.includes(existing.id)) onChange([...tagIds, existing.id], []) }
    else onChange(tagIds, [n])
    setName('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(open ? board.tags : active).map((t) => (
        <TagChip key={t.id} tag={t} active={open && tagIds.includes(t.id)} onClick={() => toggle(t.id)} />
      ))}
      {open ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew() } if (e.key === 'Escape') setOpen(false) }}
          onBlur={() => { addNew(); setOpen(false) }}
          placeholder="nuovo tag…"
          className="field !w-32 !py-0.5 text-xs"
        />
      ) : (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.78rem] font-bold text-ink-3 hover:bg-surface-2 hover:text-ink">
          <Plus size={12} />{active.length ? 'modifica' : 'aggiungi tag'}
        </button>
      )}
    </div>
  )
}

/** Checklist: voci di testo spuntabili, senza stato o palla propri. */
function SubtaskList({ parentId }: { parentId: number }) {
  const board = useBoard()
  const { toast } = useUI()
  const { toggleDone, update, remove } = useTaskActions()
  const create = useCreateTask()
  const [text, setText] = useState('')
  const parentInfo = board.info(parentId)
  const children = parentInfo.children
  const isFlow = parentInfo.task.is_flow
  const tpl = useTemplateMutations()

  const move = (i: number, dir: -1 | 1) => {
    const a = children[i]
    const b = children[i + dir]
    if (!a || !b) return
    update(a.id, { position: b.position })
    update(b.id, { position: a.position })
  }
  const saveTemplate = () => {
    const name = window.prompt('Nome del modello (es. Richiesta documenti cliente):', parentInfo.task.title)
    if (name?.trim()) tpl.create.mutate({ name: name.trim(), from_task_id: parentId }, { onSuccess: () => toast(`Modello "${name.trim()}" salvato`) })
  }

  const add = () => {
    const title = text.trim()
    if (!title) return
    create.mutate({ title, parent_id: parentId }, { onError: (e) => toast(`Errore: ${e.message}`) })
    setText('')
  }

  return (
    <div>
      <ul className="space-y-0.5">
        {children.map((c, i) => {
          const ci = board.info(c.id)
          const done = ci.kind === 'done'
          const blocked = ci.ball === 'blocked'
          const current = isFlow && parentInfo.currentStep?.id === c.id
          return (
            <li
              key={c.id}
              className={`group flex items-center gap-2.5 rounded-lg px-2 py-1 -mx-2 hover:bg-surface-2 ${current ? 'bg-teal-soft' : ''} ${blocked ? 'opacity-60' : ''}`}
            >
              {isFlow && <span className="text-xs font-bold text-ink-3 w-4 text-right">{i + 1}</span>}
              {blocked
                ? <span title={`Si sblocca dopo "${ci.blockedBy?.title ?? ''}"`}><Lock size={15} className="text-ink-3 mx-0.5" /></span>
                : <DoneCircle done={done} onToggle={() => toggleDone(c)} size={18} />}
              <ItemTitle title={c.title} done={done} onSave={(t) => update(c.id, { title: t })} />
              <span className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                {isFlow && <>
                  <button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} title="Sposta su"><ArrowUp size={13} /></button>
                  <button className="p-0.5 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === children.length - 1} onClick={() => move(i, 1)} title="Sposta giù"><ArrowDown size={13} /></button>
                </>}
                <button className="p-0.5 text-ink-3 hover:text-coral" onClick={() => remove(c)} title="Elimina voce"><X size={14} /></button>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center gap-2.5 mt-1.5 px-0.5">
        <Plus size={16} className="text-ink-3 shrink-0" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={isFlow ? 'Aggiungi tappa… (Invio)' : 'Aggiungi voce… (Invio)'}
          className="flex-1 bg-transparent outline-none text-sm py-1 placeholder:text-ink-3"
        />
      </div>
      {isFlow && children.length > 0 && (
        <button className="btn btn-ghost text-xs mt-2" onClick={saveTemplate} title="Riusa queste tappe per le prossime richieste simili">
          <BookmarkPlus size={14} />Salva come modello
        </button>
      )}
    </div>
  )
}

/** Testo della voce, modificabile sul posto. */
function ItemTitle({ title, done, onSave }: { title: string; done: boolean; onSave: (t: string) => void }) {
  const [v, setV] = useState(title)
  useEffect(() => setV(title), [title])
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { const t = v.trim(); if (t && t !== title) onSave(t); else setV(title) }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(title); e.currentTarget.blur() } }}
      className={`flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold py-0.5 rounded focus:bg-surface ${done ? 'line-through text-ink-3' : ''}`}
    />
  )
}

/** Dov'è la palla: una sola, quella della card madre. */
function DrawerBall({ info }: { info: TaskInfo }) {
  if (info.ball === 'blocked' && info.blockedBy) {
    return (
      <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-sm flex items-center gap-2">
        <Lock size={15} className="text-ink-3" />Si sblocca quando è chiusa la tappa <b>{info.blockedBy.title}</b>.
      </div>
    )
  }
  return (
    <div className={`rounded-xl px-3.5 py-3 flex flex-wrap items-center gap-x-3 gap-y-2 ${info.ball === 'out' ? 'bg-ball-out-soft' : 'bg-ball-me-soft'}`}>
      <span className="text-sm font-bold text-ink-2">Palla</span>
      <BallToggle task={info.task} />
      {info.task.is_flow && info.currentStep && <span className="text-sm text-ink-2">tappa {info.stepIndex}/{info.children.length}: <b className="text-ink">{info.currentStep.title}</b></span>}
      {info.ball === 'out' && <span className="text-sm text-ink-2">{info.ballDays > 0 ? `aspetti da ${info.ballDays} gg` : 'passata oggi'}</span>}
    </div>
  )
}

/** Stato: In fiamme · In corso (predefinito) · Backlog (idee). */
function StateSelector({ info }: { info: TaskInfo }) {
  const board = useBoard()
  const { update, setStatus } = useTaskActions()
  const { task, kind } = info
  const current = task.on_fire ? 'fire' : kind === 'todo' ? 'backlog' : 'doing'
  const doing = board.firstStatusOf('doing')
  const backlog = board.statuses.find((s) => s.kind === 'todo')
  const pick = (v: 'fire' | 'doing' | 'backlog') => {
    if (v === current) return
    const target = v === 'backlog' ? backlog : doing
    const patch = { on_fire: v === 'fire' }
    if (target && target.id !== task.status_id) setStatus(task, target.id, patch)
    else update(task.id, patch)
  }
  const opt = (v: 'fire' | 'doing' | 'backlog', label: string, icon: React.ReactNode, bg: string, fg = '#fff') => {
    const active = current === v
    return (
      <button
        type="button"
        onClick={() => pick(v)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold transition-all"
        style={{ background: active ? bg : 'transparent', color: active ? fg : 'var(--ink-2)', boxShadow: active ? 'var(--shadow)' : undefined }}
      >
        {icon}{label}
      </button>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-sm font-bold text-ink-2">Stato</span>
      <span className="inline-flex items-center rounded-full bg-surface-2 p-0.5">
        {opt('fire', 'In fiamme', <Flame size={14} fill={current === 'fire' ? 'currentColor' : 'none'} />, 'var(--coral)')}
        {opt('doing', 'In corso', <Play size={13} />, 'var(--ink-2)')}
        {backlog && opt('backlog', 'Backlog (idee)', <Lightbulb size={14} />, 'var(--surface)', 'var(--ink)')}
      </span>
    </div>
  )
}
