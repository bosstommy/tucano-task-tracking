import { useEffect, useRef, useState } from 'react'
import { Inbox as InboxIcon, X, ArrowRight, Lightbulb } from 'lucide-react'
import { useCreateTask, useInbox, useInboxMutations } from '../api/hooks'
import { useBoard } from '../lib/board'
import { quickParse } from '../lib/quickParse'
import { useUI } from '../ui'
import type { InboxItem } from '../types'

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

/**
 * Inbox svuotatesta: linguetta discreta sul bordo sinistro (tasto I).
 * Si butta giù una riga per pensiero; poi ognuna diventa attività, idea o sparisce.
 */
export function Inbox() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: items = [] } = useInbox()
  const m = useInboxMutations()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if ((e.key === 'i' || e.key === 'I') && !isTyping()) { e.preventDefault(); if (open) inputRef.current?.focus(); else setOpen(true) }
      else if (e.key === 'Escape' && open && (!isTyping() || document.activeElement === inputRef.current)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const add = (lines: string[]) => {
    const texts = lines.map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean)
    if (texts.length) m.add.mutate(texts)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-1.5 rounded-r-lg bg-surface/70 border border-l-0 border-line px-1 py-2.5 text-ink-3 opacity-60 hover:opacity-100 hover:text-ink hover:bg-surface transition-all"
        title="Inbox svuotatesta (I)"
      >
        <InboxIcon size={15} />
        {items.length > 0 && <span className="text-[0.7rem] font-bold leading-none">{items.length}</span>}
        <span className="text-[0.7rem] font-bold tracking-wider [writing-mode:vertical-rl] rotate-180">INBOX</span>
      </button>
    )
  }

  return (
    <aside className="fixed left-0 top-24 bottom-24 z-40 w-[19rem] max-w-[calc(100vw-1rem)] flex flex-col rounded-r-2xl bg-surface border border-l-0 border-line shadow-pop animate-fade">
      <header className="flex items-center gap-2 px-4 pt-3 pb-2">
        <InboxIcon size={15} className="text-ink-3" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3 flex-1">Svuotatesta{items.length ? ` · ${items.length}` : ''}</h2>
        <button onClick={() => setOpen(false)} className="btn btn-ghost !p-1" title="Chiudi (Esc)"><X size={16} /></button>
      </header>
      <div className="px-4 pb-2">
        <input
          ref={inputRef}
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add([text]); setText('') } }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text')
            if (t.includes('\n')) { e.preventDefault(); add(t.split(/\r?\n/)) }
          }}
          placeholder="Cosa ti gira in testa? Invio…"
          className="field text-sm"
        />
      </div>
      <ul className="flex-1 overflow-y-auto px-2 pb-3">
        {items.map((it) => <Row key={it.id} item={it} />)}
        {items.length === 0 && <li className="px-2 py-6 text-center text-sm text-ink-3">Testa vuota. 🌴<br /><span className="text-xs">Una riga per pensiero, lo smisti dopo.</span></li>}
      </ul>
    </aside>
  )
}

function Row({ item }: { item: InboxItem }) {
  const board = useBoard()
  const { toast, openTask } = useUI()
  const m = useInboxMutations()
  const create = useCreateTask()
  const [v, setV] = useState(item.text)
  useEffect(() => setV(item.text), [item.text])

  const promote = (idea: boolean) => {
    const p = quickParse(v, { hoursPerDay: board.settings.hoursPerDay })
    if (!p.title) return
    const backlog = board.statuses.find((s) => s.kind === 'todo')
    create.mutate(
      { title: p.title, on_fire: p.onFire, ball_out: p.ballOut, due_date: p.due, tag_names: p.tags, status_id: idea ? backlog?.id : undefined },
      {
        onSuccess: (t) => { m.remove.mutate(item.id); toast(idea ? 'Messa nel backlog 💡' : 'Diventata attività ✓', { label: 'Apri', run: () => openTask(t.id) }) },
        onError: (e) => toast(`Errore: ${e.message}`),
      },
    )
  }
  const remove = () => {
    m.remove.mutate(item.id)
    toast('Tolta dall\'inbox', { label: 'Annulla', run: () => m.add.mutate([item.text]) })
  }

  return (
    <li className="group flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-surface-2">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { const t = v.trim(); if (t && t !== item.text) m.update.mutate({ id: item.id, text: t }); else setV(item.text) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm py-0.5 rounded focus:bg-surface"
      />
      <span className="flex shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        <button onClick={() => promote(false)} className="p-1 text-ink-3 hover:text-ball-me" title="Trasforma in attività (in corso)"><ArrowRight size={14} /></button>
        <button onClick={() => promote(true)} className="p-1 text-ink-3 hover:text-yellow" title="Metti nel backlog (idea)"><Lightbulb size={14} /></button>
        <button onClick={remove} className="p-1 text-ink-3 hover:text-coral" title="Elimina"><X size={14} /></button>
      </span>
    </li>
  )
}
