// Traduce una frase detta a voce nella sintassi della barra rapida,
// così "chiamare Rossi urgente entro venerdì" diventa "chiamare Rossi ! @ven".

const NUM: Record<string, number> = {
  un: 1, uno: 1, una: 1, mezza: 0.5, mezzo: 0.5, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
}
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const WEEKDAYS = ['lunedì', 'lunedi', 'martedì', 'martedi', 'mercoledì', 'mercoledi', 'giovedì', 'giovedi', 'venerdì', 'venerdi', 'sabato', 'domenica']

const num = (w: string) => (/^\d+([.,]\d+)?$/.test(w) ? Number(w.replace(',', '.')) : NUM[w.toLowerCase()])

/** Converte un'espressione di data parlata in token per parseDue (senza '@'). */
function dateToken(phrase: string): string | null {
  const p = phrase.toLowerCase().trim()
  if (/^(oggi|domani|dopodomani)$/.test(p)) return p
  if (WEEKDAYS.includes(p)) return p.replace(/ì$/, 'i').slice(0, 3)
  let m = p.match(/^(?:il\s+)?(\d{1,2})(?:\s+|\/|-)(\w+)$/)
  if (m) {
    const month = /^\d+$/.test(m[2]) ? Number(m[2]) : MONTHS.indexOf(m[2]) + 1
    if (month >= 1) return `${m[1]}/${month}`
  }
  m = p.match(/^(?:fra|tra)\s+(\S+)\s+(giorn[oi]|settiman[ae]|mes[ei])$/)
  if (m) {
    const n = num(m[1])
    if (n) return `+${n}${m[2].startsWith('sett') ? 's' : m[2].startsWith('mes') ? 'm' : ''}`
  }
  if (/^(la\s+)?settimana prossima$|^(la\s+)?prossima settimana$/.test(p)) return '+1s'
  return null
}

export function voiceToQuick(input: string): string {
  let t = ` ${input.trim()} `

  // Fuoco: "urgente", "urgentissimo", "in fiamme"
  t = t.replace(/\s(in fiamme|urgentissim[oa]|a fuoco|(?:molto )?urgente)(?=\s)/gi, ' ! ')

  // Palla agli altri: "palla agli altri", "aspetto risposta da Marco" (il nome resta nel titolo)
  t = t.replace(/\s(?:palla (?:agli altri|a loro|fuori))(?=\s)/gi, ' ? ')
  t = t.replace(/\s(?:aspetto(?: (?:una )?risposta)?|in attesa(?: di risposta)?)(?:\s(?:da|di|dal|dalla|dall'|dagli)\s*((?:ufficio\s)?[\p{L}'-]+))?(?=\s)/giu,
    (_m, who) => (who ? ` · ${who} ? ` : ' ? '))

  // Scadenza: "entro venerdì", "per il 30 ottobre", "scadenza domani", "entro fra 3 giorni"
  t = t.replace(/\s(?:entro|per|scadenza|scade|consegna)\s(?:il\s|la\s)?((?:(?:fra|tra)\s\S+\s\p{L}+)|(?:(?:la\s)?(?:settimana prossima|prossima settimana))|(?:\d{1,2}(?:\s\p{L}+|\/\d{1,2}))|\p{L}+ì?)(?=\s)/giu, (m, d) => {
    const tok = dateToken(d)
    return tok ? ` @${tok} ` : m
  })

  // Stima: "ci vogliono 3 giorni", "durata mezza giornata", "stima 4 ore"
  t = t.replace(/\s(?:ci vogliono|ci vuole|durata|stima|richiede)\s(\S+)\s(giorn[oi]|giornat[ae]|or[ae])(?=\s)/gi, (m, n, unit) => {
    const v = num(n)
    return v ? ` ~${v}${unit.startsWith('or') ? 'h' : 'g'} ` : m
  })

  // Tag: "tag qualità"
  t = t.replace(/\s(?:tag|etichetta)\s([\p{L}\p{N}-]+)(?=\s)/giu, (_m, tag) => ` #${tag.toLowerCase()} `)

  // Sottoattività: "... sotto audit fornitore" / "sottoattività di audit"
  const sub = t.match(/\s(?:sottoattività di|sotto attività di|dentro|sotto)\s(.+)$/i)
  if (sub) t = `${t.slice(0, sub.index)} > ${sub[1].trim()} `

  t = t.replace(/\s+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

