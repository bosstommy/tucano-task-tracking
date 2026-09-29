import { useState } from 'react'
import { X, Workflow } from 'lucide-react'
import { useCreateTask, useTemplates, useTemplateMutations } from '../api/hooks'
import { useBoard } from '../lib/board'
import { todayISO } from '../lib/dates'
import { useUI } from '../ui'
import type { NewTask } from '../types'
import { FireToggle } from './bits'
import { BallIcon } from './Ball'
import { TagEditor } from './TaskDrawer'
import { AutoTextarea } from './NotesPanel'

/** Modulo completo per chi ha tempo di compilare tutto. */
export function TaskForm() {
  const { formPrefill, closeForm } = useUI()
  if (!formPrefill) return null
  return <FormBody initial={formPrefill} onClose={closeForm} />
}

function FormBody({ initial, onClose }: { initial: NewTask; onClose: () => void }) {
  const board = useBoard()
  const create = useCreateTask()
  const { toast, openTask } = useUI()
  const [t, setT] = useState<NewTask>({
    status_id: board.firstStatusOf('doing')?.id,
    start_date: todayISO(),
    on_fire: false, ball_out: false,
    tag_ids: [], tag_names: [],
    ...initial,
  })
  const set = (p: Partial<NewTask>) => setT((x) => ({ ...x, ...p }))
  const { data: templates = [] } = useTemplates()
  const tpl = useTemplateMutations()
  const [templateId, setTemplateId] = useState<number | null>(null)
  const chosen = templates.find((x) => x.id === templateId)
  const parents = board.top.filter((x) => board.infos.get(x.id)?.kind !== 'done')

  const submit = () => {
    if (!t.title.trim()) return
    if (chosen) {
      tpl.apply.mutate({ id: chosen.id, title: t.title.trim(), due: t.due_date ?? null }, {
        onSuccess: ({ id }) => { toast(`Flusso "${chosen.name}" creato ✓`, { label: 'Apri', run: () => openTask(id) }); onClose() },
        onError: (e) => toast(`Errore: ${e.message}`),
      })
      return
    }
    create.mutate(t, {
      onSuccess: (task) => { toast('Attività creata ✓', { label: 'Apri', run: () => openTask(task.id) }); onClose() },
      onError: (e) => toast(`Errore: ${e.message}`),
    })
  }

  const label = 'text-xs font-bold text-ink-2 block mb-1'

  return (
    <div className="fixed inset-0 z-[60] grid place-items-start sm:place-items-center bg-black/25 animate-fade p-4 overflow-y-auto" onMouseDown={onClose}>
      <div
        className="card shadow-pop animate-pop w-full max-w-xl p-6"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.stopPropagation(); onClose() }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
        }}
      >
        <div className="flex items-center mb-4">
          <h2 className="text-lg font-bold flex-1">Nuova attività</h2>
          <button className="btn btn-ghost !p-1.5" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="space-y-4">
          {templates.length > 0 && (
            <div className="rounded-xl bg-teal-soft/60 px-3 py-2.5">
              <label className="flex items-center gap-2 text-sm font-bold">
                <Workflow size={16} className="text-teal" />Parti da un modello di flusso
                <select className="field !w-auto flex-1 text-sm" value={templateId ?? ''} onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— nessuno (attività semplice)</option>
                  {templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
              {chosen && (
                <ol className="mt-2 text-sm text-ink-2 list-decimal pl-9 space-y-0.5">
                  {chosen.steps.map((st, i) => <li key={i}>{st.title}{st.others ? <b className="text-yellow"> · altri</b> : ''}{st.estimate_days ? ` · ~${st.estimate_days}g` : ''}</li>)}
                </ol>
              )}
            </div>
          )}
          <input
            autoFocus
            value={t.title}
            onChange={(e) => set({ title: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && !e.ctrlKey && submit()}
            placeholder="Titolo"
            className="field !text-lg font-bold"
          />
          <AutoTextarea
            value={t.description ?? ''}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Descrizione (facoltativa)"
            className="field resize-none text-sm"
            minRows={2}
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <span className={label}>Stato</span>
              <select className="field text-sm" value={t.status_id} onChange={(e) => set({ status_id: Number(e.target.value) })}>
                {board.statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <span className={label}>Sottoattività di</span>
              <select className="field text-sm" value={t.parent_id ?? ''} onChange={(e) => set({ parent_id: e.target.value ? Number(e.target.value) : null })}>
                <option value="">— nessuna (attività principale)</option>
                {parents.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <span className={label}>Priorità e palla</span>
            <div className="flex flex-wrap items-center gap-2">
              <FireToggle on={!!t.on_fire} onChange={(v) => set({ on_fire: v })} />
              <span className="inline-flex items-center rounded-full bg-surface-2 p-0.5">
                {[false, true].map((out) => (
                  <button
                    key={String(out)} type="button" onClick={() => set({ ball_out: out })}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold"
                    style={{ background: !!t.ball_out === out ? (out ? 'var(--ball-out)' : 'var(--ball-me)') : 'transparent', color: !!t.ball_out === out ? (out ? 'var(--ball-out-ink)' : '#fff') : 'var(--ink-2)' }}
                  ><BallIcon out={out} size={14} />{out ? 'Agli altri' : 'Da me'}</button>
                ))}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label><span className={label}>Inizio</span>
              <input type="date" className="field text-sm" value={t.start_date ?? ''} onChange={(e) => set({ start_date: e.target.value || null })} />
            </label>
            <label><span className={label}>Scadenza</span>
              <input type="date" className="field text-sm" value={t.due_date ?? ''} onChange={(e) => set({ due_date: e.target.value || null })} />
            </label>
            <label><span className={label}>Stima (giorni)</span>
              <input
                inputMode="decimal" className="field text-sm" placeholder="es. 2"
                value={t.estimate_days ?? ''}
                onChange={(e) => { const n = Number(e.target.value.replace(',', '.')); set({ estimate_days: e.target.value && !Number.isNaN(n) ? n : null }) }}
              />
            </label>
          </div>

          <div>
            <span className={label}>Tag</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <TagEditor
                tagIds={t.tag_ids ?? []}
                onChange={(ids, names) => set({ tag_ids: ids, tag_names: [...new Set([...(t.tag_names ?? []), ...names])] })}
              />
              {t.tag_names?.map((n) => (
                <button key={n} onClick={() => set({ tag_names: t.tag_names!.filter((x) => x !== n) })} className="rounded-md bg-plum-soft px-1.5 py-0.5 text-[0.78rem] font-bold" title="Rimuovi">
                  #{n} ×
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <span className="text-xs text-ink-3 mr-auto">Ctrl+Invio per creare</span>
          <button className="btn btn-ghost" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" disabled={!t.title.trim()} onClick={submit}>Crea attività</button>
        </div>
      </div>
    </div>
  )
}
