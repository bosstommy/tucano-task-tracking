// Le date di calendario sono stringhe locali 'YYYY-MM-DD': niente fusi orari di mezzo.

const pad = (n: number) => String(n).padStart(2, '0')

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISODate(new Date())

export const addDays = (s: string, n: number) => {
  const d = fromISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Differenza in giorni di calendario (b − a). */
export const diffDays = (a: string, b: string) =>
  Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000)

export const isWorkday = (s: string) => {
  const g = fromISODate(s).getDay()
  return g !== 0 && g !== 6
}

/** Il giorno lavorativo che si ottiene contando `n` giorni lavorativi indietro da `s` incluso (n ≥ 1). */
export function workdaysBackInclusive(s: string, n: number) {
  if (n <= 0) return s
  let d = s
  let count = 0
  for (;;) {
    if (isWorkday(d)) count++
    if (count >= n) return d
    d = addDays(d, -1)
  }
}

/** Sottrae n giorni lavorativi (esclusivo): utile per il preavviso. */
export function subtractWorkdays(s: string, n: number) {
  let d = s
  let left = n
  while (left > 0) {
    d = addDays(d, -1)
    if (isWorkday(d)) left--
  }
  return d
}

/** Giorni lavorativi tra a e b inclusi (0 se b < a). */
export function workdaysBetweenInclusive(a: string, b: string) {
  if (b < a) return 0
  let n = 0
  for (let d = a; d <= b; d = addDays(d, 1)) if (isWorkday(d)) n++
  return n
}

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']

/** Etichetta breve e umana: "oggi", "domani", "ven", "30 ott", "30 ott 2027". */
export function humanDate(s: string, today = todayISO()) {
  const diff = diffDays(today, s)
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'domani'
  if (diff === -1) return 'ieri'
  const d = fromISODate(s)
  if (diff > 1 && diff < 7) return WEEKDAYS[d.getDay()]
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return d.getFullYear() === fromISODate(today).getFullYear() ? base : `${base} ${d.getFullYear()}`
}

export const WEEKDAY_NAMES = WEEKDAYS
