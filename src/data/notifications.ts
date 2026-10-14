import { allPeople, type Person } from './content'

export type NotificationKind = 'reply' | 'mention' | 'like' | 'repost' | 'follow'

export type Notification = {
  id: string
  kind: NotificationKind
  /** Most recent first. For grouped kinds, only the first few are shown as avatars. */
  actors: Person[]
  /** Total people behind a grouped notification — can exceed `actors.length`. */
  count: number
  postId?: string
  /** For replies and mentions: the reply itself, so the thread can highlight it. */
  replyId?: string
  /** What they wrote, for replies and mentions. */
  text?: string
  minutesAgo: number
  read: boolean
}

const [alex, jordan, riley, sam, noah] = allPeople

export const initialNotifications: Notification[] = [
  {
    id: 'n1',
    kind: 'reply',
    actors: [riley],
    count: 1,
    postId: 'm1',
    replyId: 'r1',
    text: 'This one stayed with me all day. Replied to mine finally.',
    minutesAgo: 12,
    read: false,
  },
  { id: 'n2', kind: 'like', actors: [alex, sam, noah], count: 12, postId: 'm1', minutesAgo: 40, read: false },
  { id: 'n3', kind: 'follow', actors: [jordan], count: 1, minutesAgo: 95, read: false },
  { id: 'n4', kind: 'repost', actors: [sam], count: 1, postId: 'm2', minutesAgo: 60 * 5, read: true },
  {
    id: 'n5',
    kind: 'mention',
    actors: [noah],
    count: 1,
    postId: 'p5',
    replyId: 'r6',
    text: '@davido you said this better than I did last week.',
    minutesAgo: 60 * 20,
    read: true,
  },
  { id: 'n6', kind: 'like', actors: [riley, jordan], count: 4, postId: 'm2', minutesAgo: 60 * 26, read: true },
]

/** Who reacts to a fresh post in the demo, so the badge can be seen arriving. */
export const demoLiker = alex

/** Groups same-kind reactions on the same post, newest first, so ten likes read as one line. */
export function addReaction(list: Notification[], kind: 'like' | 'repost', actor: Person, postId: string): Notification[] {
  const existing = list.find((n) => n.kind === kind && n.postId === postId && !n.read)
  if (existing) {
    const merged = {
      ...existing,
      actors: [actor, ...existing.actors.filter((a) => a.handle !== actor.handle)],
      count: existing.count + 1,
      minutesAgo: 0,
    }
    return [merged, ...list.filter((n) => n.id !== existing.id)]
  }
  return [{ id: `n-${Date.now()}`, kind, actors: [actor], count: 1, postId, minutesAgo: 0, read: false }, ...list]
}

export function age(minutes: number) {
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${Math.round(minutes)}m`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 60 / 24)}d`
}
