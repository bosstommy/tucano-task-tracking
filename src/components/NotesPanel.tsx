import { useRef, useState } from 'react'
import { Mic, MicOff, PenLine, Trash2, Send, Pencil, Hourglass, BellRing, CheckCheck, CircleCheck, Sparkles, CalendarClock, Workflow, Dot } from 'lucide-react'
import { useNotes, useNoteMutations, useEvents } from '../api/hooks'
import { useSpeech } from '../lib/useSpeech'
import type { Note, TaskEvent } from '../types'
import { BallIcon } from './Ball'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const { minRows = 1, ...rest } = props
  return (
    <textarea
      {...rest}
      rows={minRows}
      style={{ fieldSizing: 'content', ...rest.style } as React.CSSProperties}
    />
  )
}

export function NotesPanel({ taskId }: { taskId: number }) {
  const { data: notes = [] } = useNotes(taskId)
  const { data: events = [] } = useEvents(taskId)
  const timeline = [
    ...notes.map((n) => ({ at: n.created_at, note: n as Note | undefined, event: undefined as TaskEvent | undefined })),
    ...events.map((e) => ({ at: e.at, note: undefined, event: e })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  const m = useNoteMutations(taskId)
  const [draft, setDraft] = useState('')
  const usedVoice = useRef(false)
  const speech = useSpeech((text) => {
    usedVoice.current = true
    setDraft((d) => (d && !d.endsWith(' ') && !d.endsWith('\n') ? `${d} ${text}` : d + text))
  })

  const save = () => {
    const content = draft.trim()
    if (!content) return
    if (speech.listening) speech.stop()
    m.add.mutate({ content, kind: usedVoice.current ? 'voice' : 'text' })
    setDraft('')
    usedVoice.current = false
  }

  return (
    <div>
      <div className={`rounded-xl bg-surface-2 p-2 transition-shadow ${speech.listening ? 'ring-2 ring-coral/50' : ''}`}>
        <AutoTextarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save() } }}
          placeholder={speech.listening ? 'Ti ascolto…' : 'Scrivi una nota o dettala col microfono…'}
          className="w-full bg-transparent outline-none resize-none px-1.5 py-1 text-sm max-h-60"
          minRows={2}
        />
        {speech.interim && <div className="px-1.5 pb-1 text-sm italic text-ink-3">{speech.interim}…</div>}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={speech.toggle}
            disabled={!speech.supported}
            title={speech.supported ? (speech.listening ? 'Ferma dettatura' : 'Detta la nota') : 'Dettatura disponibile in Chrome o Edge'}
            className={`grid place-items-center w-9 h-9 rounded-full transition-all disabled:opacity-30
              ${speech.listening ? 'bg-coral text-white animate-rec' : 'bg-surface text-ink-2 hover:text-coral'}`}
          >
            {speech.listening ? <MicOff size={17} /> : <Mic size={17} />}
          </button>
          <span className="text-[0.78rem] text-ink-3 flex-1">{speech.error ?? (draft ? 'Ctrl+Invio per salvare' : '')}</span>
          <button onClick={save} disabled={!draft.trim()} className="btn btn-primary !py-1.5 text-sm disabled:opacity-40">
            <Send size={14} />Salva
          </button>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {timeline.map(({ note: n, event: e }) => n
          ? <NoteItem key={`n${n.id}`} note={n} onSave={(content) => m.update.mutate({ id: n.id, content })} onDelete={() => m.remove.mutate(n.id)} />
          : <EventItem key={`e${e!.id}`} event={e!} />)}
      </ul>
    </div>
  )
}

function NoteItem({ note, onSave, onDelete }: { note: Note; onSave: (c: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.content)
  return (
    <li className="group rounded-xl border border-line px-3 py-2 animate-pop">
      <div className="flex items-center gap-1.5 text-[0.78rem] font-bold text-ink-3 mb-1">
        {note.kind === 'voice' ? <Mic size={11} className="text-coral" /> : <PenLine size={11} />}
        {fmt(note.created_at)}
        <span className="flex-1" />
        <button className="opacity-0 group-hover:opacity-100 hover:text-ink p-0.5" onClick={() => { setText(note.content); setEditing(true) }} title="Modifica"><Pencil size={12} /></button>
        <button className="opacity-0 group-hover:opacity-100 hover:text-coral p-0.5" onClick={onDelete} title="Elimina nota"><Trash2 size={12} /></button>
      </div>
      {editing ? (
        <AutoTextarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setEditing(false); if (text.trim() && text !== note.content) onSave(text.trim()) }}
          onKeyDown={(e) => { if (e.key === 'Escape' || (e.key === 'Enter' && e.ctrlKey)) e.currentTarget.blur() }}
          className="field text-sm resize-none"
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
      )}
    </li>
  )
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  ball: <BallIcon out size={13} />,
  wait: <Hourglass size={13} className="text-plum" />,
  followup: <BellRing size={13} className="text-yellow" />,
  answer: <CheckCheck size={13} className="text-leaf" />,
  done: <CircleCheck size={13} className="text-leaf" />,
  created: <Sparkles size={13} className="text-accent" />,
  due: <CalendarClock size={13} className="text-yellow" />,
  step: <Workflow size={13} className="text-teal" />,
  flow: <Workflow size={13} className="text-teal" />,
}

/** Evento del diario: una riga discreta, senza card. */
function EventItem({ event }: { event: TaskEvent }) {
  return (
    <li className="flex items-center gap-2 px-1 text-sm text-ink-2">
      <span className="w-4 grid place-items-center shrink-0">{EVENT_ICON[event.type] ?? <Dot size={13} />}</span>
      <span className="flex-1 min-w-0">{event.text}</span>
      <span className="text-xs text-ink-3 whitespace-nowrap">{fmt(event.at)}</span>
    </li>
  )
}
