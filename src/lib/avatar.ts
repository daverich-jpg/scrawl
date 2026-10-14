/**
 * A placeholder avatar for people who haven't picked a photo: their initial on a warm tile.
 * Generated as an SVG data URL, so it needs no storage and survives every deploy.
 */
const TILES = ['#ffda6c', '#f0b87a', '#c9a6e8', '#9cc9a8', '#8fb6e0', '#f09a8a']

export function initialAvatar(name: string): string {
  const letter = (name.trim()[0] ?? '?').toUpperCase()
  const tile = TILES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TILES.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${tile}"/><text x="40" y="54" text-anchor="middle" font-family="system-ui, sans-serif" font-size="38" font-weight="700" fill="#1c1409">${escapeXml(letter)}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)
}
