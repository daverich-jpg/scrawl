# Scrawl

A mobile-first prototype of a small, honest text-sharing app — built from a Figma design and shaped by UX reviews at each step.

## Run it

```bash
npm install
npm run dev   # http://localhost:5260
```

Add `?motion=full` to preview the animations if your OS has Reduce Motion turned on (`?motion=reduced` forces the calm version).

## What's in it

- **Onboarding** — a welcome screen, then name, handle (checked live) and an optional photo; a first-post nudge on Home

- **Home** — feed with a brand header that collapses as you scroll
- **Search** — recent and suggested searches, filters, highlighted matches, empty / error / loading states
- **Compose** — text (280 chars) and up to 4 photos from the device, with alt text
- **Replies** — flat threads, reply mode in the composer, real reply counts
- **Repost & quote**, **share** (native share sheet or copy link), deep links (`#/post/<id>`)
- **Notifications** — grouped reactions, New / Earlier, live badge
- **Profile** — your posts and reposts, edit profile, other people's profiles, follow
- **Delete with undo** everywhere, and a motion system that respects Reduce Motion

Everything is saved on the device (localStorage + IndexedDB for photos). **Reset demo** on your profile wipes it and returns to the welcome screen — handy between testers.

Install it from the live site: Safari → Share → Add to Home Screen, or Chrome → Install app.

## Stack

React 19, Vite, TypeScript, plain CSS with design tokens (`src/styles.css`).
