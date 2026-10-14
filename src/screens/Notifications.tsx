import { useEffect, useState } from 'react'
import { Header } from '../components/Chrome'
import { Icon, type IconName } from '../components/Icon'
import type { Post } from '../data/content'
import { notificationAge, type Notification } from '../data/notifications'
import { useActions } from '../state/actions'

type Filter = 'all' | 'replies'

const KIND_ICON: Record<Notification['kind'], IconName | null> = {
  reply: 'reply',
  mention: 'reply',
  like: 'likeFilled',
  repost: 'repost',
  follow: null,
}

export function Notifications({
  notifications,
  posts,
  following,
  onMarkRead,
  onOpenPost,
  onToggleFollow,
}: {
  notifications: Notification[]
  posts: Post[]
  following: Set<string>
  onMarkRead: (ids: string[]) => void
  onOpenPost: (postId: string, replyId?: string) => void
  onToggleFollow: (handle: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  // What was unread when you arrived (or arrived while you're here) stays under "New"
  // for this visit, even though the badge clears straight away.
  const [fresh, setFresh] = useState(() => new Set(notifications.filter((n) => !n.read).map((n) => n.id)))

  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).map((n) => n.id)
    if (unread.length === 0) return
    setFresh((prev) => new Set([...prev, ...unread]))
    onMarkRead(unread)
  }, [notifications, onMarkRead])

  const visible = notifications.filter((n) => filter === 'all' || n.kind === 'reply' || n.kind === 'mention')
  const fresher = visible.filter((n) => fresh.has(n.id))
  const earlier = visible.filter((n) => !fresh.has(n.id))
  const postById = new Map(posts.map((p) => [p.id, p]))

  const row = (n: Notification) => (
    <NotificationRow
      key={n.id}
      n={n}
      isNew={fresh.has(n.id)}
      post={n.postId ? postById.get(n.postId) : undefined}
      following={following}
      onOpenPost={onOpenPost}
      onToggleFollow={onToggleFollow}
    />
  )

  return (
    <div className="scroll">
      <Header variant="compact" title="Notifications" />
      <main className="search-content">
        <div
          className="filters"
          role="group"
          aria-label="Filter notifications"
          style={{ '--i': filter === 'all' ? 0 : 1, '--n': 2 } as React.CSSProperties}
        >
          {(
            [
              ['all', 'All'],
              ['replies', 'Replies'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className="filter" aria-pressed={filter === id} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="state-copy empty-tab">
            <h2>{filter === 'replies' ? 'No replies yet' : 'Nothing yet'}</h2>
            <p className="supporting">
              {filter === 'replies'
                ? 'When someone replies to you or mentions you, it shows up here.'
                : 'When people reply, react or follow you, it shows up here.'}
            </p>
          </div>
        ) : (
          <div className="results">
            {fresher.length > 0 && (
              <section className="section-tight" aria-labelledby="new-heading">
                <div className="section-heading">
                  <h2 id="new-heading">New</h2>
                </div>
                <ul className="notif-list">{fresher.map(row)}</ul>
              </section>
            )}
            {earlier.length > 0 && (
              <section className="section-tight" aria-labelledby="earlier-heading">
                <div className="section-heading">
                  <h2 id="earlier-heading">{fresher.length > 0 ? 'Earlier' : 'Recent'}</h2>
                </div>
                <ul className="notif-list">{earlier.map(row)}</ul>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function NotificationRow({
  n,
  isNew,
  post,
  following,
  onOpenPost,
  onToggleFollow,
}: {
  n: Notification
  isNew: boolean
  post?: Post
  following: Set<string>
  onOpenPost: (postId: string, replyId?: string) => void
  onToggleFollow: (handle: string) => void
}) {
  const [first] = n.actors
  const { openProfile } = useActions()
  const others = n.count - 1
  const icon = KIND_ICON[n.kind]
  const isFollowing = following.has(first.handle)

  const body = (
    <>
      <span className="notif-avatar">
        <img className="avatar" src={first.avatar} width={40} height={40} alt="" />
        {icon && (
          <span className={`notif-kind kind-${n.kind}`} aria-hidden="true">
            <Icon name={icon} />
          </span>
        )}
      </span>
      <span className="notif-text">
        <span className="notif-line">
          {isNew && <span className="sr-only">New: </span>}
          <strong>{first.name}</strong>
          {others > 0 && ` and ${others} ${others === 1 ? 'other' : 'others'}`} {verb(n)}
          <span className="notif-time">
            {' · '}
            {notificationAge(n)}
          </span>
        </span>
        {n.text && <span className="notif-quote">{n.text}</span>}
        {post && n.kind !== 'mention' && <span className="notif-snippet">{post.body}</span>}
      </span>
      {isNew && <span className="notif-dot" aria-hidden="true" />}
    </>
  )

  return (
    <li className={`notif ${isNew ? 'is-new' : ''}`}>
      {n.postId ? (
        <button type="button" className="notif-main" onClick={() => onOpenPost(n.postId!, n.replyId)}>
          {body}
        </button>
      ) : (
        <button type="button" className="notif-main" onClick={() => openProfile(first)}>
          {body}
        </button>
      )}
      {n.kind === 'follow' && (
        <button
          type="button"
          className={`follow-button ${isFollowing ? 'is-following' : ''}`}
          aria-pressed={isFollowing}
          onClick={() => onToggleFollow(first.handle)}
        >
          {isFollowing ? 'Following' : 'Follow back'}
        </button>
      )}
    </li>
  )
}

function verb(n: Notification) {
  switch (n.kind) {
    case 'reply':
      return 'replied to your post'
    case 'mention':
      return 'mentioned you'
    case 'like':
      return 'liked your post'
    case 'repost':
      return 'reposted your post'
    case 'follow':
      return 'followed you'
  }
}
