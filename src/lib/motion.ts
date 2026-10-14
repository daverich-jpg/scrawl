/**
 * Motion is on unless the person asked for less (OS "Reduce motion").
 * `?motion=full` / `?motion=reduced` override it, so designers with reduced
 * motion turned on can still review the animated version.
 */
export function initMotionPreference() {
  const query = matchMedia('(prefers-reduced-motion: reduce)')
  const force = new URLSearchParams(location.search).get('motion')
  const apply = () => {
    const reduce = force === 'full' ? false : force === 'reduced' ? true : query.matches
    document.documentElement.classList.toggle('reduce-motion', reduce)
  }
  apply()
  query.addEventListener('change', apply)
}

export const reducedMotion = () => document.documentElement.classList.contains('reduce-motion')

export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)' // entrances: fast start, soft landing
export const EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)' // exits: get out of the way
export const EXIT_MS = 150

/** A tiny tap on Android (iOS Safari has no vibration API). Only at moments that matter. */
export function haptic(ms = 8) {
  if (!reducedMotion()) navigator.vibrate?.(ms)
}

/** Replays a one-shot CSS animation class (heart pop, repost spin) on an element. */
export function play(el: Element | null | undefined, className: string) {
  if (!el || reducedMotion()) return
  el.classList.remove(className)
  void (el as HTMLElement).offsetWidth // restart the animation
  el.classList.add(className)
  el.addEventListener('animationend', () => el.classList.remove(className), { once: true })
}

/** Lets an overlay (sheet, menu, dialog) play its exit before it's unmounted. */
export function exitOverlay(done: () => void) {
  const overlays = document.querySelectorAll('.phone > .sheet, .phone > .scrim')
  const el = overlays[overlays.length - 1]
  if (!el || reducedMotion()) return done()
  el.classList.add('is-leaving')
  window.setTimeout(done, EXIT_MS)
}

/** List items are the direct children of these containers. */
const LIST_ITEM = '.feed > *, .profile-posts > *, .thread-replies > *, .section-tight > *'

function listItems(postId: string): HTMLElement[] {
  return [...document.querySelectorAll(`[data-post-id="${postId}"]`)]
    .map((a) => a.closest<HTMLElement>(LIST_ITEM))
    .filter((el): el is HTMLElement => el !== null)
}

/** Shrinks a post's gap along with it, so the posts below glide up instead of snapping. */
function gapSide(el: HTMLElement) {
  const gap = parseFloat(getComputedStyle(el.parentElement!).rowGap) || 0
  return el.nextElementSibling ? { marginBottom: `-${gap}px` } : { marginTop: `-${gap}px` }
}

/** A deleted post folds away and the list closes over it; `done` removes it from state. */
export function collapseOut(postId: string, done: () => void) {
  const items = listItems(postId)
  if (items.length === 0 || reducedMotion()) return done()
  Promise.all(
    items.map((el) => {
      el.style.overflow = 'hidden'
      return el.animate([{ height: `${el.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0, ...gapSide(el) }], {
        duration: 240,
        easing: EASE_IN,
        fill: 'forwards',
      }).finished
    }),
  ).then(done, done)
}

/** A new or restored post opens into place, pushing the list down, rather than popping in. */
export function expandIn(postId: string) {
  if (reducedMotion()) return
  // Two frames: one for React to commit, one for layout.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      for (const el of listItems(postId)) {
        const height = el.offsetHeight
        el.style.overflow = 'hidden'
        el.animate([{ height: '0px', opacity: 0, ...gapSide(el) }, { height: `${height}px`, opacity: 1 }], {
          duration: 320,
          easing: EASE_OUT,
        }).finished.then(() => (el.style.overflow = ''))
      }
    }),
  )
}

/** Rolls a number up (or down) when it changes, like an odometer. */
export function rollNumber(el: HTMLElement | null, direction: 1 | -1) {
  if (!el || reducedMotion()) return
  el.animate(
    [
      { transform: `translateY(${direction * 70}%)`, opacity: 0 },
      { transform: 'none', opacity: 1 },
    ],
    { duration: 240, easing: EASE_OUT },
  )
}
