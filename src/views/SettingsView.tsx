import { useState } from 'react'
import { ArrowUp, ArrowDown, Trash2, Plus, Download, DatabaseBackup, Check } from 'lucide-react'
import { useBackups, useSaveSettings, useStatusMutations, useTagMutations } from '../api/hooks'
import { api } from '../api/client'
import { useBoard } from '../lib/board'
import { useUI } from '../ui'
import { useQueryClient } from '@tanstack/react-query'
import { TemplatesEditor } from './FlowSettings'
import type { CardField, ModuleId, Settings, StatusKind } from '../types'

const FIELD_LABELS: Record<CardField, string> = {
  status: 'Stato', fire: 'Fuoco 🔥', progress: 'Avanzamento sottoattività',
  due: 'Scadenza / inizia entro', notes: 'Numero di note', tags: 'Tag', estimate: 'Stima', dates: 'Date inizio → fine',
}
const MODULE_LABELS: Record<ModuleId, string> = { list: 'Lista per stato', kanban: 'Kanban', timeline: 'Timeline' }
const KIND_LABELS: Record<StatusKind, string> = { todo: 'Da fare', doing: 'In lavorazione', waiting: 'In attesa', done: 'Chiuso' }

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="font-bold text-lg">{title}</h2>
      {desc && <p className="text-sm text-ink-2 mt-0.5 mb-4">{desc}</p>}
      {!desc && <div className="h-3" />}
      {children}
    </section>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex items-center gap-3 w-full py-1.5 text-left group">
      <span className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-teal' : 'bg-line'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
      </span>
      <span className="font-semibold text-sm">{label}</span>
    </button>
  )
}

function NumberSetting({ label, hint, value, onChange, min = 0, max = 60 }: { label: string; hint: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <label className="flex items-center gap-4 py-2">
      <div className="flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-ink-3">{hint}</div>
      </div>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="field !w-20 text-center font-bold"
      />
    </label>
  )
}

export function SettingsView() {
  const board = useBoard()
  const s = board.settings
  const save = useSaveSettings()
  const st = useStatusMutations()
  const tg = useTagMutations()
  const { data: backups = [] } = useBackups()
  const qc = useQueryClient()
  const { toast, confirm } = useUI()
  const [backingUp, setBackingUp] = useState(false)

  const put = (p: Partial<Settings>) => save.mutate(p)

  const moveStatus = (idx: number, dir: -1 | 1) => {
    const a = board.statuses[idx]
    const b = board.statuses[idx + dir]
    if (!a || !b) return
    st.update.mutate({ id: a.id, position: b.position })
    st.update.mutate({ id: b.id, position: a.position })
  }

  const doBackup = async () => {
    setBackingUp(true)
    try {
      const r = await api.backups.run()
      toast(`Backup creato: ${r.file}`)
      qc.invalidateQueries({ queryKey: ['backups'] })
    } catch (e) { toast(`Errore backup: ${(e as Error).message}`) }
    setBackingUp(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Impostazioni</h1>

      <Card title="Dimensione del testo">
        <div className="flex flex-wrap gap-2">
          {[[100, 'Piccolo'], [115, 'Medio'], [130, 'Grande'], [150, 'Molto grande'], [170, 'Enorme']].map(([v, l]) => (
            <button
              key={v}
              onClick={() => put({ fontScale: v as number })}
              className={`btn ${s.fontScale === v ? 'btn-primary' : 'btn-ghost bg-surface-2'}`}
            >
              <span style={{ fontSize: `${(v as number) / 130}em` }}>Aa</span>{l}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Cosa mostrare sulle card" desc="Tieni solo l'essenziale: tutto il resto è sempre nel dettaglio dell'attività.">
        <div className="grid sm:grid-cols-2 gap-x-6">
          {(Object.keys(FIELD_LABELS) as CardField[]).map((f) => (
            <Toggle key={f} label={FIELD_LABELS[f]} on={s.cardFields[f]} onChange={(v) => put({ cardFields: { ...s.cardFields, [f]: v } })} />
          ))}
        </div>
      </Card>

      <Card title="Viste" desc="Il Focus è sempre attivo. Accendi solo le viste che usi davvero.">
        <div className="grid sm:grid-cols-2 gap-x-6">
          {(Object.keys(MODULE_LABELS) as ModuleId[]).map((m) => (
            <Toggle key={m} label={MODULE_LABELS[m]} on={s.modules[m]} onChange={(v) => put({ modules: { ...s.modules, [m]: v } })} />
          ))}
        </div>
      </Card>

      <Card title="Pianificazione">
        <NumberSetting label="Preavviso" hint="Giorni lavorativi prima di 'inizia entro' in cui un'attività passa in 'Da iniziare ora'." value={s.leadDays} onChange={(n) => put({ leadDays: n })} max={20} />
        <NumberSetting label="Ore in una giornata" hint="Per convertire stime in ore (~4h) in giorni." value={s.hoursPerDay} onChange={(n) => put({ hoursPerDay: n || 8 })} min={1} max={24} />
        <NumberSetting label="Archivia completate dopo" hint="Giorni dopo la chiusura in cui spariscono dalle viste (0 = mai)." value={s.hideDoneAfterDays} onChange={(n) => put({ hideDoneAfterDays: n })} max={365} />
      </Card>

      <Card title="Stati" desc="Il tipo dice a TUCANO come trattare lo stato: 'Chiuso' imposta la data di fine, 'In lavorazione' conta come iniziata.">
        <ul className="space-y-2">
          {board.statuses.map((x, i) => (
            <li key={x.id} className="flex items-center gap-2">
              <input type="color" value={x.color} onChange={(e) => st.update.mutate({ id: x.id, color: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
              <input defaultValue={x.name} onBlur={(e) => e.target.value.trim() && e.target.value !== x.name && st.update.mutate({ id: x.id, name: e.target.value.trim() })} className="field flex-1 font-semibold text-sm" />
              <select value={x.kind} onChange={(e) => st.update.mutate({ id: x.id, kind: e.target.value as StatusKind })} className="field !w-40 text-sm">
                {(Object.keys(KIND_LABELS) as StatusKind[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
              </select>
              <button className="btn btn-ghost !p-1.5" disabled={i === 0} onClick={() => moveStatus(i, -1)}><ArrowUp size={15} /></button>
              <button className="btn btn-ghost !p-1.5" disabled={i === board.statuses.length - 1} onClick={() => moveStatus(i, 1)}><ArrowDown size={15} /></button>
              <button
                className="btn btn-ghost !p-1.5 hover:!text-coral"
                onClick={async () => {
                  const n = board.tasks.filter((t) => t.status_id === x.id).length
                  if (await confirm(n ? `Eliminare "${x.name}"? Le sue ${n} attività passeranno a un altro stato.` : `Eliminare "${x.name}"?`, { ok: 'Elimina', cancel: 'Annulla' }))
                    st.remove.mutate(x.id, { onError: (e) => toast(e.message) })
                }}
              ><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
        <button className="btn btn-ghost text-sm mt-3" onClick={() => st.create.mutate({ name: 'Nuovo stato', kind: 'todo', color: '#9A8FD8' })}><Plus size={15} />Aggiungi stato</button>
      </Card>

      <Card title="Modelli di flusso" desc="Tappe riusabili per le richieste che si ripetono. Spunta «altri» sulle tappe che fanno gli altri: quando tocca a loro, la palla è nel loro campo.">
        <TemplatesEditor />
      </Card>

      <Card title="Tag" desc="Si creano anche al volo scrivendo #nome nella barra rapida.">
        {board.tags.length === 0 && <p className="text-sm text-ink-3">Nessun tag ancora.</p>}
        <ul className="grid sm:grid-cols-2 gap-2">
          {board.tags.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <input type="color" value={t.color} onChange={(e) => tg.update.mutate({ id: t.id, color: e.target.value })} className="w-7 h-7 rounded-md cursor-pointer bg-transparent border-0 p-0" />
              <input defaultValue={t.name} onBlur={(e) => e.target.value.trim() && e.target.value !== t.name && tg.update.mutate({ id: t.id, name: e.target.value.trim() })} className="field flex-1 text-sm font-semibold" />
              <button className="btn btn-ghost !p-1.5 hover:!text-coral" onClick={() => tg.remove.mutate(t.id)}><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Backup ed esportazione" desc="Una copia del database viene salvata ogni giorno nella cartella 'backups' (ultime 14).">
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary text-sm" onClick={doBackup} disabled={backingUp}><DatabaseBackup size={15} />{backingUp ? 'Backup…' : 'Backup adesso'}</button>
          <a className="btn btn-ghost text-sm bg-surface-2" href="/api/export?format=json"><Download size={15} />Esporta JSON</a>
          <a className="btn btn-ghost text-sm bg-surface-2" href="/api/export?format=csv"><Download size={15} />Esporta CSV (Excel)</a>
        </div>
        {backups.length > 0 && (
          <ul className="mt-4 text-sm text-ink-2 space-y-0.5">
            {backups.slice(0, 5).map((b) => (
              <li key={b.file} className="flex items-center gap-2"><Check size={13} className="text-leaf" />{b.file} <span className="text-ink-3">· {(b.size / 1024).toFixed(0)} KB</span></li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Scorciatoie">
        <ul className="grid sm:grid-cols-2 gap-y-1.5 text-sm">
          {[
            ['N  o  Ctrl+K', 'Nuova attività'], ['/', 'Cerca'], ['Maiusc+Invio', 'Modulo completo'], ['Esc', 'Chiudi pannello'],
            ['1 … 4', 'Cambia vista'], ['D', 'Tema chiaro/scuro'], ['E', 'Mostra/nascondi sottoattività'], ['M', 'Detta una nuova attività'], ['Ctrl+Invio', 'Salva nota'],
          ].map(([k, v]) => (
            <li key={k} className="flex items-center gap-3"><kbd className="rounded-md bg-surface-2 border border-line px-2 py-0.5 text-xs font-bold min-w-24 text-center">{k}</kbd>{v}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
