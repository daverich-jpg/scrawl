import { useEffect, useId, useRef, useState } from 'react'
import type { Person } from '../data/content'
import { ActionSheet, useVisualViewport } from './Compose'

const MAX_NAME = 50
const MAX_BIO = 160

export function EditProfile({ profile, onClose, onSave }: { profile: Person; onClose: () => void; onSave: (p: Person) => void }) {
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [touchedName, setTouchedName] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const saved = useRef(false)
  const viewport = useVisualViewport()
  const titleId = useId()
  const nameId = useId()
  const bioId = useId()

  // Free a picked photo the person didn't keep.
  const avatarRef = useRef(avatar)
  avatarRef.current = avatar
  useEffect(
    () => () => {
      if (!saved.current && avatarRef.current !== profile.avatar) URL.revokeObjectURL(avatarRef.current)
    },
    [profile.avatar],
  )

  const trimmedName = name.trim()
  const nameError = trimmedName.length === 0 ? 'Your name can’t be empty.' : ''
  const changed = trimmedName !== profile.name || bio.trim() !== profile.bio || avatar !== profile.avatar
  const canSave = changed && !nameError

  const requestClose = () => (changed ? setConfirming(true) : onClose())

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return
    const src = URL.createObjectURL(file)
    const img = new Image()
    img.src = src
    try {
      await img.decode()
      if (avatar !== profile.avatar) URL.revokeObjectURL(avatar)
      setAvatar(src)
      setPhotoError('')
    } catch {
      URL.revokeObjectURL(src)
      setPhotoError('Couldn’t open that file. Try a JPEG or PNG.')
    }
  }

  const save = () => {
    if (!canSave) return
    saved.current = true
    onSave({ ...profile, name: trimmedName, bio: bio.trim(), avatar })
  }

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={viewport}
      onKeyDown={(e) => e.key === 'Escape' && !confirming && requestClose()}
    >
      <header className="sheet-header">
        <button type="button" className="text-button text-button-neutral" onClick={requestClose}>
          Cancel
        </button>
        <h2 id={titleId}>Edit profile</h2>
        <button type="button" className="post-button" disabled={!canSave} onClick={save}>
          Save
        </button>
      </header>

      <form
        className="sheet-body edit-form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="edit-avatar">
          <img className="profile-avatar" src={avatar} width={72} height={72} alt="Your profile photo" />
          <button type="button" className="text-button" onClick={() => fileInput.current?.click()}>
            Change photo
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
            id={nameId}
            className="field-input"
            value={name}
            maxLength={MAX_NAME}
            autoComplete="name"
            aria-invalid={touchedName && !!nameError}
            aria-describedby={touchedName && nameError ? `${nameId}-error` : undefined}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouchedName(true)}
          />
          {touchedName && nameError && (
            <p id={`${nameId}-error`} className="field-error">
              {nameError}
            </p>
          )}
        </div>

        <div className="field">
          <div className="field-label-row">
            <label htmlFor={bioId}>Bio</label>
            <span className="field-count" aria-hidden="true">
              {[...bio].length}/{MAX_BIO}
            </span>
          </div>
          <textarea
            id={bioId}
            className="field-input field-textarea"
            value={bio}
            maxLength={MAX_BIO}
            rows={3}
            placeholder="A line about you"
            aria-describedby={`${bioId}-hint`}
            onChange={(e) => setBio(e.target.value)}
          />
          <span id={`${bioId}-hint`} className="sr-only">
            Up to {MAX_BIO} characters.
          </span>
        </div>

        <div className="field">
          <span className="field-label">Handle</span>
          <p className="field-static">@{profile.handle}</p>
          <p className="supporting supporting-small">Handles can’t be changed yet — it would break links and mentions.</p>
        </div>
      </form>

      {confirming && (
        <ActionSheet
          title="Discard changes?"
          body="Your edits to your profile won’t be saved."
          confirm="Discard"
          cancel="Keep editing"
          onConfirm={onClose}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  )
}
