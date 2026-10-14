import { useEffect, useId, useRef } from 'react'

export type MenuOption = { label: string; onSelect: () => void; danger?: boolean; hint?: string }

/**
 * Bottom action menu. Destructive menus put focus on Cancel, so a stray Enter
 * never deletes anything; others focus the first option.
 */
export function Menu({ title, note, options, onCancel }: { title: string; note?: string; options: MenuOption[]; onCancel: () => void }) {
  const first = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const id = useId()
  const destructive = options.some((o) => o.danger)

  useEffect(() => (destructive ? cancel : first).current?.focus(), [destructive])

  return (
    <div className="scrim" onClick={onCancel} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <h3 id={id}>{title}</h3>
        {note && <p className="supporting">{note}</p>}
        <div className="dialog-actions">
          {options.map((o, i) => (
            <button
              key={o.label}
              ref={i === 0 ? first : undefined}
              type="button"
              className={o.danger ? 'button-danger menu-option' : 'button-secondary menu-option'}
              onClick={o.onSelect}
            >
              <span>{o.label}</span>
              {o.hint && <span className="menu-hint">{o.hint}</span>}
            </button>
          ))}
          <button ref={cancel} type="button" className="text-button text-button-neutral menu-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
