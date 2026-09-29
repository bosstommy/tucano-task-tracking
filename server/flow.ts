import { db, logEvent, nowIso, todayLocal } from './db.ts'

type Row = Record<string, any>

export const statusKind = (id: number) =>
  (db.prepare('SELECT kind FROM statuses WHERE id = ?').get(id) as Row | undefined)?.kind as string | undefined

export const firstStatus = (kind: string): number =>
  (db.prepare('SELECT id FROM statuses WHERE kind = ? ORDER BY position LIMIT 1').get(kind) as Row | undefined)?.id
  ?? (db.prepare('SELECT id FROM statuses ORDER BY position LIMIT 1').get() as Row).id

/** Sposta la palla: da me (false) o nel campo degli altri (true). */
export function setBall(taskId: number, out: boolean) {
  const t = db.prepare('SELECT ball_out FROM tasks WHERE id = ?').get(taskId) as Row
  if (!!t.ball_out === out) return
  db.prepare('UPDATE tasks SET ball_out = ?, ball_since = ?, updated_at = ? WHERE id = ?').run(out ? 1 : 0, out ? todayLocal() : null, nowIso(), taskId)
  logEvent(taskId, 'ball', out ? 'Palla passata agli altri' : 'Palla tornata a me')
}

/** Diario e avanzamento del flusso dopo un cambio di stato. */
export function afterStatusChange(taskId: number, was: string | undefined, now: string | undefined) {
  const t = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Row
  const statusName = (db.prepare('SELECT name FROM statuses WHERE id = ?').get(t.status_id) as Row)?.name
  if (now === 'done' && was !== 'done') logEvent(taskId, 'done', 'Chiusa')
  else if (was === 'done' && now !== 'done') logEvent(taskId, 'reopen', 'Riaperta')
  else logEvent(taskId, 'status', `Stato: ${statusName}`)

  if (!t.parent_id) return
  const parent = db.prepare('SELECT * FROM tasks WHERE id = ?').get(t.parent_id) as Row
  if (!parent?.is_flow) return
  if (now === 'done' && was !== 'done') logEvent(parent.id, 'step', `Tappa completata: ${t.title}`)
  if (was === 'done' && now !== 'done') logEvent(parent.id, 'step', `Tappa riaperta: ${t.title}`)
}

interface StepTpl { title: string; others?: boolean; estimate_days: number | null }

/** Crea un flusso da un modello. */
export function applyTemplate(templateId: number, title: string, dueDate: string | null) {
  const tpl = db.prepare('SELECT * FROM flow_templates WHERE id = ?').get(templateId) as Row | undefined
  if (!tpl) throw new Error('Modello non trovato')
  const steps = JSON.parse(tpl.steps) as StepTpl[]
  const now = nowIso()
  const today = todayLocal()
  const todo = firstStatus('doing')
  // La palla è solo del flusso: parte "agli altri" se la prima tappa è loro.
  const out = steps[0]?.others ? 1 : 0
  const parentId = Number(db.prepare(`INSERT INTO tasks (title, status_id, start_date, due_date, is_flow, ball_out, ball_since, position, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, (SELECT coalesce(max(position), 0) + 1 FROM tasks WHERE parent_id IS NULL), ?, ?)`)
    .run(title, todo, today, dueDate, out, out ? today : null, now, now).lastInsertRowid)
  logEvent(parentId, 'created', `Creato dal modello "${tpl.name}"`)
  steps.forEach((s, i) => {
    db.prepare(`INSERT INTO tasks (parent_id, title, status_id, start_date, estimate_days, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(parentId, s.title, todo, today, s.estimate_days, i + 1, now, now)
  })
  return parentId
}
