import type { Post } from '../data/content'

/**
 * Links use the hash (#/post/<id>) so they work on static hosting
 * like GitHub Pages without any server rewrites.
 * A reply links to its thread with the reply highlighted: #/post/<rootId>/<replyId>.
 */
export function postUrl(post: Post): string {
  const path = post.parentId ? `#/post/${post.parentId}/${post.id}` : `#/post/${post.id}`
  return `${location.origin}${location.pathname}${path}`
}

export function parsePostLink(hash: string): { postId: string; replyId?: string } | null {
  const m = hash.match(/^#\/post\/([\w-]+)(?:\/([\w-]+))?$/)
  return m ? { postId: m[1], replyId: m[2] } : null
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'blocked'

/**
 * Phones: the system share sheet. Elsewhere: copy the link in one tap.
 * 'blocked' means even copying failed — the caller shows the link to copy by hand.
 */
export async function sharePost(post: Post): Promise<ShareOutcome> {
  const url = postUrl(post)
  const excerpt = post.body.length > 100 ? `${post.body.slice(0, 100).trimEnd()}…` : post.body
  const data = { title: `${post.author.name} on Scrawl`, text: excerpt ? `“${excerpt}”` : undefined, url }

  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (e) {
      // Dismissing the sheet isn't an error — they just changed their mind.
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Anything else (e.g. not allowed here): fall through to copying.
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'blocked'
  }
}
