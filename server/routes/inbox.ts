import { Router } from 'express'
import { db, nowIso } from '../db.ts'

/** Inbox svuotatesta: pensieri grezzi, da smistare dopo. */
export const inboxRouter = Router()

inboxRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM inbox ORDER BY id DESC').all())
})

// Accetta { text } oppure { texts: [...] } (incolla di più righe).
inboxRouter.post('/', (req, res) => {
  const b = req.body ?? {}
  const texts = (Array.isArray(b.texts) ? b.texts : [b.text]).map((t: unknown) => String(t ?? '').trim()).filter(Boolean)
  if (!texts.length) return res.status(400).json({ error: 'Testo vuoto' })
  const ins = db.prepare('INSERT INTO inbox (text, created_at) VALUES (?, ?)')
  const now = nowIso()
  db.transaction(() => { for (const t of texts) ins.run(t, now) })()
  res.status(201).json({ ok: true })
})

inboxRouter.patch('/:id', (req, res) => {
  const text = String(req.body?.text ?? '').trim()
  if (!text) return res.status(400).json({ error: 'Testo vuoto' })
  db.prepare('UPDATE inbox SET text = ? WHERE id = ?').run(text, Number(req.params.id))
  res.json({ ok: true })
})

inboxRouter.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM inbox WHERE id = ?').get(Number(req.params.id))
  db.prepare('DELETE FROM inbox WHERE id = ?').run(Number(req.params.id))
  res.json(row ?? { ok: true })
})
