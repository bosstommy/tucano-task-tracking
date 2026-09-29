import { useState } from 'react'
import { Archive } from 'lucide-react'
import { useBoard } from '../lib/board'
import { TaskCard } from '../components/TaskCard'
import { Group, cardGrid } from './common'

export function ListView() {
  const board = useBoard()
  const [showArchived, setShowArchived] = useState(false)
  const tasks = showArchived ? board.top.filter((t) => board.matches(t)) : board.visibleTop
  const archivedCount = board.top.filter((t) => board.infos.get(t.id)?.archived).length

  return (
    <div>
      <div className="flex items-center mb-5">
        <h1 className="text-2xl font-bold flex-1">Tutte le attività</h1>
        {archivedCount > 0 && (
          <button onClick={() => setShowArchived(!showArchived)} className={`btn text-sm ${showArchived ? 'bg-surface-2' : 'btn-ghost'}`}>
            <Archive size={15} />{showArchived ? 'Nascondi archiviate' : `Archiviate (${archivedCount})`}
          </button>
        )}
      </div>
      {board.statuses.map((s) => {
        const list = tasks.filter((t) => t.status_id === s.id)
        return (
          <Group key={s.id} id={`list-${s.id}`} title={s.name} tone={s.color} count={list.length} defaultOpen={s.kind !== 'done'}>
            {list.length
              ? <div className={cardGrid}>{list.map((t) => <TaskCard key={t.id} id={t.id} hideStatus />)}</div>
              : <p className="text-sm text-ink-3 pl-6">Niente qui.</p>}
          </Group>
        )
      })}
    </div>
  )
}
