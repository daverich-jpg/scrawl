import { createContext, useContext } from 'react'
import type { Person, Post } from '../data/content'

/** Things any post or person row can do, wherever it's rendered. */
export type Actions = {
  meHandle: string
  toggleLike: (postId: string) => void
  openProfile: (person: Person) => void
  openPostMenu: (post: Post, trigger?: HTMLElement) => void
  /** Opens the conversation a post belongs to (its own, or its parent's for a reply). */
  openThread: (post: Post) => void
  /** Opens the composer in reply mode. Replying to a reply starts with an @mention. */
  reply: (post: Post, trigger?: HTMLElement) => void
  replyCount: (postId: string) => number
  /** Opens the Repost / Quote menu (or Undo repost). */
  repost: (post: Post, trigger?: HTMLElement) => void
  /** Looks up a post by id — used to render quoted posts, which may have been deleted. */
  getPost: (postId: string) => Post | undefined
  /** System share sheet on phones; copies the link elsewhere. */
  share: (post: Post, trigger?: HTMLElement) => void
}

export const ActionsContext = createContext<Actions | null>(null)

export function useActions() {
  const ctx = useContext(ActionsContext)
  if (!ctx) throw new Error('useActions must be used inside ActionsContext')
  return ctx
}
