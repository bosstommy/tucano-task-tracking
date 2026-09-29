import fs from 'node:fs'
import path from 'node:path'
import { db, BACKUP_DIR, todayLocal } from './db.ts'

export { BACKUP_DIR }
const KEEP = 14

export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^tucano-.*\.db$/.test(f))
    .sort()
    .reverse()
    .map((f) => ({ file: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }))
}

/** Copia a caldo del DB. Una copia al giorno (o forzata), conserva le ultime KEEP. */
export async function runBackup(force = false) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const target = path.join(BACKUP_DIR, `tucano-${todayLocal()}.db`)
  if (!force && fs.existsSync(target)) return { file: path.basename(target), skipped: true }
  await db.backup(target)
  for (const old of listBackups().slice(KEEP)) fs.rmSync(path.join(BACKUP_DIR, old.file))
  return { file: path.basename(target), skipped: false }
}

export function scheduleBackups() {
  const tick = () => runBackup().then(
    (r) => !r.skipped && console.log(`[backup] creato ${r.file}`),
    (e) => console.error('[backup] errore', e),
  )
  tick()
  setInterval(tick, 60 * 60 * 1000) // controlla ogni ora, copia una volta al giorno
}
