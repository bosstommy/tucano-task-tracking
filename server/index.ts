import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './db.ts'
import { tasksRouter } from './routes/tasks.ts'
import { notesRouter, statusesRouter, tagsRouter, settingsRouter, dataRouter } from './routes/misc.ts'
import { scheduleBackups } from './backup.ts'
import { templatesRouter } from './routes/templates.ts'
import { inboxRouter } from './routes/inbox.ts'
import { APP_VERSION } from '../shared-version.ts'

const PORT = Number(process.env.TUCANO_PORT ?? 3001)
const app = express()
app.use(express.json({ limit: '2mb' }))

app.get('/api/version', (_req, res) => res.json({ version: APP_VERSION }))
app.use('/api/tasks', tasksRouter)
app.use('/api/notes', notesRouter)
app.use('/api/statuses', statusesRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/templates', templatesRouter)
app.use('/api/inbox', inboxRouter)
app.use('/api', dataRouter)

// In produzione serve anche il frontend compilato.
const dist = path.join(ROOT, 'dist')
if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('/{*splat}', (req, res, next) => (req.path.startsWith('/api/') ? next() : res.sendFile(path.join(dist, 'index.html'))))
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Percorso API sconosciuto' }))

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: String(err?.message ?? err) })
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🦜 TUCANO in ascolto su http://localhost:${PORT}`)
  scheduleBackups()
})
