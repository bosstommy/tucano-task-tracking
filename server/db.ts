import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { migrations } from './migrations.ts'

export const ROOT = path.resolve(import.meta.dirname, '..')
// TUCANO_DATA permette di usare una cartella dati diversa (es. per le prove), senza toccare i dati veri.
export const DATA_DIR = process.env.TUCANO_DATA ? path.resolve(process.env.TUCANO_DATA) : path.join(ROOT, 'data')
export const BACKUP_DIR = process.env.TUCANO_DATA ? path.join(DATA_DIR, 'backups') : path.join(ROOT, 'backups')
export const DB_PATH = path.join(DATA_DIR, 'tucano.db')

fs.mkdirSync(DATA_DIR, { recursive: true })

// Primo avvio: si parte da un database d'esempio (una sola attività) incluso nel repository.
const TEMPLATE_DB = path.join(ROOT, 'seed', 'tucano.example.db')
if (!fs.existsSync(DB_PATH) && fs.existsSync(TEMPLATE_DB)) fs.copyFileSync(TEMPLATE_DB, DB_PATH)

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function migrate() {
  const current = db.pragma('user_version', { simple: true }) as number
  // Copia di sicurezza prima di toccare la struttura di un DB già in uso.
  if (current > 0 && current < migrations.length) {
    db.pragma('wal_checkpoint(TRUNCATE)')
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
    fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, `pre-migrazione-v${current + 1}-${Date.now()}.db`))
  }
  for (let v = current; v < migrations.length; v++) {
    db.transaction(() => {
      db.exec(migrations[v])
      db.pragma(`user_version = ${v + 1}`)
    })()
    console.log(`[db] migrazione ${v + 1} applicata`)
  }
}
migrate()

// Pulizia definitiva degli elementi nel cestino da più di 7 giorni.
db.prepare(`DELETE FROM tasks WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-7 days')`).run()

export const nowIso = () => new Date().toISOString()

export function todayLocal() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Diario: ogni cambiamento importante lascia una traccia datata. */
export function logEvent(taskId: number, type: string, text: string) {
  db.prepare('INSERT INTO events (task_id, type, text, at) VALUES (?, ?, ?, ?)').run(taskId, type, text, nowIso())
}

export function addWorkdays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  let left = n
  while (left > 0) {
    dt.setDate(dt.getDate() + 1)
    if (dt.getDay() !== 0 && dt.getDay() !== 6) left--
  }
  const p = (x: number) => String(x).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

/** Etichetta leggibile per il diario. */
export const ballLabel = (out: boolean) => (out ? 'nel campo degli altri' : 'da me')
