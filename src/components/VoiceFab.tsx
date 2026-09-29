import { useEffect, useMemo, useState } from 'react'
import { Mic, Square, Check, X, ChevronUp, Flame, CalendarClock, Clock, CornerDownRight } from 'lucide-react'
import { useCreateTask } from '../api/hooks'
import { useBoard } from '../lib/board'
import { useSpeech } from '../lib/useSpeech'
import { voiceToQuick } from '../lib/voice'
import { quickParse } from '../lib/quickParse'
import { humanDate } from '../lib/dates'
import { useUI } from '../ui'
import { BallIcon } from './Ball'
import type { NewTask } from '../types'

/**
 * Pulsante grande in basso al centro: premi, parla, conferma.
 * Capisce "urgente", "entro venerdì", "aspetto risposta da…" / "palla agli altri", "sotto <attività>"…
 */
export function VoiceFab() {
  const board = useBoard()
  const create = useCreateTask()
  const { toast, openTask, openForm, formPrefill, selectedId } = useUI()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const speech = useSpeech((phrase) => setText((t) => (t ? `${t} ${phrase}` : phrase)))

  const quick = useMemo(() => voiceToQuick(text), [text])
  const parsed = useMemo(() => quickParse(quick, { hoursPerDay: board.settings.hoursPerDay }), [quick, board.settings.hoursPerDay])
  const parent = useMemo(() => {
    if (!parsed.parentQuery) return null
    const q = parsed.parentQuery.toLowerCase()
    return board.top.filter((t) => board.infos.get(t.id)?.kind !== 'done').find((t) => t.title.toLowerCase().includes(q)) ?? null
  }, [parsed.parentQuery, board])

  const toNewTask = (): NewTask => ({
    title: parent || !parsed.parentQuery ? parsed.title : `${parsed.title} (${parsed.parentQuery})`,
    on_fire: parsed.onFire, ball_out: parsed.ballOut,
    due_date: parsed.due, estimate_days: parsed.estimateDays, tag_names: parsed.tags,
    parent_id: parent?.id ?? null,
  })

  const start = () => {
    if (!speech.supported) { toast('La dettatura funziona in Chrome o Edge'); return }
    setText('')
    setOpen(true)
    speech.start()
  }
  const close = () => { speech.stop(); setOpen(false); setText('') }
  const add = () => {
    if (!parsed.title) return
    speech.stop()
    create.mutate(toNewTask(), {
      onSuccess: (t) => toast(parent ? `Aggiunta sotto "${parent.title.slice(0, 30)}"` : 'Aggiunta ✓', { label: 'Apri', run: () => openTask(t.id) }),
      onError: (e) => toast(`Errore: ${e.message}`),
    })
    setOpen(false)
    setText('')
  }
  const expand = () => { speech.stop(); openForm(toNewTask()); setOpen(false); setText('') }

  // Tasto M per dettare; Invio conferma, Esc annulla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
      if (open) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
        else if (e.key === 'Enter' && !typing) { e.preventDefault(); add() }
      } else if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault(); start()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  if (formPrefill) return null

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[55] bg-black/20 animate-fade" onClick={close}>
          <div
            className="card shadow-pop animate-pop absolute left-1/2 -translate-x-1/2 bottom-32 w-[min(36rem,calc(100vw-2rem))] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-sm font-bold text-ink-2 mb-2">
              {speech.listening
                ? <><span className="w-2.5 h-2.5 rounded-full bg-coral animate-pulse" />Ti ascolto… parla pure</>
                : <>Controlla e conferma</>}
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Es. «valutazione prodotti Cambielli entro il 30 ottobre aspetto risposta da commerciale»"
              className="w-full bg-surface-2 rounded-xl p-3 text-lg leading-snug outline-none resize-none focus:ring-2 focus:ring-accent/40"
              style={{ fieldSizing: 'content', minHeight: '4.5rem' } as React.CSSProperties}
            />
            {speech.interim && <p className="text-ink-3 italic mt-1 px-1">{speech.interim}…</p>}
            {speech.error && <p className="text-coral text-sm mt-1 px-1">{speech.error}</p>}

            {parsed.title && (
              <div className="mt-3 rounded-xl border border-line px-3 py-2.5">
                <div className="font-bold">{parsed.title}</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs font-bold">
                  {parsed.onFire && <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft text-coral px-2 py-0.5"><Flame size={12} />In fiamme</span>}
                  {parsed.due && <span className="inline-flex items-center gap-1 rounded-full bg-yellow-soft px-2 py-0.5"><CalendarClock size={12} />{humanDate(parsed.due)}</span>}
                  {parsed.estimateDays && <span className="inline-flex items-center gap-1 rounded-full bg-teal-soft px-2 py-0.5"><Clock size={12} />{parsed.estimateDays} g</span>}
                  {parsed.ballOut && <span className="inline-flex items-center gap-1 rounded-full bg-ball-out-soft px-2 py-0.5"><BallIcon out />palla agli altri</span>}
                  {parsed.tags.map((t) => <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5">#{t}</span>)}
                  {parsed.parentQuery && (parent
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5"><CornerDownRight size={12} />{parent.title}</span>
                    : <span className="rounded-full bg-coral-soft text-coral px-2 py-0.5">nessuna attività "{parsed.parentQuery}"</span>)}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button className="btn btn-ghost" onClick={close}><X size={16} />Annulla</button>
              <button className="btn btn-ghost" onClick={expand} disabled={!parsed.title} title="Apri il modulo completo"><ChevronUp size={16} />Modulo</button>
              <span className="flex-1" />
              {speech.listening
                ? <button className="btn bg-surface-2" onClick={speech.stop}><Square size={14} fill="currentColor" />Stop</button>
                : <button className="btn bg-surface-2" onClick={speech.start}><Mic size={16} />Continua</button>}
              <button className="btn btn-primary !px-5 !py-2 text-base" onClick={add} disabled={!parsed.title}><Check size={18} strokeWidth={3} />Aggiungi</button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={open ? (speech.listening ? speech.stop : add) : start}
        title="Detta una nuova attività (M)"
        aria-label="Detta una nuova attività"
        className={`fixed z-[56] -translate-x-1/2 bottom-6 place-items-center rounded-full text-white transition-all
          hover:scale-105 active:scale-95 ${speech.listening ? 'bg-coral animate-rec' : ''} ${selectedId != null && !open ? 'hidden lg:grid' : 'grid'}`}
        style={{
          // Con il pannello di dettaglio aperto resta al centro dello spazio libero, senza coprirlo.
          left: selectedId != null && !open ? 'calc((100vw - 34rem) / 2)' : '50%',
          width: '4.75rem', height: '4.75rem',
          background: speech.listening ? undefined : 'linear-gradient(135deg, var(--accent), var(--yellow))',
          boxShadow: '0 10px 30px color-mix(in srgb, var(--accent) 45%, transparent), 0 2px 6px rgb(0 0 0 / 0.15)',
        }}
      >
        {speech.listening ? <Square size={24} fill="currentColor" /> : open ? <Check size={30} strokeWidth={3} /> : <Mic size={30} strokeWidth={2.4} />}
      </button>
    </>
  )
}
