import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Toucan } from '../components/Toucan'

const readLS = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const writeLS = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ok */ } }

/** Sezione con titolo e conteggio, richiudibile; lo stato aperto/chiuso si ricorda. */
export function Group({
  id, title, icon, count, tone = 'var(--ink-3)', defaultOpen = true, children, right,
}: {
  id: string; title: string; icon?: ReactNode; count: number; tone?: string
  defaultOpen?: boolean; children: ReactNode; right?: ReactNode
}) {
  const key = `tucano-group-${id}`
  const [open, setOpen] = useState(() => { const v = readLS(key); return v == null ? defaultOpen : v === '1' })
  const toggle = () => { setOpen(!open); writeLS(key, open ? '0' : '1') }
  return (
    <section className="mb-6">
      <button onClick={toggle} className="flex items-center gap-2 mb-2.5 group w-full text-left">
        <ChevronRight size={16} className={`text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        {icon && <span style={{ color: tone }}>{icon}</span>}
        <h2 className="font-bold text-[1.05rem]">{title}</h2>
        <span className="rounded-full px-2 text-xs font-bold" style={{ background: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}>{count}</span>
        <span className="flex-1" />
        {right}
      </button>
      {open && <div className="animate-fade">{children}</div>}
    </section>
  )
}

export function EmptyState({ title, text }: { title: string; text: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-16 animate-fade">
      <Toucan size={150} />
      <h2 className="text-2xl font-bold mt-4">{title}</h2>
      <p className="text-ink-2 mt-1 max-w-sm">{text}</p>
    </div>
  )
}

export const cardGrid = 'grid gap-2.5 @xl:grid-cols-2 @4xl:grid-cols-3'
