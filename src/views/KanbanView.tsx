import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, closestCorners, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useBoard, useTaskActions } from '../lib/board'
import { TaskCard } from '../components/TaskCard'
import type { Status, Task } from '../types'

/** Posizione tra due vicini (numeri reali: niente rinumerazioni). */
export const between = (prev?: number, next?: number) =>
  prev == null && next == null ? 1 : prev == null ? next! - 1 : next == null ? prev + 1 : (prev + next) / 2

export function KanbanView() {
  const board = useBoard()
  const { setStatus, update } = useTaskActions()
  const [activeId, setActiveId] = useState<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const columns = board.statuses.map((s) => ({
    status: s,
    tasks: board.visibleTop.filter((t) => t.status_id === s.id).sort((a, b) => a.position - b.position),
  }))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const task = board.byId.get(Number(active.id))
    if (!task) return
    const targetStatus: number = over.data.current?.statusId
    if (targetStatus == null) return
    const col = columns.find((c) => c.status.id === targetStatus)!.tasks
    let ordered: Task[]
    if (task.status_id === targetStatus) {
      const from = col.findIndex((t) => t.id === task.id)
      const to = over.data.current?.type === 'card' ? col.findIndex((t) => t.id === Number(over.id)) : col.length - 1
      if (from === to) return
      ordered = arrayMove(col, from, to)
    } else {
      const idx = over.data.current?.type === 'card' ? col.findIndex((t) => t.id === Number(over.id)) : col.length
      ordered = [...col.slice(0, idx), task, ...col.slice(idx)]
    }
    const i = ordered.findIndex((t) => t.id === task.id)
    const position = between(ordered[i - 1]?.position, ordered[i + 1]?.position)
    if (task.status_id !== targetStatus) setStatus(task, targetStatus, { position })
    else update(task.id, { position })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(Number(e.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 items-start min-h-[70vh]">
        {columns.map((c) => <Column key={c.status.id} status={c.status} tasks={c.tasks} />)}
      </div>
      <DragOverlay>{activeId != null && <TaskCard id={activeId} hideStatus className="rotate-2 shadow-pop" />}</DragOverlay>
    </DndContext>
  )
}

function Column({ status, tasks }: { status: Status; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status.id}`, data: { statusId: status.id, type: 'column' } })
  return (
    <div
      ref={setNodeRef}
      className={`w-[20rem] shrink-0 rounded-2xl p-2.5 transition-colors ${isOver ? 'bg-surface-2' : 'bg-surface-2/50'}`}
    >
      <div className="flex items-center gap-2 px-1.5 pb-2.5 pt-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: status.color }} />
        <h2 className="font-bold text-sm flex-1">{status.name}</h2>
        <span className="text-xs font-bold text-ink-3">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-16">
          {tasks.map((t) => <SortableCard key={t.id} task={t} />)}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { statusId: task.status_id, type: 'card' },
  })
  return (
    <TaskCard
      id={task.id}
      hideStatus
      innerRef={setNodeRef}
      dragProps={{ ...attributes, ...listeners }}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
    />
  )
}
