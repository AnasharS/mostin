// Logo MostIn - wektor z pliku MostIn_logo_OST.svg (Adobe Illustrator, wersja ostateczna), wstawiony inline,
// żeby kolory reagowały na tryb wysokiego kontrastu (--logo-ink / --logo-accent w globals.css).
export function Logo({ className = "", title = "MostIn" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 220.4 44.1" className={`h-[1.15em] w-auto ${className}`} role="img" aria-label={title}>
      <path className="fill-[var(--logo-accent)]" d="M4.2,35c4,5.5,10.5,9,17.8,9s13.8-3.6,17.8-9H4.2Z"/>
      <path className="fill-[var(--logo-ink)]" d="M22,0C9.9,0,0,9.9,0,22s.4,4.7,1.1,6.9h9.9c-1.3-2-2-4.4-2-6.9,0-5.8,3.9-10.8,9.2-12.4v8.5c0,2.1,1.7,3.8,3.8,3.8s3.8-1.7,3.8-3.8v-8.5c5.3,1.6,9.2,6.6,9.2,12.4s-.7,4.9-2,6.9h9.9c.7-2.2,1.1-4.5,1.1-6.9C44.1,9.9,34.2,0,22,0Z"/>
      <path className="fill-[var(--logo-ink)]" d="M91.6,42.4v-23.5c0-1.3.1-2.6.2-2.8,0,.2-.4.9-.7,1.6l-9.1,16.7h-3.4l-9.3-16.7c-.3-.6-.7-1.3-.7-1.6,0,.2.2,1.4.2,2.8v23.5h-8.9V1.7h8.8l11,19.8c.4.7.7,1.7.8,1.8,0-.1.3-1.1.7-1.8L91.5,1.7h9.1v40.7h-8.9Z"/>
      <path className="fill-[var(--logo-ink)]" d="M119.1,43.1c-7.1,0-13-5.4-13-12.7s6-12.7,12.9-12.7,13,5.3,13,12.6-6,12.8-12.9,12.8ZM119.1,24.6c-3,0-4.5,3.1-4.5,5.8s1.6,5.9,4.6,5.9,4.5-3.1,4.5-5.9-1.4-5.7-4.6-5.7Z"/>
      <path className="fill-[var(--logo-ink)]" d="M145,43.1c-3.7,0-7.8-.9-10.4-2.7l2.8-5.5c2,1.2,4,2.1,6.3,2.1s2.8-.6,2.8-1.3c0-1.3-1.5-1.9-3.4-2.6-3.2-1.2-7.6-2.7-7.6-8s4.1-7.4,10-7.4,5.9.7,8.8,2.2l-2.5,5.4c-2.1-1.2-4.2-1.6-6.1-1.6s-2.6.2-2.6,1.3,2,1.4,4.3,2.3c3.5,1.3,7.8,3.3,7.8,8.1s-4.9,7.6-10.1,7.6Z"/>
      <path className="fill-[var(--logo-ink)]" d="M168.5,42.4c-4.8,0-8-3.7-8-8.8v-8.8h-3v-6.4h3v-10h8.6v10h4.1v6.4h-4.1v7.2c0,1.8.9,3.1,2.7,3.1h2.1v7.2h-5.4Z"/>
      <path className="fill-[var(--logo-accent)]" d="M179.9,42.4V1.7h8.9v40.7h-8.9Z"/>
      <path className="fill-[var(--logo-accent)]" d="M211.8,42.4v-12.4c0-3.2-.8-5.1-3.4-5.1s-4,1.8-4,4.8v12.7h-8.6v-24h8.6v2.5c1.6-2.1,4.1-3.2,6.9-3.2,6.5,0,9.1,4.5,9.1,10.3v14.4h-8.6Z"/>
    </svg>
  )
}

/** Obecność Mostka oznaczamy pomarańczowym węzłem - punktem łączącym elementy systemu, nie maskotką. */
export function MostekMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${className}`}>
      <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-brand" />
      Mostek
    </span>
  )
}
