import { useCallback, useEffect, useRef, useState } from 'react'

// Web Speech API: disponibile in Chrome ed Edge (prefisso webkit).
type SR = any
const getSR = (): (new () => SR) | undefined =>
  typeof window === 'undefined' ? undefined : (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition

/** Dettatura continua in italiano. `onFinal` riceve ogni frase riconosciuta. */
export function useSpeech(onFinal: (text: string) => void, lang = 'it-IT') {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<SR | null>(null)
  const cb = useRef(onFinal)
  cb.current = onFinal
  const supported = !!getSR()

  const stop = useCallback(() => recRef.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = getSR()
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e: any) => {
      let partial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) cb.current(r[0].transcript.trim())
        else partial += r[0].transcript
      }
      setInterim(partial)
    }
    rec.onerror = (e: any) => setError(e.error === 'not-allowed' ? 'Permesso microfono negato' : e.error === 'no-speech' ? null : `Errore dettatura: ${e.error}`)
    rec.onend = () => { setListening(false); setInterim(''); recRef.current = null }
    recRef.current = rec
    setError(null)
    rec.start()
    setListening(true)
  }, [lang])

  useEffect(() => () => recRef.current?.abort(), [])

  return { supported, listening, interim, error, start, stop, toggle: () => (listening ? stop() : start()) }
}
