import { Router } from 'express'
import { db } from '../db.ts'
import { applyTemplate } from '../flow.ts'

type Row = Record<string, any>

// ---------- Modelli di flusso ----------
export const templatesRouter = Router()

const mapTpl = (r: Row) => ({ id: r.id, name: r.name, steps: JSON.parse(r.steps) })

templatesRouter.get('/', (_req, res) => res.json((db.prepare('SELECT * FROM flow_templates ORDER BY name').all() as Row[]).map(mapTpl)))

/** Salva un modello da zero (steps) o copiando le tappe di un flusso esistente (from_task_id). */
templatesRouter.post('/', (req, res) => {
  const b = req.body ?? {}
  let steps = b.steps
  if (b.from_task_id) {
    steps = (db.prepare('SELECT title, ball_out, estimate_days FROM tasks WHERE parent_id = ? AND deleted_at IS NULL ORDER BY position')
      .all(b.from_task_id) as Row[])
      .map((s) => ({ title: s.title, others: !!s.ball_out, estimate_days: s.estimate_days }))
  }
  if (!b.name?.trim() || !Array.isArray(steps) || !steps.length) return res.status(400).json({ error: 'Nome e tappe obbligatori' })
  const info = db.prepare('INSERT INTO flow_templates (name, steps) VALUES (?, ?)').run(b.name.trim(), JSON.stringify(steps))
  res.status(201).json(mapTpl(db.prepare('SELECT * FROM flow_templates WHERE id = ?').get(info.lastInsertRowid) as Row))
})

templatesRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  if (req.body?.name) db.prepare('UPDATE flow_templates SET name = ? WHERE id = ?').run(req.body.name, id)
  if (req.body?.steps) db.prepare('UPDATE flow_templates SET steps = ? WHERE id = ?').run(JSON.stringify(req.body.steps), id)
  res.json(mapTpl(db.prepare('SELECT * FROM flow_templates WHERE id = ?').get(id) as Row))
})

templatesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM flow_templates WHERE id = ?').run(Number(req.params.id))
  res.json({ ok: true })
})

templatesRouter.post('/:id/apply', (req, res) => {
  const title = String(req.body?.title ?? '').trim()
  if (!title) return res.status(400).json({ error: 'Titolo obbligatorio' })
  const id = db.transaction(() => applyTemplate(Number(req.params.id), title, req.body?.due_date ?? null))()
  res.status(201).json({ id })
})
