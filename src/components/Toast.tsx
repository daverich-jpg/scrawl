import { useEffect, useState } from 'react'
import { EXIT_MS, reducedMotion } from '../lib/motion'

export type ToastState = { id: number; message: string; action?: { label: string; onClick: () => void } } | null

const TOAST_MS = 5000

/**
 * Short confirmation with an optional action (Undo, View). Sits just above the nav.
 * The timer pauses while it's hovered or focused, so an Undo can't vanish mid-reach
 * (WCAG 2.2.1, timing adjustable). It fades out rather than blinking away.
 */
export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false)
  // The last toast can briefly outlive `toast`, so it can play its exit.
  // A new toast renders in the same commit (not after an effect), so its Undo can take focus at once.
  const [last, setLast] = useState<ToastState>(toast)
  const [leaving, setLeaving] = useState(false)
  const shown = toast ?? last

  useEffect(() => {
    if (toast) {
      setLast(toast)
      setLeaving(false)
      setPaused(false) // a new toast starts its own clock
      return
    }
    if (reducedMotion()) {
      setLast(null)
      return
    }
    setLeaving(true)
    const t = window.setTimeout(() => {
      setLast(null)
      setLeaving(false)
    }, EXIT_MS)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!toast || paused) return
    const t = window.setTimeout(onDismiss, TOAST_MS)
    return () => clearTimeout(t)
  }, [toast, paused, onDismiss])

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {shown && (
        <div
          className={`toast ${leaving && !toast ? 'is-leaving' : ''}`}
          key={shown.id}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <span>{shown.message}</span>
          {shown.action && toast && (
            <button
              type="button"
              className="toast-undo"
              onClick={() => {
                shown.action?.onClick()
                setPaused(false)
                onDismiss()
              }}
            >
              {shown.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
