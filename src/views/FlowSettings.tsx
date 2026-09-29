import { Trash2, Plus, ArrowUp, ArrowDown, Workflow } from 'lucide-react'
import { useTemplateMutations, useTemplates } from '../api/hooks'
import { useUI } from '../ui'
import type { FlowStepTemplate, FlowTemplate } from '../types'

/** Modelli di flusso: tappe riusabili per richieste che si ripetono. */
export function TemplatesEditor() {
  const { data: templates = [] } = useTemplates()
  const m = useTemplateMutations()
  return (
    <div className="space-y-4">
      {templates.map((t) => <TemplateItem key={t.id} tpl={t} />)}
      <button
        className="btn btn-ghost bg-surface-2 text-sm"
        onClick={() => m.create.mutate({ name: 'Nuovo modello', steps: [{ title: 'Prima tappa', others: false, estimate_days: null }] })}
      ><Plus size={15} />Nuovo modello</button>
    </div>
  )
}

function TemplateItem({ tpl }: { tpl: FlowTemplate }) {
  const m = useTemplateMutations()
  const { confirm } = useUI()
  const save = (steps: FlowStepTemplate[]) => m.update.mutate({ id: tpl.id, steps })
  const setStep = (i: number, p: Partial<FlowStepTemplate>) => save(tpl.steps.map((s, j) => (j === i ? { ...s, ...p } : s)))
  const move = (i: number, d: -1 | 1) => {
    const s = [...tpl.steps]
    ;[s[i], s[i + d]] = [s[i + d], s[i]]
    save(s)
  }
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-center gap-2 mb-2">
        <Workflow size={16} className="text-teal" />
        <input defaultValue={tpl.name} onBlur={(e) => e.target.value.trim() && e.target.value !== tpl.name && m.update.mutate({ id: tpl.id, name: e.target.value.trim() })} className="field font-bold flex-1" />
        <button className="btn btn-ghost !p-1.5 hover:!text-coral" onClick={async () => (await confirm(`Eliminare il modello "${tpl.name}"?`, { ok: 'Elimina', cancel: 'Annulla' })) && m.remove.mutate(tpl.id)}><Trash2 size={14} /></button>
      </div>
      <ol className="space-y-1.5">
        {tpl.steps.map((s, i) => (
          <li key={`${tpl.id}-${i}-${s.title}`} className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-ink-3 w-5 text-right">{i + 1}</span>
            <input defaultValue={s.title} onBlur={(e) => e.target.value.trim() && e.target.value !== s.title && setStep(i, { title: e.target.value.trim() })} className="field text-sm flex-1 !py-1" />
            <label className="inline-flex items-center gap-1 text-xs font-bold text-ink-2 cursor-pointer" title="La fanno gli altri: la palla sarà nel loro campo">
              <input type="checkbox" className="accent-[var(--ball-out)] w-4 h-4" checked={!!s.others} onChange={(e) => setStep(i, { others: e.target.checked })} />altri
            </label>
            <input
              defaultValue={s.estimate_days ?? ''}
              placeholder="gg"
              title="Stima in giorni lavorativi"
              inputMode="decimal"
              onBlur={(e) => { const n = e.target.value ? Number(e.target.value.replace(',', '.')) : null; if (n !== s.estimate_days && (n == null || !Number.isNaN(n))) setStep(i, { estimate_days: n }) }}
              className="field text-sm !w-14 !py-1 text-center"
            />
            <button className="p-1 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={13} /></button>
            <button className="p-1 text-ink-3 hover:text-ink disabled:opacity-30" disabled={i === tpl.steps.length - 1} onClick={() => move(i, 1)}><ArrowDown size={13} /></button>
            <button className="p-1 text-ink-3 hover:text-coral disabled:opacity-30" disabled={tpl.steps.length <= 1} onClick={() => save(tpl.steps.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
          </li>
        ))}
      </ol>
      <button className="btn btn-ghost text-xs mt-2" onClick={() => save([...tpl.steps, { title: 'Nuova tappa', others: false, estimate_days: null }])}><Plus size={13} />Tappa</button>
    </div>
  )
}
