import type { InboxItem, FlowStepTemplate, FlowTemplate, NewTask, Note, Settings, Status, Tag, Task, TaskEvent, TaskPatch } from '../types'

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Errore ${res.status}`)
  }
  return res.json()
}

export const api = {
  tasks: {
    list: () => req<Task[]>('GET', '/tasks'),
    create: (t: NewTask) => req<Task>('POST', '/tasks', t),
    update: (id: number, p: TaskPatch) => req<Task>('PATCH', `/tasks/${id}`, p),
    remove: (id: number) => req<{ ok: true }>('DELETE', `/tasks/${id}`),
    restore: (id: number) => req<Task>('POST', `/tasks/${id}/restore`),
    reorder: (items: { id: number; position: number }[]) => req('POST', '/tasks/reorder', { items }),
    events: (id: number) => req<TaskEvent[]>('GET', `/tasks/${id}/events`),
  },
  templates: {
    list: () => req<FlowTemplate[]>('GET', '/templates'),
    create: (t: { name: string; steps?: FlowStepTemplate[]; from_task_id?: number }) => req<FlowTemplate>('POST', '/templates', t),
    update: (id: number, t: Partial<FlowTemplate>) => req<FlowTemplate>('PATCH', `/templates/${id}`, t),
    remove: (id: number) => req('DELETE', `/templates/${id}`),
    apply: (id: number, title: string, due_date: string | null) => req<{ id: number }>('POST', `/templates/${id}/apply`, { title, due_date }),
  },
  notes: {
    list: (taskId: number) => req<Note[]>('GET', `/notes/task/${taskId}`),
    create: (taskId: number, content: string, kind: Note['kind']) => req<Note>('POST', `/notes/task/${taskId}`, { content, kind }),
    update: (id: number, content: string) => req<Note>('PATCH', `/notes/${id}`, { content }),
    remove: (id: number) => req('DELETE', `/notes/${id}`),
  },
  inbox: {
    list: () => req<InboxItem[]>('GET', '/inbox'),
    add: (texts: string[]) => req('POST', '/inbox', { texts }),
    update: (id: number, text: string) => req('PATCH', `/inbox/${id}`, { text }),
    remove: (id: number) => req('DELETE', `/inbox/${id}`),
  },
  statuses: {
    list: () => req<Status[]>('GET', '/statuses'),
    create: (s: Partial<Status>) => req<Status>('POST', '/statuses', s),
    update: (id: number, s: Partial<Status>) => req<Status>('PATCH', `/statuses/${id}`, s),
    remove: (id: number) => req('DELETE', `/statuses/${id}`),
  },
  tags: {
    list: () => req<Tag[]>('GET', '/tags'),
    create: (t: Partial<Tag>) => req<Tag>('POST', '/tags', t),
    update: (id: number, t: Partial<Tag>) => req<Tag>('PATCH', `/tags/${id}`, t),
    remove: (id: number) => req('DELETE', `/tags/${id}`),
  },
  settings: {
    get: () => req<Partial<Settings>>('GET', '/settings'),
    save: (s: Partial<Settings>) => req<Partial<Settings>>('PUT', '/settings', s),
  },
  backups: {
    list: () => req<{ file: string; size: number }[]>('GET', '/backups'),
    run: () => req<{ file: string }>('POST', '/backup'),
  },
}
