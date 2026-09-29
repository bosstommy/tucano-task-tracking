import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from './client'
import { DEFAULT_SETTINGS, type FlowStepTemplate, type NewTask, type Note, type Settings, type Status, type Tag, type Task, type TaskPatch } from '../types'

export const keys = {
  tasks: ['tasks'] as const,
  statuses: ['statuses'] as const,
  tags: ['tags'] as const,
  settings: ['settings'] as const,
  notes: (id: number) => ['notes', id] as const,
  backups: ['backups'] as const,
  templates: ['templates'] as const,
  inbox: ['inbox'] as const,
  events: (id: number) => ['events', id] as const,
}

/** Il server può toccare più righe (flussi, attese, diario): riallineo tutto ciò che dipende dalle attività. */
function refreshAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: keys.tasks })
  qc.invalidateQueries({ queryKey: ['events'] })
}

export const useTasks = () => useQuery({ queryKey: keys.tasks, queryFn: api.tasks.list })
export const useStatuses = () => useQuery({ queryKey: keys.statuses, queryFn: api.statuses.list })
export const useTags = () => useQuery({ queryKey: keys.tags, queryFn: api.tags.list })
export const useNotes = (taskId: number) => useQuery({ queryKey: keys.notes(taskId), queryFn: () => api.notes.list(taskId) })
export const useBackups = () => useQuery({ queryKey: keys.backups, queryFn: api.backups.list })
export const useTemplates = () => useQuery({ queryKey: keys.templates, queryFn: api.templates.list })
export const useEvents = (taskId: number) => useQuery({ queryKey: keys.events(taskId), queryFn: () => api.tasks.events(taskId) })

export const useInbox = () => useQuery({ queryKey: keys.inbox, queryFn: api.inbox.list })

export function useInboxMutations() {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: keys.inbox })
  return {
    add: useMutation({ mutationFn: api.inbox.add, onSettled: done }),
    update: useMutation({ mutationFn: ({ id, text }: { id: number; text: string }) => api.inbox.update(id, text), onSettled: done }),
    remove: useMutation({
      mutationFn: (id: number) => api.inbox.remove(id),
      onMutate: (id) => qc.setQueryData<{ id: number }[]>(keys.inbox, (old) => old?.filter((x) => x.id !== id)),
      onSettled: done,
    }),
  }
}

export function useSettings(): Settings {
  const { data } = useQuery({ queryKey: keys.settings, queryFn: api.settings.get })
  return useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...data,
    cardFields: { ...DEFAULT_SETTINGS.cardFields, ...data?.cardFields },
    modules: { ...DEFAULT_SETTINGS.modules, ...data?.modules },
  }), [data])
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: Partial<Settings>) => api.settings.save(s),
    onMutate: (s) => {
      qc.setQueryData<Partial<Settings>>(keys.settings, (old) => ({ ...old, ...s }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.settings }),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (t: NewTask) => api.tasks.create(t),
    onSuccess: (t, vars) => {
      qc.setQueryData<Task[]>(keys.tasks, (old) => [...(old ?? []), t])
      if (vars.tag_names?.length) qc.invalidateQueries({ queryKey: keys.tags })
      refreshAll(qc)
    },
  })
}

/** Aggiornamento ottimistico: l'interfaccia risponde subito, il server conferma dopo. */
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: TaskPatch }) => api.tasks.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.tasks })
      const prev = qc.getQueryData<Task[]>(keys.tasks)
      const { cascade_done: _c, tag_names: _n, ...fields } = patch
      qc.setQueryData<Task[]>(keys.tasks, (old) => old?.map((t) => (t.id === id ? { ...t, ...fields } : t)))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(keys.tasks, ctx.prev),
    onSuccess: (t, { patch }) => {
      qc.setQueryData<Task[]>(keys.tasks, (old) => old?.map((x) => (x.id === t.id ? t : x)))
      if (patch.tag_names?.length) qc.invalidateQueries({ queryKey: keys.tags })
      refreshAll(qc)
    },
  })
}

export function useReorder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: { id: number; position: number }[]) => api.tasks.reorder(items),
    onMutate: (items) => {
      const pos = new Map(items.map((i) => [i.id, i.position]))
      qc.setQueryData<Task[]>(keys.tasks, (old) => old?.map((t) => (pos.has(t.id) ? { ...t, position: pos.get(t.id)! } : t)))
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.tasks.remove(id),
    onMutate: (id) => {
      qc.setQueryData<Task[]>(keys.tasks, (old) => old?.filter((t) => t.id !== id && t.parent_id !== id))
    },
    onSettled: () => refreshAll(qc),
  })
}

export function useRestoreTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.tasks.restore(id),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.tasks }),
  })
}

export function useNoteMutations(taskId: number) {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.notes(taskId) })
    qc.invalidateQueries({ queryKey: keys.tasks })
  }
  return {
    add: useMutation({ mutationFn: ({ content, kind }: { content: string; kind: Note['kind'] }) => api.notes.create(taskId, content, kind), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, content }: { id: number; content: string }) => api.notes.update(id, content), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: number) => api.notes.remove(id), onSuccess: refresh }),
  }
}

export function useStatusMutations() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.statuses })
    qc.invalidateQueries({ queryKey: keys.tasks })
  }
  return {
    create: useMutation({ mutationFn: (s: Partial<Status>) => api.statuses.create(s), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, ...s }: Partial<Status> & { id: number }) => api.statuses.update(id, s), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: number) => api.statuses.remove(id), onSuccess: refresh }),
  }
}

export function useTagMutations() {
  const qc = useQueryClient()
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.tags })
    qc.invalidateQueries({ queryKey: keys.tasks })
  }
  return {
    create: useMutation({ mutationFn: (t: Partial<Tag>) => api.tags.create(t), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, ...t }: Partial<Tag> & { id: number }) => api.tags.update(id, t), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: number) => api.tags.remove(id), onSuccess: refresh }),
  }
}

export function useTemplateMutations() {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: keys.templates })
  return {
    create: useMutation({ mutationFn: (t: { name: string; steps?: FlowStepTemplate[]; from_task_id?: number }) => api.templates.create(t), onSuccess: done }),
    update: useMutation({ mutationFn: ({ id, ...t }: { id: number; name?: string; steps?: FlowStepTemplate[] }) => api.templates.update(id, t), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: number) => api.templates.remove(id), onSuccess: done }),
    apply: useMutation({
      mutationFn: ({ id, title, due }: { id: number; title: string; due: string | null }) => api.templates.apply(id, title, due),
      onSuccess: () => refreshAll(qc),
    }),
  }
}
