/** "now", "5m", "2h", "3d" — the compact age used on posts and notifications. */
export function formatAge(minutes: number) {
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${Math.round(minutes)}m`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h`
  return `${Math.round(minutes / 60 / 24)}d`
}

/** Age from a timestamp, so a saved "now" becomes "2h" when you come back later. */
export const ageSince = (at: number) => formatAge((Date.now() - at) / 60_000)
