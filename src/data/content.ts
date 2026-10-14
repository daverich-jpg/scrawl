import alex from '../assets/avatars/alex.png'
import jordan from '../assets/avatars/jordan.png'
import riley from '../assets/avatars/riley.png'
import sam from '../assets/avatars/sam.png'
import noah from '../assets/avatars/noah.png'
import meAvatar from '../assets/avatars/me.png'

export type Person = { name: string; handle: string; avatar: string; bio: string }

export type PostImage = { src: string; alt: string; width: number; height: number }

export type Post = {
  id: string
  author: Person
  age: string
  body: string
  /** Set on replies: the top-level post this belongs to. Threads are flat, one level deep. */
  parentId?: string
  likes: number
  reposts: number
  shares: number
  liked?: boolean
  /** You reposted it. `repostedAt` orders it among your own posts on your profile. */
  reposted?: boolean
  repostedAt?: number
  /** A quote post embeds this post below its own text. */
  quoteId?: string
  /** Set on posts made in this session, for ordering against reposts. */
  createdAt?: number
  images?: PostImage[]
}

const people = {
  alex: { name: 'Alex Morgan', handle: 'alexm', avatar: alex, bio: 'Notes on life and the plans we make.' },
  jordan: { name: 'Jordan Ellis', handle: 'jordane', avatar: jordan, bio: 'Trying, mostly.' },
  riley: { name: 'Riley Chen', handle: 'rileyc', avatar: riley, bio: 'Writing about work, life and starting again.' },
  sam: { name: 'Sam Rivera', handle: 'samr', avatar: sam, bio: 'Small joys, written down.' },
  noah: { name: 'Noah Brooks', handle: 'noahb', avatar: noah, bio: 'Bad at things, on purpose.' },
} satisfies Record<string, Person>

export const allPeople: Person[] = Object.values(people)

/** The signed-in user — placeholder identity for posts written in Compose. */
export const me: Person = { name: 'David Okpor', handle: 'davido', avatar: meAvatar, bio: 'Writing it down so it stops living in my head.' }

/** Follower counts before the signed-in user follows anyone. */
export const baseFollowers: Record<string, number> = {
  alexm: 1840,
  jordane: 312,
  rileyc: 967,
  samr: 2210,
  noahb: 128,
  davido: 214,
}

export const baseFollowing: Record<string, number> = { alexm: 211, jordane: 96, rileyc: 140, samr: 302, noahb: 57 }

export const feed: Post[] = [
  { id: 'p1', author: people.alex, age: '2h', body: 'Your life will probably end before your plans do.', likes: 146, reposts: 60, shares: 27, liked: true },
  { id: 'p2', author: people.jordan, age: '2h', body: 'You can do your best and still disappoint someone.', likes: 146, reposts: 60, shares: 27 },
  { id: 'p3', author: people.riley, age: '2h', body: 'You can be qualified and still be unemployed.', likes: 146, reposts: 60, shares: 27 },
  { id: 'p4', author: people.sam, age: '2h', body: 'Not everyone will remember you.', likes: 146, reposts: 60, shares: 27 },
  { id: 'p5', author: people.noah, age: '2h', body: 'Its okay to suck', likes: 146, reposts: 60, shares: 27 },
  { id: 'm1', author: me, age: '3h', body: 'Some days the bravest thing is replying to the text.', likes: 12, reposts: 2, shares: 1 },
  { id: 'm2', author: me, age: '1d', body: 'Nobody tells you how much of adulthood is waiting on hold.', likes: 31, reposts: 6, shares: 3 },
]

/** Posts only findable through search, so results aren't just the feed again. */
export const archive: Post[] = [
  { id: 'a1', author: people.sam, age: '4h', body: 'Life feels a little lighter when you stop keeping score.', likes: 84, reposts: 12, shares: 9 },
  { id: 'a2', author: people.jordan, age: '1d', body: 'Creative blocks are just your taste outrunning your hands.', likes: 203, reposts: 33, shares: 12 },
  { id: 'a3', author: people.riley, age: '2d', body: 'New beginnings rarely feel like beginnings. They feel like Tuesday.', likes: 117, reposts: 19, shares: 6 },
  { id: 'a4', author: people.noah, age: '3d', body: 'Small joys: cold side of the pillow, a text back, everyday life going fine.', likes: 64, reposts: 5, shares: 3 },
]

/** Replies already in threads. Reply counts are derived from these, so the number always matches what you see. */
export const seedReplies: Post[] = [
  { id: 'r1', parentId: 'm1', author: people.riley, age: '12m', body: 'This one stayed with me all day. Replied to mine finally.', likes: 3, reposts: 0, shares: 0 },
  { id: 'r2', parentId: 'm1', author: people.sam, age: '1h', body: 'Needed this today.', likes: 5, reposts: 0, shares: 0 },
  { id: 'r3', parentId: 'p1', author: people.jordan, age: '1h', body: 'And somehow that’s freeing?', likes: 22, reposts: 1, shares: 0 },
  { id: 'r4', parentId: 'p1', author: people.noah, age: '58m', body: 'Plans are just hopes with spreadsheets.', likes: 41, reposts: 6, shares: 2 },
  { id: 'r5', parentId: 'p2', author: people.riley, age: '1h', body: 'Story of my twenties.', likes: 9, reposts: 0, shares: 0 },
  { id: 'r6', parentId: 'p5', author: people.noah, age: '20h', body: '@davido you said this better than I did last week.', likes: 7, reposts: 0, shares: 0 },
  { id: 'r7', parentId: 'm2', author: people.alex, age: '22h', body: 'On hold right now, reading this.', likes: 14, reposts: 1, shares: 0 },
]

export const discovery = ['Everyday life', 'Creative blocks', 'New beginnings']

export const initialRecents = ['life', 'small joys', '@alexm']
