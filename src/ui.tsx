import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { NewTask, ViewId } from './types'

interface Toast { id: number; message: string; action?: { label: string; run: () => void } }
interface ConfirmState { message: string; ok: string; cancel: string; resolve: (v: boolean) => void }

interface UI {
  view: ViewId
  setView: (v: ViewId) => void
  selectedId: number | null
  openTask: (id: number) => void
  closeTask: () => void
  search: string
  setSearch: (s: string) => void
  tagFilter: number | null
  setTagFilter: (id: number | null) => void
  formPrefill: NewTask | null
  openForm: (prefill?: NewTask) => void
  closeForm: () => void
  toast: (message: string, action?: Toast['action']) => void
  confirm: (message: string, labels?: { ok?: string; cancel?: string }) => Promise<boolean>
  /** Espansioni aperte/chiuse a mano, che vincono sull'impostazione globale. */
  expandOverrides: Map<number, boolean>
  setExpanded: (id: number, open: boolean) => void
  clearExpandOverrides: () => void
  quickAddRef: React.RefObject<HTMLInputElement>
  searchRef: React.RefObject<HTMLInputElement>
}

const Ctx = createContext<UI>(null!)
export const useUI = () => useContext(Ctx)

const readLS = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const writeLS = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* privato */ } }

export function UIProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<ViewId>(() => (readLS('tucano-view') as ViewId) || 'focus')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<number | null>(null)
  const [formPrefill, setFormPrefill] = useState<NewTask | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [expandOverrides, setOverrides] = useState<Map<number, boolean>>(new Map())
  const setExpanded = useCallback((id: number, open: boolean) => setOverrides((m) => new Map(m).set(id, open)), [])
  const clearExpandOverrides = useCallback(() => setOverrides(new Map()), [])
  const quickAddRef = useRef<HTMLInputElement>(null!)
  const searchRef = useRef<HTMLInputElement>(null!)

  const setView = useCallback((v: ViewId) => { setViewState(v); writeLS('tucano-view', v) }, [])

  const toast = useCallback((message: string, action?: Toast['action']) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 2800)
  }, [])

  const confirm = useCallback((message: string, labels: { ok?: string; cancel?: string } = {}) =>
    new Promise<boolean>((resolve) => setConfirmState({ message, ok: labels.ok ?? 'Sì', cancel: labels.cancel ?? 'No', resolve })), [])

  const answer = (v: boolean) => { confirmState?.resolve(v); setConfirmState(null) }

  useEffect(() => {
    if (!confirmState) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); answer(false) }
      if (e.key === 'Enter') { e.preventDefault(); answer(true) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  const value: UI = {
    view, setView, selectedId,
    openTask: setSelectedId, closeTask: () => setSelectedId(null),
    search, setSearch, tagFilter, setTagFilter,
    formPrefill, openForm: (p) => setFormPrefill(p ?? { title: '' }), closeForm: () => setFormPrefill(null),
    toast, confirm, quickAddRef, searchRef,
    expandOverrides, setExpanded, clearExpandOverrides,
  }

  return (
    <Ctx.Provider value={value}>
      {children}

      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="animate-pop pointer-events-auto flex items-center gap-3 rounded-xl bg-ink text-bg px-4 py-2.5 shadow-pop text-sm font-semibold">
            {t.message}
            {t.action && (
              <button
                className="text-accent font-bold hover:underline"
                onClick={() => { t.action!.run(); setToasts((x) => x.filter((y) => y.id !== t.id)) }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/25 animate-fade p-4" onClick={() => answer(false)}>
          <div className="card animate-pop max-w-sm w-full p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-4">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => answer(false)}>{confirmState.cancel}</button>
              <button className="btn btn-primary" autoFocus onClick={() => answer(true)}>{confirmState.ok}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
