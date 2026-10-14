import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { play } from '../lib/motion'
import { Icon } from './Icon'

export type Tab = 'home' | 'search' | 'notifications' | 'profile'

export function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <span className="status-time">9:41</span>
      <span className="status-icons">
        <Icon name="cellular" />
        <Icon name="wifi" />
        <Icon name="battery" />
      </span>
    </div>
  )
}

/**
 * Fix 3 — the wordmark no longer costs ~20% of every screen.
 * Home keeps the big wordmark but it collapses to a 56px bar as you scroll
 * (sticky with a negative top, so the content never jumps).
 * Every other tab starts compact.
 *
 * Fix 2 — the page title is now the compact bar's heading, in the same cream
 * and Amatic face as the collapsed wordmark, so it reads as a label, not a
 * yellow accent link.
 */
export function Header({
  variant,
  title,
  progress = 0,
  onBack,
}: {
  variant: 'brand' | 'compact'
  title: string
  progress?: number
  onBack?: () => void
}) {
  if (variant === 'compact') {
    return (
      <header className={`header header-compact ${onBack ? 'has-back' : ''}`}>
        {onBack && (
          <button type="button" className="icon-button back-button" aria-label="Back" onClick={onBack}>
            <Icon name="back" />
          </button>
        )}
        <h1 className="header-title">{title}</h1>
      </header>
    )
  }
  return (
    <header className="header header-brand" style={{ '--c': progress } as React.CSSProperties}>
      <h1 className="wordmark">{title}</h1>
    </header>
  )
}

export function Navigation({
  tab,
  onTab,
  onCompose,
  unread,
  avatar,
}: {
  tab: Tab
  onTab: (t: Tab) => void
  onCompose: () => void
  unread: number
  avatar: string
}) {
  const index = ['home', 'search', 'notifications', 'profile'].indexOf(tab)
  return (
    <nav className="nav" aria-label="Main">
      <div className="tab-bar" style={{ '--i': index } as React.CSSProperties}>
        {/* One highlight that slides between tabs, instead of four that blink on and off. */}
        <span className="tab-indicator" aria-hidden="true" />
        <TabButton label="Home" active={tab === 'home'} onClick={() => onTab('home')}>
          <Icon name={tab === 'home' ? 'homeActive' : 'home'} />
        </TabButton>
        <TabButton label="Search" active={tab === 'search'} onClick={() => onTab('search')}>
          <Icon name={tab === 'search' ? 'searchTabActive' : 'searchTab'} />
        </TabButton>
        <TabButton
          label={unread > 0 ? `Notifications, ${unread} new` : 'Notifications'}
          active={tab === 'notifications'}
          onClick={() => onTab('notifications')}
        >
          <Icon name={tab === 'notifications' ? 'bellActive' : 'bell'} />
          {unread > 0 && <Badge count={unread} />}
        </TabButton>
        <TabButton label="Profile" active={tab === 'profile'} onClick={() => onTab('profile')}>
          <img className="tab-avatar" src={avatar} width={24} height={24} alt="" />
        </TabButton>
      </div>
      <button type="button" className="compose" aria-label="Compose post" aria-haspopup="dialog" onClick={onCompose}>
        <Icon name="feather" />
      </button>
    </nav>
  )
}

/** Pops when the count goes up, so new activity catches the eye without a banner. */
function Badge({ count }: { count: number }) {
  const el = useRef<HTMLSpanElement>(null)
  const prev = useRef(0) // it only exists when there's something new, so appearing counts as going up
  useLayoutEffect(() => {
    if (count > prev.current) play(el.current, 'is-popping')
    prev.current = count
  }, [count])
  return (
    <span ref={el} className="tab-badge" aria-hidden="true">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function TabButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" className="tab" aria-label={label} aria-current={active ? 'page' : undefined} onClick={onClick}>
      {children}
    </button>
  )
}
