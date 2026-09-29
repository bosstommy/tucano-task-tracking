import { Router } from 'express'
import { db, logEvent, nowIso, todayLocal } from '../db.ts'
import { afterStatusChange, firstStatus, setBall, statusKind } from '../flow.ts'

export const tasksRouter = Router()

type Row = Record<string, any>

const BOOL_FIELDS = ['on_fire', 'is_flow'] as const
const EDITABLE = [
  'parent_id', 'title', 'description', 'status_id', 'on_fire',
  'start_date', 'end_date', 'due_date', 'estimate_days', 'remind_days', 'position', 'is_flow',
] as const

function mapTask(r: Row) {
  return {
    id: r.id,
    parent_id: r.parent_id,
    title: r.title,
    description: r.description,
    status_id: r.status_id,
    on_fire: !!r.on_fire,
    is_flow: !!r.is_flow,
    ball_out: !!r.ball_out,
    ball_since: r.ball_since ?? null,
    start_date: r.start_date,
    end_date: r.end_date,
    due_date: r.due_date,
    estimate_days: r.estimate_days,
    remind_days: r.remind_days ?? null,
    position: r.position,
    created_at: r.created_at,
    updated_at: r.updated_at,
    tag_ids: r.tag_ids ? String(r.tag_ids).split(',').map(Number) : [],
    note_count: r.note_count ?? 0,
  }
}

const SELECT = `
  SELECT t.*,
    (SELECT group_concat(tag_id) FROM task_tags WHERE task_id = t.id) AS tag_ids,
    (SELECT count(*) FROM notes WHERE task_id = t.id) AS note_count
  FROM tasks t`

export function getTask(id: number) {
  const r = db.prepare(`${SELECT} WHERE t.id = ?`).get(id) as Row | undefined
  return r ? mapTask(r) : null
}

/** Crea al volo i tag passati per nome e restituisce gli id. */
function resolveTagNames(names: string[]): number[] {
  const palette = ['#E8894A', '#3BB3A9', '#F2C14E', '#6BAA75', '#9A8FD8', '#EF6F6C', '#5B9BD5']
  return names.map((raw) => {
    const name = raw.trim()
    const found = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as Row | undefined
    if (found) return found.id
    const count = (db.prepare('SELECT count(*) AS c FROM tags').get() as Row).c
    return Number(db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, palette[count % palette.length]).lastInsertRowid)
  })
}

function setTags(taskId: number, tagIds: number[]) {
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId)
  const ins = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)')
  for (const t of tagIds) ins.run(taskId, t)
}

tasksRouter.get('/', (_req, res) => {
  const rows = db.prepare(`${SELECT} WHERE t.deleted_at IS NULL ORDER BY t.position`).all() as Row[]
  res.json(rows.map(mapTask))
})

tasksRouter.post('/', (req, res) => {
  const b = req.body ?? {}
  if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'Titolo obbligatorio' })
  const now = nowIso()
  // Se non si sceglie altro, un'attività nasce "in corso".
  const statusId = b.status_id ?? firstStatus('doing')
  const parentId = b.parent_id ?? null
  const maxPos = (db.prepare('SELECT max(position) AS m FROM tasks WHERE parent_id IS ?').get(parentId) as Row).m ?? 0
  const kind = statusKind(statusId)

  const id = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO tasks (parent_id, title, description, status_id, on_fire,
        start_date, end_date, due_date, estimate_days, position, is_flow, ball_out, ball_since, created_at, updated_at)
      VALUES (@parent_id, @title, @description, @status_id, @on_fire,
        @start_date, @end_date, @due_date, @estimate_days, @position, @is_flow, @ball_out, @ball_since, @now, @now)`).run({
      parent_id: parentId,
      title: String(b.title).trim(),
      description: b.description ?? '',
      status_id: statusId,
      on_fire: b.on_fire ? 1 : 0,
      start_date: b.start_date ?? todayLocal(),
      end_date: b.end_date ?? (kind === 'done' ? todayLocal() : null),
      due_date: b.due_date ?? null,
      estimate_days: b.estimate_days ?? null,
      position: maxPos + 1,
      is_flow: b.is_flow ? 1 : 0,
      ball_out: b.ball_out && !parentId ? 1 : 0,
      ball_since: b.ball_out && !parentId ? todayLocal() : null,
      now,
    })
    const newId = Number(info.lastInsertRowid)
    const tagIds = [...(b.tag_ids ?? []), ...resolveTagNames(b.tag_names ?? [])]
    if (tagIds.length) setTags(newId, tagIds)
    logEvent(newId, 'created', 'Creata')
    if (parentId) {
      const parent = db.prepare('SELECT is_flow FROM tasks WHERE id = ?').get(parentId) as Row
      logEvent(parentId, 'child', `${parent?.is_flow ? 'Nuova tappa' : 'Nuova sottoattività'}: ${String(b.title).trim()}`)
    }
    if (b.ball_out && !parentId) logEvent(newId, 'ball', 'Palla nel campo degli altri')
    return newId
  })()
  res.status(201).json(getTask(id))
})

tasksRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Row | undefined
  if (!current) return res.status(404).json({ error: 'Attività non trovata' })
  const b = req.body ?? {}
  const sets: Record<string, unknown> = {}

  for (const f of EDITABLE) {
    if (f in b) sets[f] = (BOOL_FIELDS as readonly string[]).includes(f) ? (b[f] ? 1 : 0) : b[f]
  }

  // Data di fine: se toccata a mano diventa "manuale", altrimenti segue lo stato.
  if ('end_date' in b) sets.end_date_manual = b.end_date ? 1 : 0
  const statusChanged = 'status_id' in b && b.status_id !== current.status_id
  const was = statusKind(current.status_id)
  const now = statusChanged ? statusKind(b.status_id) : was
  if (statusChanged) {
    if (now === 'done' && !current.end_date && !('end_date' in b)) sets.end_date = todayLocal()
    if (was === 'done' && now !== 'done' && !current.end_date_manual && !('end_date' in b)) sets.end_date = null
    // Riprendere in mano un'attività la porta "in corso": se non ha inizio, lo fissa ora.
    if (now === 'doing' && !current.start_date) sets.start_date = todayLocal()
  }

  db.transaction(() => {
    const keys = Object.keys(sets)
    if (keys.length) {
      db.prepare(`UPDATE tasks SET ${keys.map((k) => `${k} = @${k}`).join(', ')}, updated_at = @updated_at WHERE id = @id`)
        .run({ ...sets, updated_at: nowIso(), id })
    }
    if (Array.isArray(b.tag_ids) || Array.isArray(b.tag_names)) {
      setTags(id, [...(b.tag_ids ?? []), ...resolveTagNames(b.tag_names ?? [])])
    }
    // Chiusura a cascata delle sottoattività aperte.
    if (b.cascade_done && 'status_id' in b) {
      const today = todayLocal()
      db.prepare(`
        UPDATE tasks SET status_id = ?, end_date = coalesce(end_date, ?), updated_at = ?
        WHERE parent_id = ? AND deleted_at IS NULL
          AND status_id NOT IN (SELECT id FROM statuses WHERE kind = 'done')`)
        .run(b.status_id, today, nowIso(), id)
    }

    // Diario
    if (statusChanged) afterStatusChange(id, was, now)
    if ('due_date' in b && b.due_date !== current.due_date) logEvent(id, 'due', b.due_date ? `Scadenza: ${b.due_date}` : 'Scadenza rimossa')
    if ('title' in b && b.title !== current.title) logEvent(id, 'title', `Rinominata: ${b.title}`)
    if ('is_flow' in b && !!b.is_flow !== !!current.is_flow) {
      logEvent(id, 'flow', b.is_flow ? 'Trasformata in flusso a tappe' : 'Non più un flusso')
    }
    // La palla appartiene solo alla card madre: le sottoattività non ce l'hanno.
    if ('ball_out' in b && current.parent_id == null) setBall(id, !!b.ball_out)
  })()
  res.json(getTask(id))
})

tasksRouter.post('/reorder', (req, res) => {
  const items: { id: number; position: number; status_id?: number }[] = req.body?.items ?? []
  const upd = db.prepare('UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?')
  db.transaction(() => { for (const i of items) upd.run(i.position, nowIso(), i.id) })()
  res.json({ ok: true })
})

tasksRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  const stamp = nowIso()
  db.prepare('UPDATE tasks SET deleted_at = ? WHERE (id = ? OR parent_id = ?) AND deleted_at IS NULL').run(stamp, id, id)
  res.json({ ok: true, deleted_at: stamp })
})

tasksRouter.post('/:id/restore', (req, res) => {
  const id = Number(req.params.id)
  const row = db.prepare('SELECT deleted_at FROM tasks WHERE id = ?').get(id) as Row | undefined
  if (!row?.deleted_at) return res.json({ ok: true })
  db.prepare('UPDATE tasks SET deleted_at = NULL WHERE (id = ? OR parent_id = ?) AND deleted_at = ?').run(id, id, row.deleted_at)
  res.json(getTask(id))
})

tasksRouter.get('/:id/events', (req, res) => {
  res.json(db.prepare('SELECT * FROM events WHERE task_id = ? ORDER BY at DESC, id DESC').all(Number(req.params.id)))
})
