import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '../components/Chrome'
import { Highlight } from '../components/Highlight'
import { Icon } from '../components/Icon'
import { PostCard } from '../components/PostCard'
import { Toast, type ToastState } from '../components/Toast'
import { discovery, initialRecents, type Post } from '../data/content'
import { match, request, suggest, type SearchError } from '../data/search'
import { readJSON, writeJSON } from '../lib/storage'
import { useActions } from '../state/actions'

type View = 'landing' | 'loading' | 'results' | 'error'
type Filter = 'all' | 'people' | 'posts'

const MAX_RECENTS = 5
/** Fast responses swap straight to results; only slow ones show the skeleton. */
const SKELETON_DELAY_MS = 300

export function Search({ posts }: { posts: Post[] }) {
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const [view, setView] = useState<View>('landing')
  const [error, setError] = useState<SearchError>('failed')
  const [filter, setFilter] = useState<Filter>('all')
  // Recent searches are saved on this device, like everything else.
  const [recents, setRecents] = useState(() => readJSON<string[]>('recents') ?? initialRecents)
  useEffect(() => void writeJSON('recents', recents), [recents])
  const [toast, setToast] = useState<ToastState>(null)
  const input = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const skeletonTimer = useRef<number>(undefined)

  useEffect(() => () => clearTimeout(skeletonTimer.current), [])

  const run = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    input.current?.blur()
    setQuery(t)
    setRecents((r) => [t, ...r.filter((x) => x !== t)].slice(0, MAX_RECENTS))

    const id = ++requestId.current
    clearTimeout(skeletonTimer.current)
    skeletonTimer.current = window.setTimeout(() => {
      if (id === requestId.current) setView('loading')
    }, SKELETON_DELAY_MS)

    request()
      .then(() => {
        if (id !== requestId.current) return
        setTerm(t)
        setFilter('all')
        setView('results')
      })
      .catch((e: SearchError) => {
        if (id !== requestId.current) return
        setTerm(t)
        setError(e)
        setView('error')
      })
      .finally(() => {
        if (id === requestId.current) clearTimeout(skeletonTimer.current)
      })
  }

  /** ↖ means "put this in the field so I can edit it", never "search now". */
  const edit = (t: string) => {
    setQuery(t)
    requestAnimationFrame(() => {
      const el = input.current
      if (!el) return
      el.focus()
      el.setSelectionRange(t.length, t.length)
    })
  }

  const clear = () => {
    requestId.current++
    clearTimeout(skeletonTimer.current)
    setQuery('')
    setTerm('')
    setView('landing')
    input.current?.focus()
  }

  const removeRecent = (t: string) => {
    const before = recents
    setRecents(before.filter((x) => x !== t))
    setToast({ id: Date.now(), message: `Removed “${t}”`, action: { label: 'Undo', onClick: () => setRecents(before) } })
  }

  const clearRecents = () => {
    const before = recents
    setRecents([])
    setToast({ id: Date.now(), message: 'Recent searches cleared', action: { label: 'Undo', onClick: () => setRecents(before) } })
  }

  const dismissToast = useCallback(() => setToast(null), [])

  return (
    <>
      <div className="scroll">
        <Header variant="compact" title="Search" />
        <main className="search-content">
          <form
            className="search-field"
            role="search"
            onSubmit={(e) => {
              e.preventDefault()
              run(query)
            }}
          >
            <Icon name="search" />
            <input
              ref={input}
              type="search"
              enterKeyHint="search"
              aria-label="Search people and posts"
              placeholder="Search people and posts"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (!e.target.value) clear()
              }}
            />
            {query && (
              <button type="button" className="icon-button" aria-label="Clear search" onClick={clear}>
                <Icon name="x" />
              </button>
            )}
          </form>

          {view === 'landing' && <Landing recents={recents} onClearAll={clearRecents} onRemove={removeRecent} onRun={run} onEdit={edit} />}
          {view === 'loading' && (
            <>
              <Filters value={filter} onChange={setFilter} />
              <Loading />
            </>
          )}
          {view === 'results' && (
            <Results
              term={term}
              filter={filter}
              setFilter={setFilter}
              posts={posts}
              onRun={run}
              onEdit={edit}
            />
          )}
          {view === 'error' && <ErrorState kind={error} onRetry={() => run(term)} />}
        </main>
      </div>
      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  )
}

function Landing({
  recents,
  onClearAll,
  onRemove,
  onRun,
  onEdit,
}: {
  recents: string[]
  onClearAll: () => void
  onRemove: (t: string) => void
  onRun: (t: string) => void
  onEdit: (t: string) => void
}) {
  return (
    <>
      {recents.length > 0 && (
        <>
          <section className="section" aria-labelledby="recent-heading">
            <div className="section-heading">
              <h2 id="recent-heading">Recent searches</h2>
              <button type="button" className="text-button" onClick={onClearAll}>
                Clear all
              </button>
            </div>
            <ul className="row-list">
              {recents.map((t) => (
                <li key={t} className="row row-recent">
                  <button type="button" className="row-main" onClick={() => onRun(t)}>
                    <Icon name="history" />
                    <span>{t}</span>
                  </button>
                  <button type="button" className="icon-button" aria-label={`Edit “${t}”`} onClick={() => onEdit(t)}>
                    <Icon name="arrowUpLeft" />
                  </button>
                  <button type="button" className="icon-button" aria-label={`Remove “${t}”`} onClick={() => onRemove(t)}>
                    <Icon name="x" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <hr className="divider" />
        </>
      )}

      <section className="section" aria-labelledby="discover-heading">
        <div className="section-heading">
          <h2 id="discover-heading">A few places to start</h2>
        </div>
        <p className="supporting">Everyday thoughts, worth a little digging.</p>
        <Suggestions onRun={onRun} onEdit={onEdit} />
      </section>

      <p className="supporting supporting-small">Looking for someone? Try a name or @handle.</p>
    </>
  )
}

function Suggestions({ onRun, onEdit }: { onRun: (t: string) => void; onEdit: (t: string) => void }) {
  return (
    <ul className="row-list">
      {discovery.map((t) => (
        <li key={t} className="row row-suggested">
          <button type="button" className="row-main" onClick={() => onRun(t)}>
            <span>{t}</span>
          </button>
          <button type="button" className="icon-button" aria-label={`Edit “${t}”`} onClick={() => onEdit(t)}>
            <Icon name="arrowUpLeft" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function Filters({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const options: [Filter, string][] = [
    ['all', 'All'],
    ['people', 'People'],
    ['posts', 'Posts'],
  ]
  return (
    <div
      className="filters"
      role="group"
      aria-label="Filter results"
      style={{ '--i': options.findIndex(([id]) => id === value), '--n': options.length } as React.CSSProperties}
    >
      {options.map(([id, label]) => (
        <button key={id} type="button" className="filter" aria-pressed={value === id} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Results({
  term,
  filter,
  setFilter,
  posts,
  onRun,
  onEdit,
}: {
  term: string
  filter: Filter
  setFilter: (f: Filter) => void
  posts: Post[]
  onRun: (t: string) => void
  onEdit: (t: string) => void
}) {
  const { people, posts: matches } = match(term, posts)
  const { openProfile } = useActions()

  // Nothing matched at all: filters would be noise, so they're not shown.
  if (people.length === 0 && matches.length === 0) {
    return <NoResults term={term} posts={posts} onRun={onRun} onEdit={onEdit} />
  }

  const filters = <Filters value={filter} onChange={setFilter} />

  // One tab is empty but the other isn't: say so and point at what does exist.
  if (filter === 'people' && people.length === 0) {
    return (
      <>
        {filters}
        <EmptyTab text={`No people match “${term}”.`} action="Show posts" onAction={() => setFilter('posts')} />
      </>
    )
  }
  if (filter === 'posts' && matches.length === 0) {
    return (
      <>
        {filters}
        <EmptyTab text={`No posts match “${term}”.`} action="Show people" onAction={() => setFilter('people')} />
      </>
    )
  }

  const showPeople = filter !== 'posts' && people.length > 0
  const showPosts = filter !== 'people' && matches.length > 0
  const limit = filter === 'all' ? 2 : Infinity

  return (
    <>
      {filters}
      <div className="results">
        {showPeople && (
          <section className="section-tight" aria-labelledby="people-heading">
            <div className="section-heading">
              <h2 id="people-heading">People</h2>
              {people.length > limit && (
                <button type="button" className="text-button" onClick={() => setFilter('people')}>
                  See all
                </button>
              )}
            </div>
            {people.slice(0, limit).map((p) => (
              <button key={p.handle} type="button" className="person person-button" onClick={() => openProfile(p)}>
                <img className="avatar" src={p.avatar} width={40} height={40} alt="" />
                <span className="person-info">
                  <span className="identity">
                    <span className="name">
                      <Highlight text={p.name} term={term} />
                    </span>
                    <span className="meta">
                      @<Highlight text={p.handle} term={term} />
                    </span>
                  </span>
                  <span className="bio">
                    <Highlight text={p.bio} term={term} />
                  </span>
                </span>
              </button>
            ))}
          </section>
        )}
        {showPosts && (
          <section className="section-tight" aria-labelledby="posts-heading">
            <div className="section-heading">
              <h2 id="posts-heading">Posts</h2>
              {matches.length > limit && (
                <button type="button" className="text-button" onClick={() => setFilter('posts')}>
                  See all
                </button>
              )}
            </div>
            {matches.slice(0, limit).map((post) => (
              <PostCard key={post.id} post={post} highlight={term} />
            ))}
          </section>
        )}
      </div>
    </>
  )
}

function NoResults({
  term,
  posts,
  onRun,
  onEdit,
}: {
  term: string
  posts: Post[]
  onRun: (t: string) => void
  onEdit: (t: string) => void
}) {
  const suggestion = suggest(term, posts)
  return (
    <div className="state">
      <div className="state-copy" role="status">
        <h2>No results for “{term}”</h2>
        {suggestion ? (
          <p className="supporting">
            Did you mean{' '}
            <button type="button" className="inline-link" onClick={() => onRun(suggestion)}>
              {suggestion}
            </button>
            ?
          </p>
        ) : (
          <p className="supporting">Check the spelling, or try a broader word.</p>
        )}
      </div>
      <hr className="divider" />
      <section className="section" aria-labelledby="try-heading">
        <div className="section-heading">
          <h2 id="try-heading">Try one of these</h2>
        </div>
        <Suggestions onRun={onRun} onEdit={onEdit} />
      </section>
    </div>
  )
}

function EmptyTab({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
  return (
    <div className="state-copy empty-tab" role="status">
      <p className="supporting">{text}</p>
      <button type="button" className="text-button" onClick={onAction}>
        {action}
      </button>
    </div>
  )
}

function ErrorState({ kind, onRetry }: { kind: SearchError; onRetry: () => void }) {
  const copy =
    kind === 'offline'
      ? { title: 'You’re offline', body: 'Search needs a connection. Your query is saved — retry once you’re back.' }
      : { title: 'Search didn’t load', body: 'Something went wrong on our side. Your query is saved — try again.' }
  return (
    <div className="state state-copy" role="alert">
      <h2>{copy.title}</h2>
      <p className="supporting">{copy.body}</p>
      <button type="button" className="button-secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

function Loading() {
  const personSkeleton = (
    <div className="person">
      <span className="sk sk-avatar" />
      <div className="sk-lines">
        <span className="sk-row">
          <span className="sk" style={{ width: 100 }} />
          <span className="sk" style={{ width: 54 }} />
        </span>
        <span className="sk" style={{ width: 246 }} />
      </div>
    </div>
  )
  const postSkeleton = (
    <div className="post">
      <div className="post-content">
        <span className="sk sk-avatar" />
        <div className="sk-lines">
          <span className="sk-row">
            <span className="sk" style={{ width: 100 }} />
            <span className="sk" style={{ width: 82 }} />
          </span>
          <span className="sk" style={{ width: 258 }} />
          <span className="sk" style={{ width: 154 }} />
        </div>
      </div>
      <div className="post-actions">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sk-action">
            <span className="sk sk-icon" />
            <span className="sk" style={{ width: 22 }} />
          </span>
        ))}
      </div>
    </div>
  )
  // Both sections get the same skeleton heading; the one status line covers the whole page.
  const heading = (width: number) => (
    <span className="sk-row sk-heading">
      <span className="sk" style={{ width, height: 16 }} />
      <span className="sk" style={{ width: 42 }} />
    </span>
  )
  return (
    <div className="results" aria-busy="true">
      <p className="search-status" role="status">
        Searching…
      </p>
      <div className="section-tight" aria-hidden="true">
        {heading(56)}
        {personSkeleton}
        {personSkeleton}
      </div>
      <div className="section-tight" aria-hidden="true">
        {heading(46)}
        {postSkeleton}
        {postSkeleton}
      </div>
    </div>
  )
}
