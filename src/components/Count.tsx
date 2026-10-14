import { useLayoutEffect, useRef } from 'react'
import { rollNumber } from '../lib/motion'

/** A count that rolls when it changes — but not on first render, so a page load stays still. */
export function Count({ value, format = String }: { value: number; format?: (n: number) => string }) {
  const el = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)

  useLayoutEffect(() => {
    if (value !== prev.current) rollNumber(el.current, value > prev.current ? 1 : -1)
    prev.current = value
  }, [value])

  return (
    <span ref={el} className="count">
      {format(value)}
    </span>
  )
}
