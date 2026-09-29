import { Inbox } from './components/Inbox'
import { useEffect, useState } from 'react'
import { Sun, Moon, Settings as Cog, Search, ListTree, LayoutList, Crosshair, Rows3, Columns3, GanttChart, X } from 'lucide-react'
import { useUI } from './ui'
import { useBoard } from './lib/board'
import { useSaveSettings } from './api/hooks'
import { useQuery } from '@tanstack/react-query'
import { APP_VERSION } from '../shared-version'
import { Toucan } from './components/Toucan'
import { QuickAdd } from './components/QuickAdd'
import { TaskDrawer } from './components/TaskDrawer'
import { TaskForm } from './components/TaskForm'
import { VoiceFab } from './components/VoiceFab'
import { TagChip } from './components/bits'
import { FocusView } from './views/FocusView'
import { ListView } from './views/ListView'
import { KanbanView } from './views/KanbanView'
import { TimelineView } from './views/TimelineView'
import { SettingsView } from './views/SettingsView'
import type { ViewId } from './types'

const VIEWS: { id: Exclude<ViewId, 'settings'>; label: string; icon: React.ReactNode }[] = [
  { id: 'focus', label: 'Focus', icon: <Crosshair size={16} /> },
  { id: 'list', label: 'Lista', icon: <Rows3 size={16} /> },
  { id: 'kanban', label: 'Kanban', icon: <Columns3 size={16} /> },
  { id: 'timeline', label: 'Timeline', icon: <GanttChart size={16} /> },
]

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121820' : '#FBF7F0')
    try { localStorage.setItem('tucano-theme', dark ? 'dark' : 'light') } catch { /* ok */ }
  }, [dark])
  return { dark, toggle: () => setDark((d) => !d) }
}

const isTyping = () => {
  const el = document.activeElement as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export default function App() {
  const ui = useUI()
  const board = useBoard()
  const theme = useTheme()
  const saveSettings = useSaveSettings()
  // Se il server è di una versione precedente le modifiche non verrebbero salvate: lo dico subito.
  const serverVersion = useQuery({
    queryKey: ['version'],
    queryFn: () => fetch('/api/version').then((r) => r.json()).then((j) => j.version as number).catch(() => 0),
    refetchInterval: 60_000,
  })
  const outdated = serverVersion.data !== undefined && serverVersion.data !== APP_VERSION
  const expandAll = board.settings.expandSubtasks
  const toggleExpandAll = () => { ui.clearExpandOverrides(); saveSettings.mutate({ expandSubtasks: !expandAll }) }
  const byStatus = board.settings.groupByStatus
  const views = VIEWS.filter((v) => v.id === 'focus' || board.settings.modules[v.id])
  const scale = board.settings.fontScale
  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--ui-font', `${scale}%`)
    root.setProperty('--ui-zoom', String(scale / 100))
    try { localStorage.setItem('tucano-scale', String(scale)) } catch { /* ok */ }
  }, [scale])
  const view = ui.view === 'settings' || views.some((v) => v.id === ui.view) ? ui.view : 'focus'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.quickAddRef.current?.focus(); return }
      if (e.key === 'Escape') {
        if (isTyping()) (document.activeElement as HTMLElement).blur()
        else if (ui.selectedId != null) ui.closeTask()
        return
      }
      if (isTyping() || e.ctrlKey || e.metaKey || e.altKey || ui.formPrefill) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); ui.quickAddRef.current?.focus() }
      else if (e.key === '/') { e.preventDefault(); ui.searchRef.current?.focus() }
      else if (e.key === 'd' || e.key === 'D') theme.toggle()
      else if (e.key === 'e' || e.key === 'E') toggleExpandAll()
      else if (/^[1-4]$/.test(e.key)) { const v = views[Number(e.key) - 1]; if (v) ui.setView(v.id) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="min-h-full flex flex-col">
      {outdated && (
        <div className="bg-coral text-white text-center font-bold px-4 py-2.5">
          ⚠️ TUCANO è stato aggiornato ma il server in esecuzione è quello vecchio: chiudi la finestra nera e riapri «Avvia TUCANO.bat».
        </div>
      )}
      <header className="sticky top-0 z-30 bg-bg/80 backdrop-blur-md border-b border-line/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2 flex items-center gap-3 sm:gap-5">
          <button onClick={() => ui.setView('focus')} className="flex items-center gap-1.5 shrink-0" title="TUCANO — Focus">
            <Toucan size={44} branch={false} />
            <span className="hidden md:block text-[1.5rem] font-bold tracking-[0.12em] bg-gradient-to-r from-accent via-yellow to-teal bg-clip-text text-transparent">
              TUCANO
            </span>
          </button>
          <QuickAdd />
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={theme.toggle} className="btn btn-ghost !p-2" title="Tema chiaro/scuro (D)">
              {theme.dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button onClick={() => ui.setView(view === 'settings' ? 'focus' : 'settings')} className={`btn !p-2 ${view === 'settings' ? 'bg-surface-2 text-ink' : 'btn-ghost'}`} title="Impostazioni">
              <Cog size={19} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-2 pt-3 flex items-center gap-2 overflow-x-auto">
          <nav className="flex items-center gap-1 rounded-xl bg-surface-2/70 p-1">
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => ui.setView(v.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-all whitespace-nowrap
                  ${view === v.id ? 'bg-surface text-ink shadow-card' : 'text-ink-2 hover:text-ink'}`}
              >
                {v.icon}<span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </nav>
          {view !== 'settings' && view !== 'timeline' && (
            <button
              onClick={toggleExpandAll}
              className={`btn text-sm whitespace-nowrap ${expandAll ? 'bg-teal-soft text-ink' : 'btn-ghost'}`}
              title="Mostra sempre le sottoattività dentro le card (E)"
            >
              <ListTree size={16} />{expandAll ? 'Sottoattività visibili' : 'Mostra sottoattività'}
            </button>
          )}
          {view === 'focus' && (
            <button
              onClick={() => saveSettings.mutate({ groupByStatus: !byStatus })}
              className={`btn text-sm whitespace-nowrap ${byStatus ? 'bg-teal-soft text-ink' : 'btn-ghost'}`}
              title="Raggruppa le card per stato: In fiamme · In corso · Backlog"
            >
              <LayoutList size={16} />{byStatus ? 'Stato visibile' : 'Mostra stato'}
            </button>
          )}
          <span className="flex-1" />
          {board.tags.length > 0 && view !== 'settings' && (
            <div className="hidden md:flex items-center gap-1">
              {board.tags.slice(0, 8).map((t) => (
                <TagChip key={t.id} tag={t} active={ui.tagFilter === t.id} onClick={() => ui.setTagFilter(ui.tagFilter === t.id ? null : t.id)} />
              ))}
            </div>
          )}
          {view !== 'settings' && (
            <label className="flex items-center gap-1.5 rounded-lg bg-surface-2/70 px-2.5 py-1.5 text-sm focus-within:ring-2 focus-within:ring-accent/30">
              <Search size={15} className="text-ink-3" />
              <input
                ref={ui.searchRef}
                value={ui.search}
                onChange={(e) => ui.setSearch(e.target.value)}
                placeholder="Cerca  /"
                className="bg-transparent outline-none w-24 focus:w-40 transition-all placeholder:text-ink-3"
              />
              {ui.search && <button onClick={() => ui.setSearch('')}><X size={14} className="text-ink-3" /></button>}
            </label>
          )}
        </div>
      </header>

      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-36 transition-[padding] ${ui.selectedId != null ? 'lg:pr-[36rem]' : ''}`}>
        <div className="@container">
        {board.isLoading ? (
          <div className="grid place-items-center py-24 text-ink-3"><Toucan size={80} className="animate-pulse" /></div>
        ) : view === 'focus' ? <FocusView />
          : view === 'list' ? <ListView />
          : view === 'kanban' ? <KanbanView />
          : view === 'timeline' ? <TimelineView />
          : <SettingsView />}
        </div>
      </main>

      <TaskDrawer />
      <Inbox />
      <TaskForm />
      <VoiceFab />
    </div>
  )
}
