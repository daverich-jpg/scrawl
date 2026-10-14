/** Marks every case-insensitive occurrence of `term` in `text`, so people can see why a result matched. */
export function Highlight({ text, term }: { text: string; term: string }) {
  const t = term.trim().replace(/^@/, '')
  if (!t) return <>{text}</>
  const parts = text.split(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
    </>
  )
}
