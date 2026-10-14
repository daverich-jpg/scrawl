import type { Post } from '../data/content'
import { useActions } from '../state/actions'
import { haptic, play } from '../lib/motion'
import { ageSince } from '../lib/time'
import { clampRatio } from './Compose'
import { Count } from './Count'
import { Highlight } from './Highlight'
import { Icon } from './Icon'

/**
 * `feed`: tapping the text opens the thread.
 * `main`: the post at the top of its own thread — nothing further to open.
 * `reply`: a reply inside a thread — threads are flat, so there's nothing deeper to open.
 */
export type PostVariant = 'feed' | 'main' | 'reply'

export function PostCard({ post, highlight = '', variant = 'feed' }: { post: Post; highlight?: string; variant?: PostVariant }) {
  const { author } = post
  const { meHandle, toggleLike, openProfile, openPostMenu, openThread, reply, replyCount, repost, getPost, share } = useActions()
  const mine = author.handle === meHandle
  const opensThread = variant === 'feed'
  const replies = replyCount(post.id)
  const quoted = post.quoteId ? getPost(post.quoteId) : undefined
  // Zero counts render empty (so 0 → 1 can still roll in) — an empty icon reads as "be the first".
  const age = post.createdAt ? ageSince(post.createdAt) : post.age
  const hideZero = (n: number) => (n > 0 ? String(n) : '')

  return (
    <article className={`post post-${variant}`} data-post-id={post.id}>
      {post.reposted && variant !== 'reply' && (
        <p className="repost-label">
          <Icon name="repost" />
          You reposted
        </p>
      )}
      <div className="post-content">
        {/* Avatar and name go to the same place; only the name is a tab stop. */}
        <button type="button" className="avatar-button" tabIndex={-1} aria-hidden="true" onClick={() => openProfile(author)}>
          <img className="avatar" src={author.avatar} width={40} height={40} alt="" />
        </button>
        <div className="post-info">
          <div className="identity-row">
            <p className="identity">
              <button type="button" className="name name-button" onClick={() => openProfile(author)}>
                <Highlight text={author.name} term={highlight} />
              </button>
              <span className="meta">
                @<Highlight text={author.handle} term={highlight} /> ·{' '}
                {opensThread ? (
                  // The keyboard and screen-reader way into the thread (X/Threads convention).
                  <button type="button" className="age-link" aria-label={`${age} — open conversation`} onClick={() => openThread(post)}>
                    {age}
                  </button>
                ) : (
                  age
                )}
              </span>
            </p>
            {mine && (
              <button
                type="button"
                className="icon-button post-more"
                aria-label="Post options"
                aria-haspopup="dialog"
                onClick={(e) => openPostMenu(post, e.currentTarget)}
              >
                <Icon name="more" />
              </button>
            )}
          </div>
          {/* Pointer shortcut into the thread; the age button above is the accessible route. */}
          <div className={opensThread ? 'post-open' : undefined} onClick={opensThread ? () => openThread(post) : undefined}>
            {post.body && (
              <p className="post-body">
                <Highlight text={post.body} term={highlight} />
              </p>
            )}
            {post.images && post.images.length > 0 && (
              <div
                className={`post-media count-${post.images.length}`}
                style={post.images.length === 1 ? { aspectRatio: clampRatio(post.images[0]) } : undefined}
              >
                {post.images.map((img, i) => (
                  <img key={i} src={img.src} alt={img.alt} loading="lazy" />
                ))}
              </div>
            )}
          </div>
          {post.quoteId && <QuoteCard post={quoted} onOpen={openThread} />}
        </div>
      </div>
      <div className="post-actions">
        <button
          type="button"
          className="post-action"
          title="Reply"
          aria-label={replies === 0 ? 'Reply' : `Reply, ${replies} ${replies === 1 ? 'reply' : 'replies'}`}
          aria-haspopup="dialog"
          onClick={(e) => reply(post, e.currentTarget)}
        >
          <Icon name="reply" />
          <Count value={replies} format={hideZero} />
        </button>
        <button
          type="button"
          className="post-action"
          title="Like"
          aria-label={`Like, ${post.likes}`}
          aria-pressed={!!post.liked}
          onClick={(e) => {
            // Reward the like, not the unlike.
            if (!post.liked) {
              play(e.currentTarget.querySelector('.icon'), 'is-popping')
              haptic()
            }
            toggleLike(post.id)
          }}
        >
          <Icon name={post.liked ? 'likeFilled' : 'like'} />
          <Count value={post.likes} format={hideZero} />
        </button>
        <button
          type="button"
          className={`post-action ${post.reposted ? 'is-reposted' : ''}`}
          title="Repost"
          aria-label={`Repost, ${post.reposts}${post.reposted ? ', reposted by you' : ''}`}
          aria-haspopup="dialog"
          onClick={(e) => repost(post, e.currentTarget)}
        >
          <Icon name={post.reposted ? 'repostActive' : 'repost'} />
          <Count value={post.reposts} format={hideZero} />
        </button>
        <button type="button" className="post-action" title="Share" aria-label={`Share, ${post.shares}`} onClick={(e) => share(post, e.currentTarget)}>
          <Icon name="share" />
          <Count value={post.shares} format={hideZero} />
        </button>
      </div>
    </article>
  )
}

/** A quoted post, embedded small. It may have been deleted since it was quoted. */
export function QuoteCard({ post, onOpen }: { post: Post | undefined; onOpen?: (post: Post) => void }) {
  if (!post) return <p className="quote-card quote-gone">This post was deleted.</p>
  const body = (
    <>
      <span className="quote-identity">
        <img src={post.author.avatar} width={20} height={20} alt="" />
        <span className="name">{post.author.name}</span>
        <span className="meta">@{post.author.handle}</span>
      </span>
      {post.body && <span className="quote-body">{post.body}</span>}
      {post.images && post.images.length > 0 && (
        <span className="quote-photos">
          {post.images.length} {post.images.length === 1 ? 'photo' : 'photos'}
        </span>
      )}
    </>
  )
  return onOpen ? (
    <button type="button" className="quote-card" aria-label={`Quoted post by ${post.author.name}: ${post.body}`} onClick={() => onOpen(post)}>
      {body}
    </button>
  ) : (
    <div className="quote-card">{body}</div>
  )
}

/** Toggles your repost and keeps the count honest. */
export function toggleRepost(posts: Post[], id: string): Post[] {
  return posts.map((p) =>
    p.id === id
      ? { ...p, reposted: !p.reposted, reposts: p.reposts + (p.reposted ? -1 : 1), repostedAt: p.reposted ? undefined : Date.now() }
      : p,
  )
}

/** Like toggling shared by every list of posts. */
export function toggleLike(posts: Post[], id: string): Post[] {
  return posts.map((p) => (p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p))
}
