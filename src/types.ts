export type StatusKind = 'todo' | 'doing' | 'waiting' | 'done'

export interface Status {
  id: number
  name: string
  color: string
  kind: StatusKind
  position: number
}

export interface Tag {
  id: number
  name: string
  color: string
}

export interface Task {
  id: number
  parent_id: number | null
  title: string
  description: string
  status_id: number
  on_fire: boolean
  start_date: string | null
  end_date: string | null
  due_date: string | null
  estimate_days: number | null
  /** Avvisami N giorni prima della scadenza (null = nessun promemoria). */
  remind_days: number | null
  position: number
  created_at: string
  updated_at: string
  is_flow: boolean
  /** Dov'è la palla: false = da me (predefinito), true = nel campo degli altri (sto aspettando). */
  ball_out: boolean
  /** Da quando la palla è nel campo degli altri. */
  ball_since: string | null
  tag_ids: number[]
  note_count: number
}

export interface TaskEvent {
  id: number
  task_id: number
  type: string
  text: string
  at: string
}

export interface FlowStepTemplate {
  title: string
  /** La tappa la fanno gli altri: quando diventa corrente la palla è nel loro campo. */
  others: boolean
  estimate_days: number | null
}

export interface FlowTemplate {
  id: number
  name: string
  steps: FlowStepTemplate[]
}

export interface InboxItem {
  id: number
  text: string
  created_at: string
}

export interface Note {
  id: number
  task_id: number
  kind: 'text' | 'voice'
  content: string
  created_at: string
}

export interface NewTask {
  title: string
  parent_id?: number | null
  description?: string
  status_id?: number
  on_fire?: boolean
  start_date?: string | null
  due_date?: string | null
  estimate_days?: number | null
  tag_ids?: number[]
  tag_names?: string[]
  is_flow?: boolean
  ball_out?: boolean
}

export type TaskPatch = Partial<Omit<Task, 'id' | 'tag_ids' | 'note_count' | 'created_at' | 'updated_at' | 'ball_since'>> & {
  tag_ids?: number[]
  tag_names?: string[]
  cascade_done?: boolean
}

export type CardField = 'status' | 'fire' | 'progress' | 'due' | 'notes' | 'tags' | 'estimate' | 'dates'
export type ModuleId = 'list' | 'kanban' | 'timeline'
export type ViewId = 'focus' | ModuleId | 'settings'

export interface Settings {
  cardFields: Record<CardField, boolean>
  modules: Record<ModuleId, boolean>
  /** Giorni dopo cui le attività completate spariscono dalle viste (0 = mai). */
  hideDoneAfterDays: number
  /** Giorni lavorativi di preavviso prima della data "inizia entro". */
  leadDays: number
  /** Ore lavorative in una giornata, per convertire le stime in ore. */
  hoursPerDay: number
  /** Dimensione del testo in % (100 = standard del browser). */
  fontScale: number
  /** Sottoattività sempre visibili dentro le card. */
  expandSubtasks: boolean
  /** Focus raggruppato per stato (In fiamme · In corso · Backlog) invece che in un'unica griglia. */
  groupByStatus: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  cardFields: {
    status: true, fire: true, progress: true, due: true, notes: true,
    tags: false, estimate: false, dates: false,
  },
  modules: { list: true, kanban: true, timeline: true },
  hideDoneAfterDays: 7,
  leadDays: 2,
  hoursPerDay: 8,
  fontScale: 130,
  expandSubtasks: false,
  groupByStatus: false,
}
