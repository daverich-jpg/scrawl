import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { initMotionPreference } from './lib/motion'

initMotionPreference()

createRoot(document.getElementById('root')!).render(<App />)
