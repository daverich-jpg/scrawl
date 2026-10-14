import home from '../assets/icons/home.svg'
import homeActive from '../assets/icons/home-active.svg'
import searchTab from '../assets/icons/search-tab.svg'
import searchTabActive from '../assets/icons/search-tab-active.svg'
import bell from '../assets/icons/bell.svg'
import bellActive from '../assets/icons/bell-active.svg'
import feather from '../assets/icons/feather.svg'
import search from '../assets/icons/search.svg'
import x from '../assets/icons/x.svg'
import history from '../assets/icons/history.svg'
import arrowUpLeft from '../assets/icons/arrow-up-left.svg'
import reply from '../assets/icons/reply.svg'
import repost from '../assets/icons/repost.svg'
import repostActive from '../assets/icons/repost-active.svg'
import share from '../assets/icons/share.svg'
import like from '../assets/icons/like.svg'
import likeFilled from '../assets/icons/like-filled.svg'
import battery from '../assets/icons/battery.svg'
import wifi from '../assets/icons/wifi.svg'
import cellular from '../assets/icons/cellular.svg'
import photo from '../assets/icons/photo.svg'
import more from '../assets/icons/more.svg'
import back from '../assets/icons/back.svg'

const icons = {
  home: [home, 24, 24],
  homeActive: [homeActive, 24, 24],
  searchTab: [searchTab, 24, 24],
  searchTabActive: [searchTabActive, 24, 24],
  bell: [bell, 24, 24],
  bellActive: [bellActive, 24, 24],
  feather: [feather, 32, 32],
  search: [search, 24, 24],
  x: [x, 18, 18],
  history: [history, 20, 20],
  arrowUpLeft: [arrowUpLeft, 18, 18],
  reply: [reply, 24, 24],
  repost: [repost, 24, 24],
  repostActive: [repostActive, 24, 24],
  share: [share, 24, 24],
  like: [like, 24, 24],
  likeFilled: [likeFilled, 24, 24],
  battery: [battery, 25.57, 10.33],
  wifi: [wifi, 16.44, 11],
  cellular: [cellular, 18.25, 10.67],
  photo: [photo, 24, 24],
  more: [more, 24, 24],
  back: [back, 24, 24],
} as const

export type IconName = keyof typeof icons

/** Decorative by default — the control that wraps it carries the accessible name. */
export function Icon({ name }: { name: IconName }) {
  const [src, width, height] = icons[name]
  return <img className="icon" src={src} width={width} height={height} alt="" aria-hidden="true" />
}
