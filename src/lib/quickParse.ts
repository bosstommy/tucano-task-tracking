import { addDays, fromISODate, toISODate, todayISO } from './dates'

export interface ParsedQuick {
  title: string
  onFire: boolean
  tags: string[]
  due: string | null
  estimateDays: number | null
  parentQuery: string | null
  /** "?": la palla va nel campo degli altri. */
  ballOut: boolean
}

const FULL_WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

/** Interpreta la data scritta dopo '@'. */
export function parseDue(raw: string, today = todayISO()): string | null {
  const s = raw.toLowerCase()
  if (s === 'oggi') return today
  if (s === 'domani') return addDays(today, 1)
  if (s === 'dopodomani') return addDays(today, 2)
  const rel = s.match(/^\+(\d+)(g|s|m)?$/)
  if (rel) {
    const n = Number(rel[1])
    return addDays(today, rel[2] === 's' ? n * 7 : rel[2] === 'm' ? n * 30 : n)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const dm = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/)
  if (dm) {
    const day = Number(dm[1])
    const month = Number(dm[2])
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const t = fromISODate(today)
    let year = dm[3] ? Number(dm[3]) : t.getFullYear()
    if (year < 100) year += 2000
    let d = new Date(year, month - 1, day)
    if (!dm[3] && toISODate(d) < today) d = new Date(year + 1, month - 1, day)
    return toISODate(d)
  }
  // Giorno della settimana: prossima occorrenza a partire da domani.
  const norm = s.replace('ì', 'i')
  const wd = norm.length < 3 ? -1 : FULL_WEEKDAYS.findIndex((w) => w.replace('ì', 'i').startsWith(norm))
  if (wd >= 0) {
    const cur = fromISODate(today).getDay()
    const delta = ((wd - cur + 7) % 7) || 7
    return addDays(today, delta)
  }
  return null
}

/** Interpreta la stima dopo '~': "3", "3g", "0,5g", "4h". */
export function parseEstimate(raw: string, hoursPerDay = 8): number | null {
  const m = raw.toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)(g|d|h|o)?$/)
  if (!m) return null
  const n = Number(m[1])
  if (m[2] === 'h' || m[2] === 'o') return Math.round((n / hoursPerDay) * 100) / 100
  return n
}

/**
 * Sintassi barra rapida:
 *  ! o 🔥 in fiamme · ? palla agli altri (sto aspettando)
 *  #tag · @30/10 @ven @domani @+3 scadenza · ~3g ~4h stima · "> padre" sottoattività di…
 */
export function quickParse(input: string, opts: { today?: string; hoursPerDay?: number } = {}): ParsedQuick {
  const today = opts.today ?? todayISO()
  const out: ParsedQuick = {
    title: '', onFire: false, tags: [], due: null, estimateDays: null, parentQuery: null, ballOut: false,
  }

  let text = input
  const gt = text.indexOf(' > ')
  if (gt >= 0) {
    out.parentQuery = text.slice(gt + 3).trim() || null
    text = text.slice(0, gt)
  }

  const words: string[] = []
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    if (/^!{1,3}$/.test(tok) || tok === '🔥') out.onFire = true
    else if (tok === '?') out.ballOut = true
    else if (/^#[\p{L}\p{N}_-]+$/u.test(tok)) out.tags.push(tok.slice(1))
    else if (tok.startsWith('@') && tok.length > 1 && parseDue(tok.slice(1), today)) out.due = parseDue(tok.slice(1), today)
    else if (tok.startsWith('~') && parseEstimate(tok.slice(1), opts.hoursPerDay) != null) out.estimateDays = parseEstimate(tok.slice(1), opts.hoursPerDay)
    else if (tok.includes('🔥')) { out.onFire = true; const rest = tok.replace(/🔥/g, ''); if (rest) words.push(rest) }
    else words.push(tok)
  }
  out.title = words.join(' ').trim()
  return out
}
