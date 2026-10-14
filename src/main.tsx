import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { initMotionPreference } from './lib/motion'
import { load } from './lib/persist'

initMotionPreference()

// Restore this device's saved session (or the sample content) before the first paint,
// so nothing flashes from sample data to your data.
load().then((initial) => createRoot(document.getElementById('root')!).render(<App initial={initial} />))

// Installable app: the service worker only runs in production builds, so dev keeps hot reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'))
}
