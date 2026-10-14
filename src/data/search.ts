import { allPeople, type Person, type Post } from './content'

export type SearchResult = { people: Person[]; posts: Post[] }
export type SearchError = 'offline' | 'failed'

const normalize = (term: string) => term.trim().toLowerCase().replace(/^@/, '')

export function match(term: string, posts: Post[]): SearchResult {
  const t = normalize(term)
  return {
    people: allPeople.filter((p) => [p.name, p.handle, p.bio].some((s) => s.toLowerCase().includes(t))),
    posts: posts.filter((p) => [p.body, p.author.name, p.author.handle].some((s) => s.toLowerCase().includes(t))),
  }
}

/**
 * Fake network round trip. Latency varies so both the fast path (no skeleton)
 * and the slow path (skeleton) get exercised. Add `?fail` to the URL to force
 * the error state; real offline is detected from the browser.
 */
export function request(): Promise<void> {
  const latency = 150 + Math.random() * 950
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (!navigator.onLine) reject('offline' satisfies SearchError)
      else if (new URLSearchParams(location.search).has('fail')) reject('failed' satisfies SearchError)
      else resolve()
    }, latency)
  })
}

/** "Did you mean" — the closest word in the corpus within two edits. */
export function suggest(term: string, posts: Post[]): string | null {
  const t = normalize(term)
  if (t.length < 3 || t.includes(' ')) return null
  const vocab = new Set<string>()
  const add = (s: string) => s.toLowerCase().match(/[a-z]{3,}/g)?.forEach((w) => vocab.add(w))
  allPeople.forEach((p) => [p.name, p.handle, p.bio].forEach(add))
  posts.forEach((p) => add(p.body))

  let best: string | null = null
  let bestDistance = 3
  for (const word of vocab) {
    const d = distance(t, word)
    if (d > 0 && d < bestDistance) {
      best = word
      bestDistance = d
    }
  }
  return best
}

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return Infinity
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}
