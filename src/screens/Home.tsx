import { useEffect, useRef, useState } from 'react'
import { Header } from '../components/Chrome'
import { PostCard } from '../components/PostCard'
import { reducedMotion } from '../lib/motion'
import { readJSON, writeJSON } from '../lib/storage'
import type { Post } from '../data/content'

/** Scroll distance over which the 134px brand header collapses to 56px. */
const COLLAPSE_DISTANCE = 78

/** A post to bring into view and briefly highlight; `n` changes so the same post can be re-focused. */
export type FocusPost = { id: string; n: number } | null

export function Home({
  posts,
  focus,
  showFirstPostCard,
  onCompose,
}: {
  posts: Post[]
  focus: FocusPost
  showFirstPostCard: boolean
  onCompose: (trigger: HTMLElement) => void
}) {
  const [hintDismissed, setHintDismissed] = useState(() => readJSON<boolean>('hint:first-post') ?? false)
  const [progress, setProgress] = useState(0)
  const frame = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)

  // After posting or opening a notification, show people exactly which post it was.
  useEffect(() => {
    if (!focus) return
    const behavior = reducedMotion() ? 'auto' : 'smooth'
    if (posts[0]?.id === focus.id) {
      scroller.current?.scrollTo({ top: 0, behavior })
      return
    }
    scroller.current?.querySelector(`[data-post-id="${focus.id}"]`)?.scrollIntoView({ block: 'center', behavior })
    // Only when the focus request changes, not on every feed update.
  }, [focus])

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => setProgress(Math.min(1, Math.max(0, top / COLLAPSE_DISTANCE))))
  }

  return (
    <div className="scroll" ref={scroller} onScroll={onScroll}>
      <Header variant="brand" title="Scrawl" progress={progress} />
      <main className="feed">
        {showFirstPostCard && !hintDismissed && (
          // Teach by doing: one gentle nudge in context, instead of a tour up front.
          <section className="first-post-card" aria-labelledby="first-post-heading">
            <div>
              <h2 id="first-post-heading">Write your first scrawl</h2>
              <p className="supporting">What’s one honest thing about today?</p>
            </div>
            <div className="first-post-actions">
              <button type="button" className="button-primary" aria-haspopup="dialog" onClick={(e) => onCompose(e.currentTarget)}>
                Write
              </button>
              <button
                type="button"
                className="text-button text-button-neutral"
                onClick={() => {
                  setHintDismissed(true)
                  writeJSON('hint:first-post', true)
                }}
              >
                Not now
              </button>
            </div>
          </section>
        )}
        {posts.map((post) => {
          const focused = post.id === focus?.id
          // Re-keying replays the highlight each time the same post is focused.
          return (
            <div key={focused ? `${post.id}-${focus.n}` : post.id} className={focused ? 'is-focused' : undefined}>
              <PostCard post={post} />
            </div>
          )
        })}
      </main>
    </div>
  )
}
