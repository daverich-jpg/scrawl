import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Icon } from '../components/Icon'
import { takenHandles, type Person } from '../data/content'
import { initialAvatar } from '../lib/avatar'
import { downscale } from '../lib/images'
import { putPhoto } from '../lib/storage'

const MAX_NAME = 50
const HANDLE = /^[a-z0-9_]{3,15}$/

/** "Dave Okpor" → "daveokpor", made unique against the people already here. */
function suggestHandle(name: string) {
  const base = name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 13) || 'scrawler'
  const padded = base.length < 3 ? `${base}_me`.slice(0, 15) : base
  if (!takenHandles.has(padded)) return padded
  for (let i = 2; ; i++) if (!takenHandles.has(`${padded}${i}`)) return `${padded}${i}`
}

function handleProblem(handle: string): string | null {
  if (handle.length === 0) return 'Pick a handle.'
  if (handle.length < 3) return 'At least 3 characters.'
  if (handle.length > 15) return '15 characters at most.'
  if (!HANDLE.test(handle)) return 'Letters, numbers and _ only.'
  if (takenHandles.has(handle)) return `@${handle} is taken — try @${suggestHandle(handle)}.`
  return null
}

/**
 * Two screens: what Scrawl is, then who you are. Everything else is learnt by using it.
 * The handle is chosen here because it can't be changed later.
 */
export function Onboarding({ initialName, onDone }: { initialName: string; onDone: (p: Person) => void }) {
  const [step, setStep] = useState<'welcome' | 'you'>('welcome')
  const [name, setName] = useState(initialName)
  const [handle, setHandle] = useState(() => (initialName ? suggestHandle(initialName) : ''))
  // Once someone edits the handle themselves, stop overwriting it from the name.
  const [handleEdited, setHandleEdited] = useState(false)
  const [photo, setPhoto] = useState<{ src: string; ref?: string } | null>(null)
  const [photoError, setPhotoError] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const nameId = useId()
  const handleId = useId()

  useEffect(() => {
    if (!handleEdited) setHandle(name.trim() ? suggestHandle(name) : '')
  }, [name, handleEdited])

  const trimmed = name.trim()
  const nameError = trimmed ? null : 'Add the name people will see.'
  const handleError = handleProblem(handle)
  const ready = !nameError && !handleError

  const start = () => {
    // Render and focus inside the tap — iOS only raises the keyboard during a user gesture.
    flushSync(() => setStep('you'))
    nameInput.current?.focus()
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      const { blob } = await downscale(file, 512)
      const ref = crypto.randomUUID()
      const saved = await putPhoto(ref, blob)
      if (photo) URL.revokeObjectURL(photo.src)
      setPhoto({ src: URL.createObjectURL(blob), ref: saved ? ref : undefined })
      setPhotoError('')
    } catch {
      setPhotoError('Couldn’t open that file. Try a JPEG or PNG.')
    }
  }

  const finish = () => {
    setTriedSubmit(true)
    if (!ready) return
    onDone({
      name: trimmed,
      handle,
      bio: '',
      avatar: photo?.src ?? initialAvatar(trimmed),
      avatarRef: photo?.ref,
    })
  }

  if (step === 'welcome') {
    return (
      <main className="onboarding onboarding-welcome screen enter-tab">
        <div className="welcome-mark">
          <h1 className="welcome-wordmark">Scrawl</h1>
          <svg className="welcome-scrawl" viewBox="0 0 100 20" fill="none" aria-hidden="true">
            <path d="M3 12 C 25 4, 45 16, 62 9 S 90 6, 97 10" stroke="#ffda6c" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <p className="welcome-line">Short, honest thoughts.</p>
          <p className="welcome-sub">No scores to keep. Just say the true thing.</p>
        </div>
        <div className="onboarding-actions">
          <button type="button" className="button-primary onboarding-cta" onClick={start}>
            Get started
          </button>
          <p className="supporting supporting-small onboarding-note">This is a prototype — everything you do stays on this phone.</p>
        </div>
      </main>
    )
  }

  const showNameError = triedSubmit && nameError
  const showHandleStatus = handle.length > 0 || triedSubmit

  return (
    <main className="onboarding screen enter-push">
      <header className="header header-compact has-back">
        <button type="button" className="icon-button back-button" aria-label="Back" onClick={() => setStep('welcome')}>
          <Icon name="back" />
        </button>
      </header>
      <form
        className="onboarding-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          finish()
        }}
      >
        <div className="onboarding-intro">
          <h1>What should we call you?</h1>
          <p className="supporting">This is how you’ll show up next to what you write.</p>
        </div>

        <div className="onboarding-photo">
          <img className="profile-avatar" src={photo?.src ?? initialAvatar(trimmed)} width={72} height={72} alt="" />
          <button type="button" className="text-button" onClick={() => fileInput.current?.click()}>
            {photo ? 'Change photo' : 'Add a photo'} <span className="optional">(optional)</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void pickPhoto(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {photoError && (
            <p className="field-error" role="alert">
              {photoError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor={nameId}>Name</label>
          <input
            ref={nameInput}
            id={nameId}
            className="field-input"
            value={name}
            maxLength={MAX_NAME}
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Your name"
            aria-invalid={!!showNameError}
            aria-describedby={showNameError ? `${nameId}-error` : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {showNameError && (
            <p id={`${nameId}-error`} className="field-error">
              {nameError}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor={handleId}>Handle</label>
          <div className={`handle-input ${showHandleStatus && handleError ? 'is-invalid' : ''}`}>
            <span aria-hidden="true">@</span>
            <input
              id={handleId}
              className="field-input"
              value={handle}
              maxLength={15}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              aria-invalid={showHandleStatus && !!handleError}
              aria-describedby={`${handleId}-status`}
              onChange={(e) => {
                setHandleEdited(true)
                setHandle(e.target.value.toLowerCase().replace(/\s/g, ''))
              }}
            />
          </div>
          {/* Live, but polite: it confirms or explains as you type, never shouts. */}
          <p id={`${handleId}-status`} className={`handle-status ${handleError ? 'is-error' : 'is-ok'}`} aria-live="polite">
            {!showHandleStatus ? '' : handleError ? handleError : `@${handle} is yours ✓ — you can’t change it later.`}
          </p>
        </div>

        <div className="onboarding-actions">
          <button type="submit" className="button-primary onboarding-cta" aria-disabled={!ready}>
            Start scrawling
          </button>
        </div>
      </form>
    </main>
  )
}
