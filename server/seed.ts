// Dati di esempio: `npm run seed` (oppure `npm run seed:test` per la cartella .testdata).
// Non tocca un database che contiene già attività.
import { db, DB_PATH, nowIso, todayLocal, addWorkdays, logEvent } from './db.ts'

type Row = Record<string, any>

const existing = (db.prepare('SELECT count(*) AS c FROM tasks').get() as Row).c
if (existing > 0) {
  console.log(`[seed] ${DB_PATH} contiene già ${existing} attività: nessuna modifica.`)
  process.exit(0)
}

const today = todayLocal()
const now = nowIso()
const statusId = (kind: string) => (db.prepare('SELECT id FROM statuses WHERE kind = ? ORDER BY position LIMIT 1').get(kind) as Row).id as number

const insertTask = db.prepare(`
  INSERT INTO tasks (parent_id, title, description, status_id, urgent, important, on_fire,
    start_date, end_date, due_date, estimate_days, position, ball_out, ball_since, created_at, updated_at)
  VALUES (@parent_id, @title, @description, @status_id, @urgent, @important, @on_fire,
    @start_date, @end_date, @due_date, @estimate_days, @position, @ball_out, @ball_since, @now, @now)`)

let position = 0
function task(t: { title: string; kind: string; description?: string; parent_id?: number; on_fire?: boolean; start?: string; end?: string | null; due?: string | null; estimate?: number | null; ball_out?: boolean; tags?: string[] }) {
  const id = Number(insertTask.run({
    parent_id: t.parent_id ?? null,
    title: t.title,
    description: t.description ?? '',
    status_id: statusId(t.kind),
    urgent: 0,
    important: 0,
    on_fire: t.on_fire ? 1 : 0,
    start_date: t.start ?? today,
    end_date: t.end ?? null,
    due_date: t.due ?? null,
    estimate_days: t.estimate ?? null,
    position: ++position,
    ball_out: t.ball_out ? 1 : 0,
    ball_since: t.ball_out ? today : null,
    now,
  }).lastInsertRowid)
  for (const name of t.tags ?? []) {
    db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(id, tagIds[name])
  }
  logEvent(id, 'created', 'Attività creata (dati di esempio)')
  return id
}

const tagIds: Record<string, number> = {}
const contactIds: Record<string, number> = {}

db.transaction(() => {
  for (const [name, color] of [['Esempio', '#3BB3A9'], ['Clienti', '#F2C14E'], ['Casa', '#A39A90']]) {
    tagIds[name] = Number(db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color).lastInsertRowid)
  }
  for (const [name, color, kind] of [['Mario Rossi', '#3BB3A9', 'cliente'], ['Ufficio acquisti', '#F2C14E', 'ufficio']]) {
    contactIds[name] = Number(db.prepare('INSERT INTO contacts (name, color, kind) VALUES (?, ?, ?)').run(name, color, kind).lastInsertRowid)
  }

  task({ title: 'Benvenuto in TUCANO: idea nel Backlog, trascinami in "In corso"', kind: 'todo', description: 'Questa è un\'attività di esempio. Puoi modificarla o cancellarla.', tags: ['Esempio'] })

  task({ title: 'Preparare il preventivo per il cliente', kind: 'doing', due: addWorkdays(today, 3), estimate: 2, on_fire: true, tags: ['Esempio', 'Clienti'] })

  task({ title: 'Attendere conferma ordine dal fornitore', kind: 'doing', ball_out: true, due: addWorkdays(today, 5), tags: ['Esempio'] })

  task({ title: 'Ricordare a Mario di inviare i documenti', kind: 'doing', ball_out: true, tags: ['Esempio', 'Clienti'] })

  const parent = task({ title: 'Organizzare la riunione di lunedì', kind: 'doing', due: addWorkdays(today, 2), tags: ['Esempio'] })
  task({ title: 'Prenotare la sala', kind: 'done', parent_id: parent, end: today })
  task({ title: 'Inviare l\'ordine del giorno', kind: 'doing', parent_id: parent })

  task({ title: 'Chiamare l\'idraulico', kind: 'todo', tags: ['Esempio', 'Casa'] })
  task({ title: 'Aggiornare l\'inventario', kind: 'done', end: today, tags: ['Esempio'] })
})()

console.log(`[seed] dati di esempio creati in ${DB_PATH}`)
