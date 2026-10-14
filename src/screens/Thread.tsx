import { useEffect, useRef } from 'react'
import { Header } from '../components/Chrome'
import { PostCard } from '../components/PostCard'
import { reducedMotion } from '../lib/motion'
import type { Person, Post } from '../data/content'
import { useActions } from '../state/actions'

/** A post and its replies — flat, oldest first, so the conversation reads top to bottom. */
export function Thread({
  post,
  replies,
  me,
  focus,
  onBack,
}: {
  post: Post | undefined
  replies: Post[]
  me: Person
  /** A reply to bring into view and highlight; `n` changes so the same reply can be re-focused. */
  focus: { id: string; n: number } | null
  onBack: () => void
}) {
  const { reply } = useActions()
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!focus) return
    const behavior = reducedMotion() ? 'auto' : 'smooth'
    // Wait a frame so a just-posted reply is in the DOM.
    requestAnimationFrame(() =>
      scroller.current?.querySelector(`[data-post-id="${focus.id}"]`)?.scrollIntoView({ block: 'center', behavior }),
    )
  }, [focus])

  if (!post) {
    return (
      <div className="scroll">
        <Header variant="compact" title="Post" onBack={onBack} />
        <main className="search-content">
          <div className="state-copy empty-tab" role="status">
            <h2>This post isn’t available</h2>
            <p className="supporting">It may have been deleted.</p>
          </div>
        </main>
      </div>
    )
  }

  const prompt = post.author.handle === me.handle ? 'Add a reply…' : `Reply to ${post.author.name.split(' ')[0]}…`

  return (
    <div className="scroll" ref={scroller}>
      <Header variant="compact" title="Post" onBack={onBack} />
      <main className="search-content thread">
        <PostCard post={post} variant="main" />

        {/* Looks like a field, behaves like a button: one tap into the full composer. */}
        <button type="button" className="reply-prompt" aria-haspopup="dialog" onClick={(e) => reply(post, e.currentTarget)}>
          <img className="reply-prompt-avatar" src={me.avatar} width={28} height={28} alt="" />
          <span>{prompt}</span>
        </button>

        <section className="section-tight" aria-labelledby="replies-heading">
          <div className="section-heading">
            <h2 id="replies-heading">
              {replies.length === 0 ? 'Replies' : `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
            </h2>
          </div>
          {replies.length === 0 ? (
            <p className="supporting empty">No replies yet. Say something kind — or honest.</p>
          ) : (
            <div className="thread-replies">
              {replies.map((r) => {
                const focused = r.id === focus?.id
                return (
                  <div key={focused ? `${r.id}-${focus.n}` : r.id} className={focused ? 'is-focused' : undefined}>
                    <PostCard post={r} variant="reply" />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
