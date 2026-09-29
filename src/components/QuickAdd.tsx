import { useMemo, useState } from 'react'
import { ChevronDown, Plus, CornerDownRight, Flame, Clock, CalendarClock, HelpCircle } from 'lucide-react'
import { BallIcon } from './Ball'
import { useCreateTask } from '../api/hooks'
import { useBoard } from '../lib/board'
import { quickParse } from '../lib/quickParse'
import { humanDate } from '../lib/dates'
import { useUI } from '../ui'
import type { NewTask } from '../types'

export function QuickAdd() {
  const [text, setText] = useState('')
  const [help, setHelp] = useState(false)
  const board = useBoard()
  const create = useCreateTask()
  const { quickAddRef, openForm, toast, openTask } = useUI()

  const parsed = useMemo(() => quickParse(text, { hoursPerDay: board.settings.hoursPerDay }), [text, board.settings.hoursPerDay])

  const parent = useMemo(() => {
    if (!parsed.parentQuery) return null
    const q = parsed.parentQuery.toLowerCase()
    return board.top
      .filter((t) => board.infos.get(t.id)?.kind !== 'done')
      .find((t) => t.title.toLowerCase().includes(q)) ?? null
  }, [parsed.parentQuery, board])

  const toNewTask = (): NewTask => ({
    title: parsed.title,
    on_fire: parsed.onFire,
    ball_out: parsed.ballOut,
    due_date: parsed.due,
    estimate_days: parsed.estimateDays,
    tag_names: parsed.tags,
    parent_id: parent?.id ?? null,
  })

  const submit = () => {
    if (!parsed.title) return
    create.mutate(toNewTask(), {
      onSuccess: (t) => toast(parent ? `Aggiunta sotto "${parent.title.slice(0, 30)}"` : 'Aggiunta ✓', { label: 'Apri', run: () => openTask(t.id) }),
      onError: (e) => toast(`Errore: ${e.message}`),
    })
    setText('')
  }

  const expand = () => {
    openForm(toNewTask())
    setText('')
  }

  const hasChips = parsed.onFire || parsed.ballOut || parsed.tags.length || parsed.due || parsed.estimateDays || parsed.parentQuery

  return (
    <div className="relative flex-1 min-w-0 max-w-2xl">
      <div className="flex items-center gap-1 card !rounded-2xl pl-4 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
        <input
          ref={quickAddRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); expand() }
            else if (e.key === 'Enter') { e.preventDefault(); submit() }
            else if (e.key === 'Escape') { setText(''); e.currentTarget.blur() }
          }}
          placeholder="Cosa hai in testa? Scrivi e premi Invio…"
          className="flex-1 bg-transparent outline-none py-1.5 font-semibold placeholder:text-ink-3 placeholder:font-normal min-w-0"
        />
        <button className="btn-ghost p-1.5 rounded-lg text-ink-3 hidden sm:block" title="Sintassi rapida" onClick={() => setHelp((h) => !h)}>
          <HelpCircle size={17} />
        </button>
        <button onClick={submit} disabled={!parsed.title} className="btn btn-primary !px-2.5 !py-1.5 disabled:opacity-40" title="Aggiungi (Invio)">
          <Plus size={18} strokeWidth={3} />
        </button>
        <button onClick={expand} className="btn btn-ghost !px-1.5 !py-1.5" title="Modulo completo (Maiusc+Invio)">
          <ChevronDown size={18} strokeWidth={3} />
        </button>
      </div>

      {hasChips ? (
        <div className="absolute left-3 top-full mt-1.5 flex flex-wrap items-center gap-1.5 z-30 animate-pop text-xs font-bold">
          {parsed.onFire && <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft text-coral px-2 py-0.5"><Flame size={12} fill="currentColor" />In fiamme</span>}
          {parsed.due && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-soft px-2 py-0.5"><CalendarClock size={12} />{humanDate(parsed.due)}</span>}
          {parsed.estimateDays && <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5"><Clock size={12} />{parsed.estimateDays} g</span>}
          {parsed.tags.map((t) => <span key={t} className="rounded-full bg-surface px-2 py-0.5 shadow-card">#{t}</span>)}
          {parsed.ballOut && <span className="inline-flex items-center gap-1 rounded-full bg-ball-out-soft px-2 py-0.5"><BallIcon out />palla agli altri</span>}
          {parsed.parentQuery && (parent
            ? <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 shadow-card"><CornerDownRight size={12} />{parent.title}</span>
            : <span className="rounded-full bg-coral-soft text-coral px-2 py-0.5">nessuna attività "{parsed.parentQuery}"</span>)}
        </div>
      ) : null}

      {help && (
        <div className="absolute right-0 top-full mt-2 z-40 card shadow-pop p-4 w-80 text-sm animate-pop" onClick={() => setHelp(false)}>
          <div className="font-bold mb-2">Scrivi tutto in una riga</div>
          <ul className="space-y-1 text-ink-2">
            <li><b className="text-ink">!</b> o <b className="text-ink">🔥</b> in fiamme</li>
            <li><b className="text-ink">?</b> palla agli altri (sto aspettando)</li>
            <li><b className="text-ink">#qualità</b> tag (creato se nuovo)</li>
            <li><b className="text-ink">@30/10 @ven @domani @+3</b> scadenza</li>
            <li><b className="text-ink">~3g ~4h</b> tempo di lavoro stimato</li>
            <li><b className="text-ink">… &gt; audit</b> sottoattività di "audit…"</li>
            <li><b className="text-ink">Maiusc+Invio</b> o <b className="text-ink">▾</b> modulo completo</li>
          </ul>
          <div className="mt-3 rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-xs">Valutazione prodotti Cambielli ? #qualità @30/10</div>
        </div>
      )}
    </div>
  )
}
