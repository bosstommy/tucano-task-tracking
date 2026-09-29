# 🦜 TUCANO

Agenda personale delle attività: svuota la mente, vedi subito cosa conta.
React + Node + SQLite, tutto in locale sul tuo PC.

## Avvio

**Doppio clic su `Avvia TUCANO.bat`** → si apre il browser su http://localhost:3001.
Chiudi la finestra nera per spegnerlo.

Sviluppo (ricarica automatica): `npm run dev` → http://localhost:5173
Primo avvio: il database si crea da solo e parte vuoto. Per provare l'app con qualche attività d'esempio: `npm run seed` (non tocca un database che ha già dati).
Test: `npm test` · Prove su dati separati: `npm run dev:test` (cartella `.testdata`, porta 3002)

## Barra rapida (tasto `N` o `Ctrl+K`)

| Scrivi | Significa |
|---|---|
| `!` o `🔥` | in fiamme |
| `?` | palla agli altri (sto aspettando) |
| `#qualità` | tag (creato se nuovo) |
| `@30/10` `@ven` `@domani` `@+3` | scadenza |
| `~3g` `~4h` | tempo di lavoro stimato |
| `… > audit` | sottoattività di "audit…" |
| `Maiusc+Invio` o `▾` | modulo completo |

Esempio: `Valutazione prodotti Cambielli ? #qualità @30/10`

## Inbox svuotatesta (tasto `I`)

Linguetta **INBOX** discreta sul bordo sinistro. Scrivi un pensiero per riga e premi Invio (incollando più righe ne crea una per riga).
Dopo, con calma, passa col mouse su ogni riga: **→** diventa attività (in corso, capisce `@ven`, `#tag`, `!`), **💡** va nel backlog, **✕** la elimina.

## Dettatura

Pulsante **microfono** grande in basso al centro (o tasto `M`, Chrome/Edge). Parla liberamente, poi **Aggiungi**:
«valutazione prodotti Cambielli **entro il 30 ottobre aspetto risposta da commerciale**».
Capisce: urgente / in fiamme · entro, per, scadenza + data · aspetto risposta da… / palla agli altri ·
ci vogliono N giorni · tag X · sotto <attività>.

## Aperta / chiusa + dov'è la palla

Ogni attività è aperta o chiusa (gli stati di sempre). In più ha **la palla**:
di default è **da te**; quando la passi **agli altri** vuol dire che stai aspettando qualcuno
(pulsante ⇄ sulla card, interruttore nel dettaglio, `?` nella barra rapida). La card mostra da quanti giorni aspetti.

- **Sottoattività**: semplici voci spuntabili (testo modificabile sul posto). La palla e lo stato sono solo della card madre.
- **Flusso in sequenza**: spunta "In sequenza" nelle sottoattività → diventano tappe che si sbloccano una alla volta.
  Con la scadenza del flusso ogni tappa riceve la sua data a ritroso.
- **Modelli**: "Salva come modello" su un flusso, poi riusalo dal modulo completo (▾). Incluso: *Richiesta documenti cliente*.
- **Diario**: cambi di stato, passaggi di palla e tappe chiuse vengono registrati con la data, insieme alle note.

**Stato** (nel dettaglio): 🔥 *In fiamme* · *In corso* (predefinito) · 💡 *Backlog (idee)*.

Il Focus è un'unica griglia: prima le card in fiamme, poi palla da te, poi palla agli altri, le idee in fondo.
Il **bordo** dice dov'è la palla: rosso = in fiamme, blu = da te, giallo/oro = agli altri, tratteggiato = idea.
Il pulsante **Mostra stato** in alto le raggruppa per stato.

## Come ragiona sulle scadenze

Nel dettaglio: **Inizio**, **Scadenza** e il promemoria **"Avvisami N giorni prima della scadenza"**:
da quel giorno l'attività sale in *Tocca a me* con il chip 🔔 *scade …*.

Se c'è anche una stima (dalla barra rapida, `~3g`) calcola **"inizia entro"** (giorni lavorativi, weekend esclusi).
Nel Focus l'attività sale in *Da iniziare ora* quando entri nel preavviso (Impostazioni),
diventa *a rischio* se è in corso ma il lavoro rimasto non ci sta più, *in ritardo* se non è partita in tempo.

## Dati

- Database: `data/tucano.db` (creato al primo avvio, non incluso nel repository: è personale)
- Backup automatico giornaliero in `backups/` (ultimi 14) + pulsante "Backup adesso"
- Export JSON / CSV (Excel) da Impostazioni
