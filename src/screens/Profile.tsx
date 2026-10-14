import { Header } from '../components/Chrome'
import { PostCard } from '../components/PostCard'
import type { Person, Post } from '../data/content'

export function Profile({
  person,
  isMe,
  posts,
  followers,
  following,
  isFollowing,
  onToggleFollow,
  onEdit,
  onCompose,
  onBack,
}: {
  person: Person
  isMe: boolean
  posts: Post[]
  followers: number
  following: number
  isFollowing: boolean
  onToggleFollow: () => void
  onEdit: (trigger: HTMLElement) => void
  onCompose: () => void
  onBack?: () => void
}) {
  return (
    <div className="scroll">
      <Header variant="compact" title="Profile" onBack={onBack} />
      <main className="search-content">
        <section className="profile-head" aria-label={`${person.name}'s profile`}>
          <div className="profile-identity">
            <div className="profile-names">
              <h2 className="profile-name">{person.name}</h2>
              <p className="meta">@{person.handle}</p>
            </div>
            <img className="profile-avatar" src={person.avatar} width={72} height={72} alt="" />
          </div>
          {person.bio && <p className="profile-bio">{person.bio}</p>}
          {/* Plain text, not big number tiles: counts inform, they aren't the point. */}
          <p className="profile-stats">
            <span>
              <strong>{formatCount(followers)}</strong> {followers === 1 ? 'follower' : 'followers'}
            </span>
            {' · '}
            <span>
              <strong>{formatCount(following)}</strong> following
            </span>
          </p>
          {isMe ? (
            <button type="button" className="button-secondary profile-action" aria-haspopup="dialog" onClick={(e) => onEdit(e.currentTarget)}>
              Edit profile
            </button>
          ) : (
            <button
              type="button"
              className={`profile-action ${isFollowing ? 'button-secondary' : 'button-primary'}`}
              aria-pressed={isFollowing}
              onClick={onToggleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </section>

        <hr className="divider" />

        <section className="section-tight" aria-labelledby="profile-posts">
          <div className="section-heading">
            <h2 id="profile-posts">Posts</h2>
          </div>
          {posts.length === 0 ? (
            <div className="state-copy empty-tab">
              <p className="supporting">{isMe ? 'No posts yet. What’s been on your mind?' : `${person.name.split(' ')[0]} hasn’t posted yet.`}</p>
              {isMe && (
                <button type="button" className="button-secondary" onClick={onCompose}>
                  Write something
                </button>
              )}
            </div>
          ) : (
            <div className="profile-posts">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function formatCount(n: number) {
  if (n < 10_000) return n.toLocaleString()
  return `${(n / 1000).toFixed(n < 100_000 ? 1 : 0).replace(/\.0$/, '')}k`
}
