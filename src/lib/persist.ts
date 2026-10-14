import { allPeople, archive, feed, me, seedReplies, type Person, type Post, type PostImage } from '../data/content'
import { initialNotifications, type Notification } from '../data/notifications'
import { getPhoto, prunePhotos, readJSON, writeJSON } from './storage'

/** Everything that should survive a refresh. Toasts, open sheets and scroll position don't. */
export type AppData = {
  posts: Post[]
  feedIds: string[]
  notifications: Notification[]
  following: string[]
  profile: Person
}

/** Bump when the stored shape changes; older saves are ignored rather than half-loaded. */
const VERSION = 1
const KEY = 'state'

/*
 * People are stored by handle, never as objects: bundled avatar URLs carry a build hash
 * that changes on every deploy, so a saved URL would break after the next release.
 */
type StoredImage = Omit<PostImage, 'src'>
type StoredPost = Omit<Post, 'author' | 'images'> & { author: string; images?: StoredImage[] }
type StoredNotification = Omit<Notification, 'actors'> & { actors: string[] }
type StoredProfile = { name: string; bio: string; avatarRef?: string }
type Stored = {
  version: number
  posts: StoredPost[]
  feedIds: string[]
  notifications: StoredNotification[]
  following: string[]
  profile: StoredProfile
}

export function seedData(): AppData {
  return {
    posts: [...feed, ...archive, ...seedReplies],
    feedIds: feed.map((p) => p.id),
    notifications: initialNotifications,
    following: [],
    profile: me,
  }
}

export function save(data: AppData): boolean {
  const stored: Stored = {
    version: VERSION,
    posts: data.posts.map(({ author, images, ...rest }) => ({
      ...rest,
      author: author.handle,
      // Only photos with a stored copy can come back; the rest are dropped rather than broken.
      images: images?.filter((i) => i.ref).map(({ src: _src, ...img }) => img),
    })),
    feedIds: data.feedIds,
    notifications: data.notifications.map(({ actors, ...rest }) => ({ ...rest, actors: actors.map((a) => a.handle) })),
    following: data.following,
    profile: { name: data.profile.name, bio: data.profile.bio, avatarRef: data.profile.avatarRef },
  }
  return writeJSON(KEY, stored)
}

/** Restores the last session on this device, or the sample content if there isn't one. */
export async function load(): Promise<AppData> {
  const stored = readJSON<Stored>(KEY)
  if (!stored || stored.version !== VERSION) return seedData()

  try {
    const urls = new Map<string, string>()
    const urlFor = async (ref: string) => {
      if (!urls.has(ref)) {
        const blob = await getPhoto(ref)
        if (blob) urls.set(ref, URL.createObjectURL(blob))
      }
      return urls.get(ref)
    }

    const avatar = stored.profile.avatarRef ? await urlFor(stored.profile.avatarRef) : undefined
    const profile: Person = {
      ...me,
      name: stored.profile.name,
      bio: stored.profile.bio,
      avatar: avatar ?? me.avatar,
      avatarRef: avatar ? stored.profile.avatarRef : undefined,
    }
    const people = new Map([...allPeople, profile].map((p) => [p.handle, p]))
    const person = (handle: string) => people.get(handle)

    const posts: Post[] = []
    for (const p of stored.posts) {
      const author = person(p.author)
      if (!author) continue
      const images: PostImage[] = []
      for (const img of p.images ?? []) {
        const src = img.ref ? await urlFor(img.ref) : undefined
        if (src) images.push({ ...img, src })
      }
      posts.push({ ...p, author, images: images.length ? images : undefined })
    }

    const notifications = stored.notifications.flatMap((n) => {
      const actors = n.actors.map(person).filter((a): a is Person => !!a)
      return actors.length ? [{ ...n, actors }] : []
    })

    // Tidy up photos that nothing refers to any more (deleted posts, abandoned drafts).
    void prunePhotos(new Set(urls.keys()))

    return { posts, feedIds: stored.feedIds, notifications, following: stored.following, profile }
  } catch {
    // A corrupt save shouldn't lock anyone out of the app.
    return seedData()
  }
}
