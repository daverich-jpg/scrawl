import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Navigation, StatusBar, type Tab } from './components/Chrome'
import { Compose, type ComposeResult } from './components/Compose'
import { EditProfile } from './components/EditProfile'
import { LinkDialog } from './components/LinkDialog'
import { Menu } from './components/Menu'
import { toggleLike, toggleRepost } from './components/PostCard'
import { Toast, type ToastState } from './components/Toast'
import { archive, baseFollowers, baseFollowing, feed, me, seedReplies, type Person, type Post } from './data/content'
import { addReaction, demoLiker, initialNotifications } from './data/notifications'
import { collapseOut, exitOverlay, expandIn, haptic, play } from './lib/motion'
import { parsePostLink, postUrl, sharePost } from './lib/share'
import { ActionsContext, type Actions } from './state/actions'
import { Home, type FocusPost } from './screens/Home'
import { Notifications } from './screens/Notifications'
import { Profile } from './screens/Profile'
import { Search } from './screens/Search'
import { Thread } from './screens/Thread'

/** How long after you post before the demo "like" arrives. */
const DEMO_REACTION_MS = 6000

/** Screens pushed on top of the current tab. The tab stays mounted underneath, so Back keeps its state. */
type Route = { kind: 'profile'; person: Person } | { kind: 'thread'; postId: string }

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [profile, setProfile] = useState<Person>(me)
  // One source of truth, so a like anywhere shows up everywhere. Replies live here too (they have a parentId).
  const [posts, setPosts] = useState([...feed, ...archive, ...seedReplies])
  const [feedIds, setFeedIds] = useState(() => feed.map((p) => p.id))
  const [notifications, setNotifications] = useState(initialNotifications)
  const [following, setFollowing] = useState<Set<string>>(() => new Set())
  // A shared link (#/post/<id>[/<replyId>]) opens straight into that thread.
  const [stack, setStack] = useState<Route[]>(() => {
    const link = parsePostLink(location.hash)
    return link ? [{ kind: 'thread', postId: link.postId }] : []
  })
  const [composing, setComposing] = useState<{ replyingTo?: Post; quoting?: Post } | null>(null)
  const [editing, setEditing] = useState(false)
  const [postMenu, setPostMenu] = useState<Post | null>(null)
  const [repostMenu, setRepostMenu] = useState<Post | null>(null)
  const [focus, setFocus] = useState<FocusPost>(null)
  const [threadFocus, setThreadFocus] = useState<FocusPost>(() => {
    const link = parsePostLink(location.hash)
    return link?.replyId ? { id: link.replyId, n: 1 } : null
  })
  /** Which way the last navigation went, so the incoming screen moves in the matching direction. */
  const [transition, setTransition] = useState<'tab' | 'push' | 'pop' | null>(null)
  const [linkFallback, setLinkFallback] = useState<{ url: string; postId: string } | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const composeInput = useRef<HTMLTextAreaElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Consume the link once it's opened, so Back and refresh behave normally; also catch links opened while the app is up.
  useEffect(() => {
    const open = () => {
      const link = parsePostLink(location.hash)
      if (!link) return
      history.replaceState(null, '', location.pathname + location.search)
      setStack((s) => [...s, { kind: 'thread', postId: link.postId }])
      setThreadFocus((f) => (link.replyId ? { id: link.replyId, n: (f?.n ?? 0) + 1 } : null))
    }
    if (parsePostLink(location.hash)) history.replaceState(null, '', location.pathname + location.search)
    addEventListener('hashchange', open)
    return () => removeEventListener('hashchange', open)
  }, [])

  const countShare = (id: string) => setPosts((p) => p.map((x) => (x.id === id ? { ...x, shares: x.shares + 1 } : x)))

  /** Safari doesn't focus buttons on tap, so callers pass the trigger when they have it. */
  const rememberFocus = (trigger?: HTMLElement | null) => {
    returnFocus.current = trigger ?? (document.activeElement as HTMLElement)
  }
  /**
   * Overlays play a short exit, then unmount. The page has to stop being inert
   * before it can take focus back; `after` runs once everything has settled.
   */
  const closeOverlay = (close: () => void, after?: () => void) =>
    exitOverlay(() => {
      flushSync(close)
      if (returnFocus.current?.isConnected) returnFocus.current.focus()
      after?.()
    })
  /** When the thing you acted on is gone (deleted), hand focus to the toast's Undo instead of losing it. */
  const focusToastAction = () => requestAnimationFrame(() => document.querySelector<HTMLElement>('.toast-undo')?.focus())

  const push = (route: Route) => {
    setTransition('push')
    setStack((s) => [...s, route])
  }
  const pop = () => {
    setTransition('pop')
    setStack((s) => s.slice(0, -1))
  }
  const top = stack.at(-1)

  const openCompose = (mode: { replyingTo?: Post; quoting?: Post } = {}, trigger?: HTMLElement) => {
    rememberFocus(trigger)
    // Render and focus inside the tap itself — iOS only raises the keyboard for focus during a user gesture.
    flushSync(() => setComposing(mode))
    const el = composeInput.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length) // after any @mention prefill
  }

  const publish = ({ body, images }: ComposeResult) => {
    const replyingTo = composing?.replyingTo
    const rootId = replyingTo ? (replyingTo.parentId ?? replyingTo.id) : undefined
    const post: Post = {
      id: `me-${Date.now()}`,
      parentId: rootId,
      quoteId: composing?.quoting?.id,
      author: profile,
      age: 'now',
      body,
      images,
      likes: 0,
      reposts: 0,
      shares: 0,
      createdAt: Date.now(),
    }

    if (rootId) {
      const inThatThread = top?.kind === 'thread' && top.postId === rootId
      haptic(12)
      if (inThatThread) {
        // You're looking at the conversation: the sheet sinks away and your reply opens into place.
        closeOverlay(
          () => {
            setComposing(null)
            setPosts((p) => [...p, post])
            setThreadFocus((f) => ({ id: post.id, n: (f?.n ?? 0) + 1 }))
          },
          () => expandIn(post.id),
        )
      } else {
        setPosts((p) => [...p, post])
        closeOverlay(() => setComposing(null))
        // Don't pull people out of the feed; offer the way in instead.
        setToast({
          id: Date.now(),
          message: 'Reply posted',
          action: {
            label: 'View',
            onClick: () => {
              push({ kind: 'thread', postId: rootId })
              setThreadFocus((f) => ({ id: post.id, n: (f?.n ?? 0) + 1 }))
            },
          },
        })
      }
      return
    }

    haptic(12)
    // The sheet sinks away, then the post opens into the top of the feed and glows.
    closeOverlay(
      () => {
        setComposing(null)
        setPosts((p) => [post, ...p])
        setFeedIds((ids) => [post.id, ...ids])
        if (stack.length > 0 || tab !== 'home') setTransition('tab')
        setStack([])
        setTab('home')
        setFocus((f) => ({ id: post.id, n: (f?.n ?? 0) + 1 }))
        setToast({ id: Date.now(), message: 'Posted' })
      },
      () => expandIn(post.id),
    )

    // Demo: someone reacts shortly after, so the bell badge can be seen arriving.
    timers.current.push(
      window.setTimeout(() => {
        setNotifications((list) => addReaction(list, 'like', demoLiker, post.id))
        setPosts((p) => p.map((x) => (x.id === post.id ? { ...x, likes: x.likes + 1 } : x)))
      }, DEMO_REACTION_MS),
    )
  }

  /** The post folds away and the list closes over it; Undo opens it back into the same place. */
  const deletePost = (post: Post) => {
    const postIndex = posts.findIndex((p) => p.id === post.id)
    const feedIndex = feedIds.indexOf(post.id)
    collapseOut(post.id, () => {
      flushSync(() => {
        setPosts((p) => p.filter((x) => x.id !== post.id))
        setFeedIds((ids) => ids.filter((id) => id !== post.id))
        setToast({
          id: Date.now(),
          message: post.parentId ? 'Reply deleted' : 'Post deleted',
          action: {
            label: 'Undo',
            onClick: () => {
              flushSync(() => {
                setPosts((p) => insertAt(p, postIndex, post))
                if (feedIndex >= 0) setFeedIds((ids) => insertAt(ids, feedIndex, post.id))
              })
              expandIn(post.id)
            },
          },
        })
      })
      focusToastAction()
    })
  }

  const saveProfile = (next: Person) => {
    setProfile(next)
    // Your existing posts and replies pick up the new name, photo and bio too.
    setPosts((p) => p.map((x) => (x.author.handle === next.handle ? { ...x, author: next } : x)))
    closeOverlay(() => setEditing(false))
    setToast({ id: Date.now(), message: 'Profile updated' })
  }

  const markRead = useCallback(
    (ids: string[]) => setNotifications((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))),
    [],
  )

  /** From a notification: open the conversation, highlighting the reply if there is one. */
  const openFromNotification = (postId: string, replyId?: string) => {
    push({ kind: 'thread', postId })
    setThreadFocus((f) => (replyId ? { id: replyId, n: (f?.n ?? 0) + 1 } : null))
  }

  const toggleFollow = (handle: string) =>
    setFollowing((s) => {
      const next = new Set(s)
      if (next.has(handle)) next.delete(handle)
      else next.add(handle)
      return next
    })

  const changeTab = (t: Tab) => {
    if (t === tab && stack.length === 0) return
    setTransition('tab')
    setStack([])
    setTab(t)
  }

  const byId = new Map(posts.map((p) => [p.id, p]))

  const replyCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of posts) if (p.parentId) counts.set(p.parentId, (counts.get(p.parentId) ?? 0) + 1)
    return counts
  }, [posts])

  const actions: Actions = {
    meHandle: profile.handle,
    toggleLike: (id) => setPosts((p) => toggleLike(p, id)),
    openProfile: (person) => {
      if (person.handle === profile.handle) changeTab('profile')
      else if (!(top?.kind === 'profile' && top.person.handle === person.handle)) push({ kind: 'profile', person })
    },
    openPostMenu: (post, trigger) => {
      rememberFocus(trigger)
      setPostMenu(post)
    },
    openThread: (post) => {
      const rootId = post.parentId ?? post.id
      if (top?.kind === 'thread' && top.postId === rootId) return
      push({ kind: 'thread', postId: rootId })
      setThreadFocus((f) => (post.parentId ? { id: post.id, n: (f?.n ?? 0) + 1 } : null))
    },
    reply: (post, trigger) => openCompose({ replyingTo: post }, trigger),
    repost: (post, trigger) => {
      rememberFocus(trigger)
      setRepostMenu(post)
    },
    getPost: (id) => byId.get(id),
    share: async (post, trigger) => {
      rememberFocus(trigger)
      const outcome = await sharePost(post)
      // Count only what actually left the app; a dismissed sheet changes nothing.
      if (outcome === 'shared') countShare(post.id)
      if (outcome === 'copied') {
        countShare(post.id)
        setToast({ id: Date.now(), message: 'Link copied' })
      }
      if (outcome === 'blocked') setLinkFallback({ url: postUrl(post), postId: post.id })
    },
    replyCount: (id) => replyCounts.get(id) ?? 0,
  }

  const dismissToast = useCallback(() => setToast(null), [])
  const topLevel = posts.filter((p) => !p.parentId)
  const unread = notifications.filter((n) => !n.read).length
  const followersOf = (handle: string) => (baseFollowers[handle] ?? 0) + (following.has(handle) ? 1 : 0)
  const postsBy = (handle: string) => topLevel.filter((p) => p.author.handle === handle)
  /** Your profile: your posts plus what you've reposted, newest activity first. */
  const myProfilePosts = topLevel
    .filter((p) => p.author.handle === profile.handle || p.reposted)
    .map((p, i) => ({ p, i, at: p.repostedAt ?? p.createdAt ?? 0 }))
    .sort((a, b) => b.at - a.at || a.i - b.i)
    .map(({ p }) => p)
  const overlayOpen = composing !== null || editing || postMenu !== null || repostMenu !== null || linkFallback !== null

  return (
    <ActionsContext.Provider value={actions}>
      <div className="phone">
        {/* Everything behind an overlay is inert: no stray taps, no focus escaping. */}
        <div className="app-body" inert={overlayOpen}>
          <StatusBar />
          <div className={`screen ${transition ? `enter-${transition}` : ''}`} key={`tab-${tab}`} hidden={top !== undefined}>
            {tab === 'home' && <Home posts={feedIds.flatMap((id) => byId.get(id) ?? [])} focus={focus} />}
            {tab === 'search' && <Search posts={topLevel} />}
            {tab === 'notifications' && (
              <Notifications
                notifications={notifications}
                posts={posts}
                following={following}
                onMarkRead={markRead}
                onOpenPost={openFromNotification}
                onToggleFollow={toggleFollow}
              />
            )}
            {tab === 'profile' && (
              <Profile
                person={profile}
                isMe
                posts={myProfilePosts}
                followers={followersOf(profile.handle)}
                following={following.size}
                isFollowing={false}
                onToggleFollow={() => {}}
                onEdit={(trigger) => {
                  rememberFocus(trigger)
                  setEditing(true)
                }}
                onCompose={() => openCompose()}
              />
            )}
          </div>

          {top?.kind === 'profile' && (
            <div className={`screen ${transition ? `enter-${transition}` : ''}`} key={`profile-${top.person.handle}-${stack.length}`}>
              <Profile
                person={top.person}
                isMe={false}
                posts={postsBy(top.person.handle)}
                followers={followersOf(top.person.handle)}
                following={baseFollowing[top.person.handle] ?? 0}
                isFollowing={following.has(top.person.handle)}
                onToggleFollow={() => toggleFollow(top.person.handle)}
                onEdit={() => {}}
                onCompose={() => openCompose()}
                onBack={pop}
              />
            </div>
          )}
          {top?.kind === 'thread' && (
            <div className={`screen ${transition ? `enter-${transition}` : ''}`} key={`thread-${top.postId}-${stack.length}`}>
              <Thread
                post={byId.get(top.postId)}
                replies={posts.filter((p) => p.parentId === top.postId)}
                me={profile}
                focus={threadFocus}
                onBack={pop}
              />
            </div>
          )}

          <Navigation tab={tab} onTab={changeTab} onCompose={() => openCompose()} unread={unread} avatar={profile.avatar} />
          <Toast toast={toast} onDismiss={dismissToast} />
        </div>

        {composing && (
          <Compose
            author={profile}
            replyingTo={composing.replyingTo}
            quoting={composing.quoting}
            textareaRef={composeInput}
            onClose={() => closeOverlay(() => setComposing(null))}
            onPost={publish}
          />
        )}
        {editing && <EditProfile profile={profile} onClose={() => closeOverlay(() => setEditing(false))} onSave={saveProfile} />}
        {postMenu && (
          <Menu
            title={postMenu.parentId ? 'Reply options' : 'Post options'}
            // Prevent, then explain: deleting a post takes other people's replies with it.
            note={
              replyCounts.get(postMenu.id)
                ? `Deleting it also removes its ${replyCounts.get(postMenu.id)} ${replyCounts.get(postMenu.id) === 1 ? 'reply' : 'replies'}.`
                : undefined
            }
            options={[
              {
                label: postMenu.parentId ? 'Delete reply' : 'Delete post',
                danger: true,
                onSelect: () => {
                  const post = postMenu
                  closeOverlay(
                    () => setPostMenu(null),
                    () => deletePost(post),
                  )
                },
              },
            ]}
            onCancel={() => closeOverlay(() => setPostMenu(null))}
          />
        )}
        {linkFallback && (
          <LinkDialog
            url={linkFallback.url}
            onClose={() => closeOverlay(() => setLinkFallback(null))}
            onCopied={() => {
              const id = linkFallback.postId
              closeOverlay(() => setLinkFallback(null))
              countShare(id)
              setToast({ id: Date.now(), message: 'Link copied' })
            }}
          />
        )}
        {repostMenu && (
          <Menu
            title={repostMenu.reposted ? 'You reposted this' : 'Share to your profile'}
            options={[
              repostMenu.reposted
                ? {
                    label: 'Undo repost',
                    onSelect: () => {
                      const id = repostMenu.id
                      closeOverlay(() => setRepostMenu(null))
                      setPosts((p) => toggleRepost(p, id))
                      setToast({ id: Date.now(), message: 'Repost removed' })
                    },
                  }
                : {
                    label: 'Repost',
                    hint: 'As it is',
                    onSelect: () => {
                      const id = repostMenu.id
                      const icon = returnFocus.current?.querySelector('.icon')
                      // Spin once the menu is out of the way, so the eye lands on the change.
                      closeOverlay(
                        () => setRepostMenu(null),
                        () => {
                          play(icon, 'is-spinning')
                          haptic()
                        },
                      )
                      setPosts((p) => toggleRepost(p, id))
                      setToast({
                        id: Date.now(),
                        message: 'Reposted to your profile',
                        action: { label: 'Undo', onClick: () => setPosts((p) => toggleRepost(p, id)) },
                      })
                    },
                  },
              {
                label: 'Quote',
                hint: 'Add your take',
                onSelect: () => {
                  const post = repostMenu
                  const trigger = returnFocus.current
                  flushSync(() => setRepostMenu(null))
                  openCompose({ quoting: post }, trigger ?? undefined)
                },
              },
            ]}
            onCancel={() => closeOverlay(() => setRepostMenu(null))}
          />
        )}
      </div>
    </ActionsContext.Provider>
  )
}

function insertAt<T>(list: T[], index: number, item: T): T[] {
  const i = Math.max(0, Math.min(index, list.length))
  return [...list.slice(0, i), item, ...list.slice(i)]
}
