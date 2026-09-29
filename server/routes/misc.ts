import { Router } from 'express'
import { db, nowIso } from '../db.ts'
import { runBackup, listBackups } from '../backup.ts'

type Row = Record<string, any>

// ---------- Note ----------
export const notesRouter = Router()

notesRouter.get('/task/:taskId', (req, res) => {
  res.json(db.prepare('SELECT * FROM notes WHERE task_id = ? ORDER BY created_at DESC').all(Number(req.params.taskId)))
})

notesRouter.post('/task/:taskId', (req, res) => {
  const content = String(req.body?.content ?? '').trim()
  if (!content) return res.status(400).json({ error: 'Nota vuota' })
  const kind = req.body?.kind === 'voice' ? 'voice' : 'text'
  const info = db.prepare('INSERT INTO notes (task_id, kind, content, created_at) VALUES (?, ?, ?, ?)')
    .run(Number(req.params.taskId), kind, content, nowIso())
  res.status(201).json(db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid))
})

notesRouter.patch('/:id', (req, res) => {
  db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(String(req.body?.content ?? ''), Number(req.params.id))
  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(Number(req.params.id)))
})

notesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(Number(req.params.id))
  res.json({ ok: true })
})

// ---------- Stati ----------
export const statusesRouter = Router()

statusesRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM statuses ORDER BY position').all())
})

statusesRouter.post('/', (req, res) => {
  const { name = 'Nuovo stato', color = '#9A8FD8', kind = 'todo' } = req.body ?? {}
  const max = (db.prepare('SELECT max(position) AS m FROM statuses').get() as Row).m ?? 0
  const info = db.prepare('INSERT INTO statuses (name, color, kind, position) VALUES (?, ?, ?, ?)').run(name, color, kind, max + 1)
  res.status(201).json(db.prepare('SELECT * FROM statuses WHERE id = ?').get(info.lastInsertRowid))
})

statusesRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const b = req.body ?? {}
  for (const f of ['name', 'color', 'kind', 'position']) {
    if (f in b) db.prepare(`UPDATE statuses SET ${f} = ? WHERE id = ?`).run(b[f], id)
  }
  res.json(db.prepare('SELECT * FROM statuses WHERE id = ?').get(id))
})

statusesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  const count = (db.prepare('SELECT count(*) AS c FROM statuses').get() as Row).c
  if (count <= 1) return res.status(400).json({ error: 'Serve almeno uno stato' })
  const fallback = (db.prepare('SELECT id FROM statuses WHERE id != ? ORDER BY kind = \'todo\' DESC, position LIMIT 1').get(id) as Row).id
  db.transaction(() => {
    db.prepare('UPDATE tasks SET status_id = ? WHERE status_id = ?').run(fallback, id)
    db.prepare('DELETE FROM statuses WHERE id = ?').run(id)
  })()
  res.json({ ok: true })
})

// ---------- Tag ----------
export const tagsRouter = Router()

tagsRouter.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM tags ORDER BY name').all())
})

tagsRouter.post('/', (req, res) => {
  const { name, color = '#3BB3A9' } = req.body ?? {}
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obbligatorio' })
  const existing = db.prepare('SELECT * FROM tags WHERE name = ?').get(name.trim())
  if (existing) return res.json(existing)
  const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name.trim(), color)
  res.status(201).json(db.prepare('SELECT * FROM tags WHERE id = ?').get(info.lastInsertRowid))
})

tagsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const b = req.body ?? {}
  for (const f of ['name', 'color']) {
    if (f in b) db.prepare(`UPDATE tags SET ${f} = ? WHERE id = ?`).run(b[f], id)
  }
  res.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(id))
})

tagsRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tags WHERE id = ?').run(Number(req.params.id))
  res.json({ ok: true })
})

// ---------- Impostazioni ----------
export const settingsRouter = Router()

function readSettings() {
  const out: Record<string, unknown> = {}
  for (const r of db.prepare('SELECT key, value FROM settings').all() as Row[]) out[r.key] = JSON.parse(r.value)
  return out
}

settingsRouter.get('/', (_req, res) => res.json(readSettings()))

settingsRouter.put('/', (req, res) => {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  db.transaction(() => {
    for (const [k, v] of Object.entries(req.body ?? {})) up.run(k, JSON.stringify(v))
  })()
  res.json(readSettings())
})

// ---------- Export & backup ----------
export const dataRouter = Router()

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

dataRouter.get('/export', (req, res) => {
  const stamp = new Date().toISOString().slice(0, 10)
  if (req.query.format === 'csv') {
    const rows = db.prepare(`
      SELECT t.id, p.title AS attivita_padre, t.title AS titolo, s.name AS stato,
        t.on_fire AS in_fiamme, CASE WHEN t.ball_out THEN 'altri' ELSE 'me' END AS palla,
        t.start_date AS inizio, t.end_date AS fine, t.due_date AS scadenza, t.estimate_days AS stima_giorni,
        (SELECT group_concat(g.name, ', ') FROM task_tags tt JOIN tags g ON g.id = tt.tag_id WHERE tt.task_id = t.id) AS tag,
        t.description AS descrizione
      FROM tasks t
      JOIN statuses s ON s.id = t.status_id
      LEFT JOIN tasks p ON p.id = t.parent_id
      WHERE t.deleted_at IS NULL
      ORDER BY coalesce(t.parent_id, t.id), t.parent_id IS NOT NULL, t.position`).all() as Row[]
    const head = rows.length ? Object.keys(rows[0]) : ['id']
    const csv = '﻿' + [head.join(';'), ...rows.map((r) => head.map((h) => csvCell(r[h])).join(';'))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="tucano-${stamp}.csv"`)
    return res.send(csv)
  }
  const dump = {
    exported_at: nowIso(),
    statuses: db.prepare('SELECT * FROM statuses').all(),
    tasks: db.prepare('SELECT * FROM tasks WHERE deleted_at IS NULL').all(),
    tags: db.prepare('SELECT * FROM tags').all(),
    task_tags: db.prepare('SELECT * FROM task_tags').all(),
    notes: db.prepare('SELECT * FROM notes').all(),
    inbox: db.prepare('SELECT * FROM inbox').all(),
    settings: readSettings(),
  }
  res.setHeader('Content-Disposition', `attachment; filename="tucano-${stamp}.json"`)
  res.json(dump)
})

dataRouter.get('/backups', (_req, res) => res.json(listBackups()))

dataRouter.post('/backup', async (_req, res) => {
  try {
    res.json(await runBackup(true))
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})
