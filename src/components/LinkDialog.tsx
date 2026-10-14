import { useEffect, useId, useRef, useState } from 'react'

/** Shown only when copying is blocked: the link, pre-selected, so it can still be copied by hand. */
export function LinkDialog({ url, onClose, onCopied }: { url: string; onClose: () => void; onCopied: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [failed, setFailed] = useState(false)
  const id = useId()

  useEffect(() => input.current?.select(), [])

  const copy = async () => {
    input.current?.select()
    try {
      await navigator.clipboard.writeText(url)
      onCopied()
    } catch {
      // Still blocked: the text is selected, so the system copy shortcut or menu will work.
      setFailed(true)
    }
  }

  return (
    <div className="scrim" onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <h3 id={id}>Copy this link</h3>
        <p className="supporting">Your browser didn’t let Scrawl copy it automatically.</p>
        <input
          ref={input}
          className="field-input link-input"
          readOnly
          value={url}
          aria-label="Link to post"
          onFocus={(e) => e.currentTarget.select()}
        />
        {failed && (
          <p className="supporting supporting-small" role="status">
            It’s selected — use your device’s Copy.
          </p>
        )}
        <div className="dialog-actions dialog-actions-row">
          <button type="button" className="button-secondary" onClick={onClose}>
            Done
          </button>
          <button type="button" className="button-primary" onClick={copy}>
            Copy
          </button>
        </div>
      </div>
    </div>
  )
}
