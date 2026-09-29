/** Il tucano di TUCANO, appollaiato su un ramo. Colori dal tema. */
export function Toucan({ size = 40, className = '', branch = true }: { size?: number; className?: string; branch?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }} className={`shrink-0 ${className}`} aria-hidden="true">
      {branch && (
        <>
          <path d="M4 53 Q30 49 60 54" stroke="var(--leaf)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M50 52.5 q5 -8 12 -7 q-4 8 -12 7z" fill="var(--leaf)" opacity="0.85" />
          <path d="M8 52 q-4 -6 -2 -11 q5 4 2 11z" fill="var(--teal)" opacity="0.7" />
        </>
      )}
      {/* coda */}
      <path d="M21 44 L13 60 L18.5 59.5 L26 47 Z" fill="var(--toucan-body)" />
      {/* corpo */}
      <path d="M28 11 C33 11 37 14 37.5 20 C38.5 27 38.5 35 35.5 42 C33 48 28 51 24 50 C19 49 17 43 17 36 C17 27 18.5 19 21.5 14.5 C23.5 12 25.5 11 28 11 Z" fill="var(--toucan-body)" />
      {/* pettorina */}
      <path d="M31 25 C34 24.5 37 25.5 37.6 27 C38 32 36.5 37 33.5 39.5 C31 38 29.5 34 29.5 30 C29.5 27.5 30 25.6 31 25 Z" fill="var(--toucan-bib)" />
      <path d="M32 39.2 C33.5 40.5 34.5 41 35.6 41.2" stroke="var(--coral)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      {/* becco */}
      <path d="M35 14.5 C44 10.5 56 12.5 62 23.5 C54 20.5 45 20 36.5 22 Z" fill="var(--accent)" />
      <path d="M36.5 22 C45 20 54 20.5 62 23.5 C55 27.5 44 28.5 37 26.5 Z" fill="var(--yellow)" />
      <path d="M57.5 18 C59.5 19.5 61 21.3 62 23.5 C60.5 24.6 59 25.3 57.5 25.6 C58.2 23 58.2 20.5 57.5 18 Z" fill="var(--coral)" />
      <path d="M38 17.5 C45 15 52 15.5 57 18" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* occhio */}
      <circle cx="30.5" cy="19" r="4" fill="var(--teal)" />
      <circle cx="31" cy="19" r="1.9" fill="#11151b" />
      <circle cx="31.7" cy="18.3" r="0.65" fill="#fff" />
      {/* zampe */}
      <path d="M25 49.5 l-1 3.5 M29.5 48.5 l1 4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
