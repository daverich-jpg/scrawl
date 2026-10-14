import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import type { Person, Post, PostImage } from '../data/content'
import { downscale } from '../lib/images'
import { putPhoto } from '../lib/storage'
import { Icon } from './Icon'
import { QuoteCard } from './PostCard'

export const MAX_CHARS = 280
export const MAX_PHOTOS = 4
/** The counter stays hidden until it's useful. */
const COUNTER_FROM = 40
const NOTICE_MS = 4000

type Draft = PostImage & { id: string }

export type ComposeResult = { body: string; images: PostImage[] }

export function Compose({
  author,
  replyingTo,
  quoting,
  textareaRef,
  onClose,
  onPost,
}: {
  author: Person
  /** When set, this is a reply: the post is shown above the field for context. */
  replyingTo?: Post
  /** When set, this is a quote post: the quoted post is embedded under your text. */
  quoting?: Post
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onClose: () => void
  onPost: (result: ComposeResult) => void
}) {
  // Replying to someone else's reply starts with their handle, since threads are flat.
  const prefill = replyingTo?.parentId && replyingTo.author.handle !== author.handle ? `@${replyingTo.author.handle} ` : ''
  const [text, setText] = useState(prefill)
  const [images, setImages] = useState<Draft[]>([])
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [describing, setDescribing] = useState<Draft | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const posted = useRef(false)
  const viewport = useVisualViewport()

  // Object URLs are only freed if the draft is abandoned; posted photos live on in the feed.
  const imagesRef = useRef(images)
  imagesRef.current = images
  useEffect(
    () => () => {
      if (!posted.current) imagesRef.current.forEach((img) => URL.revokeObjectURL(img.src))
    },
    [],
  )

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(''), NOTICE_MS)
    return () => clearTimeout(t)
  }, [notice])

  const length = [...text].length // counts emoji as one character
  const remaining = MAX_CHARS - length
  // Untouched @mention prefill doesn't count as something to lose.
  const dirty = (text.trim().length > 0 && text.trim() !== prefill.trim()) || images.length > 0
  const canPost = dirty && remaining >= 0 && !adding
  const full = images.length >= MAX_PHOTOS

  const autosize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const requestClose = () => (dirty ? setConfirming(true) : onClose())

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    // FileList is live and the input gets reset right after this call, so copy it before awaiting.
    const all = [...files]
    const room = MAX_PHOTOS - images.length
    // Some Android galleries hand over HEIC with an empty type, so let the decoder decide.
    const picked = all.filter((f) => f.type === '' || f.type.startsWith('image/'))
    const take = picked.slice(0, room)
    setAdding(true)
    const loaded = (await Promise.all(take.map(load))).filter((d): d is Draft => d !== null)
    setAdding(false)
    setImages((prev) => [...prev, ...loaded].slice(0, MAX_PHOTOS))

    const messages: string[] = []
    if (picked.length > room) messages.push(`Up to ${MAX_PHOTOS} photos per post — added ${take.length}.`)
    const failed = take.length - loaded.length + (all.length - picked.length)
    if (failed > 0) messages.push(`Couldn’t open ${failed === 1 ? 'one file' : `${failed} files`}. Try a JPEG or PNG.`)
    if (messages.length) setNotice(messages.join(' '))
  }

  const remove = (id: string) => {
    setImages((prev) => {
      const gone = prev.find((i) => i.id === id)
      if (gone) URL.revokeObjectURL(gone.src)
      return prev.filter((i) => i.id !== id)
    })
    textareaRef.current?.focus()
  }

  const post = () => {
    if (!canPost) return
    posted.current = true
    onPost({ body: text.trim(), images: images.map(({ id: _id, ...img }) => img) })
  }

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={replyingTo ? `Reply to ${replyingTo.author.name}` : quoting ? `Quote ${quoting.author.name}’s post` : 'New post'}
      style={viewport}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !confirming && !describing) requestClose()
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) post()
      }}
    >
      <header className="sheet-header">
        <button type="button" className="text-button text-button-neutral" onClick={requestClose}>
          Cancel
        </button>
        {/* No visible title: the button names the action and the body shows who it's to. */}
        <button type="button" className="post-button" disabled={!canPost} onClick={post}>
          {replyingTo ? 'Reply' : 'Post'}
        </button>
      </header>

      <div className="sheet-body">
        {replyingTo && (
          <div className="reply-context">
            <div className="reply-context-rail">
              <img className="avatar" src={replyingTo.author.avatar} width={40} height={40} alt="" />
              <span className="reply-line" aria-hidden="true" />
            </div>
            <div className="reply-context-body">
              <p className="identity">
                <span className="name">{replyingTo.author.name}</span>
                <span className="meta">@{replyingTo.author.handle}</span>
              </p>
              <p className="reply-context-text">{replyingTo.body || (replyingTo.images?.length ? 'Photo' : '')}</p>
              <p className="meta reply-context-to">
                Replying to <span className="reply-handle">@{replyingTo.author.handle}</span>
              </p>
            </div>
          </div>
        )}
        <div className="compose-row">
          <img className="avatar" src={author.avatar} width={40} height={40} alt="" />
          <div className="compose-main">
            <p className="name">{author.name}</p>
            <textarea
              ref={textareaRef}
              className="compose-input"
              aria-label={replyingTo ? `Reply to ${replyingTo.author.name}` : 'Post text'}
              placeholder={
                quoting
                  ? 'Add your take…'
                  : !replyingTo
                    ? 'Scrawl something honest…'
                    : replyingTo.author.handle === author.handle
                      ? 'Add a reply…'
                      : `Reply to ${replyingTo.author.name.split(' ')[0]}…`
              }
              rows={2}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                autosize()
              }}
            />
            {images.length > 0 && (
              <ul className={`compose-media ${images.length === 1 ? 'is-single' : ''}`} aria-label="Attached photos">
                {images.map((img, i) => (
                  <li key={img.id} className="compose-thumb" style={images.length === 1 ? { aspectRatio: clampRatio(img) } : undefined}>
                    <img src={img.src} alt={img.alt} />
                    <button type="button" className="thumb-remove" aria-label={`Remove photo ${i + 1}`} onClick={() => remove(img.id)}>
                      <span aria-hidden="true">
                        <Icon name="x" />
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`thumb-alt ${img.alt ? 'has-alt' : ''}`}
                      aria-label={img.alt ? `Edit description for photo ${i + 1}` : `Add description for photo ${i + 1}`}
                      onClick={() => setDescribing(img)}
                    >
                      {img.alt ? 'ALT ✓' : '+ ALT'}
                    </button>
                  </li>
                ))}
                {adding && <li className="compose-thumb is-loading" aria-label="Adding photos" />}
              </ul>
            )}
            {quoting && <QuoteCard post={quoting} />}
          </div>
        </div>
      </div>

      <div className="notice-region" role="status" aria-live="polite">
        {notice && <p className="notice">{notice}</p>}
      </div>

      <div className="compose-toolbar">
        <button
          type="button"
          className="toolbar-button"
          disabled={full || adding}
          aria-label={full ? `Photo limit reached, ${MAX_PHOTOS} of ${MAX_PHOTOS}` : 'Add photos'}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="photo" />
          {images.length > 0 && (
            <span className="toolbar-count" aria-hidden="true">
              {images.length}/{MAX_PHOTOS}
            </span>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files)
            e.target.value = '' // so picking the same photo again still fires
          }}
        />
        {remaining <= COUNTER_FROM && (
          <span className={`counter ${remaining < 0 ? 'is-over' : remaining <= 10 ? 'is-close' : ''}`} aria-live="polite">
            <span aria-hidden="true">{remaining}</span>
            <span className="sr-only">{remaining < 0 ? `${-remaining} characters over the limit` : `${remaining} characters left`}</span>
          </span>
        )}
      </div>

      {confirming && (
        <ActionSheet
          title="Discard post?"
          body="Your text and photos will be lost."
          confirm="Discard"
          cancel="Keep editing"
          onConfirm={onClose}
          onCancel={() => {
            setConfirming(false)
            textareaRef.current?.focus()
          }}
        />
      )}

      {describing && (
        <AltEditor
          image={describing}
          onCancel={() => setDescribing(null)}
          onSave={(alt) => {
            setImages((prev) => prev.map((i) => (i.id === describing.id ? { ...i, alt } : i)))
            setDescribing(null)
          }}
        />
      )}
    </div>
  )
}

export function ActionSheet({
  title,
  body,
  confirm,
  cancel,
  onConfirm,
  onCancel,
}: {
  title: string
  body?: string
  confirm: string
  cancel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const safe = useRef<HTMLButtonElement>(null)
  const id = useId()
  // Focus lands on the safe choice, so a stray Enter never throws a draft away.
  useEffect(() => safe.current?.focus(), [])
  return (
    <div className="scrim" onClick={onCancel} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <h3 id={id}>{title}</h3>
        {body && <p className="supporting">{body}</p>}
        <div className="dialog-actions">
          <button type="button" className="button-danger" onClick={onConfirm}>
            {confirm}
          </button>
          <button ref={safe} type="button" className="button-secondary" onClick={onCancel}>
            {cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

function AltEditor({ image, onCancel, onSave }: { image: Draft; onCancel: () => void; onSave: (alt: string) => void }) {
  const [value, setValue] = useState(image.alt)
  const id = useId()
  return (
    <div className="scrim" onClick={onCancel} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <form
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSave(value.trim())
        }}
      >
        <div className="alt-head">
          <img src={image.src} alt="" />
          <div>
            <h3 id={id}>Describe this photo</h3>
            <p className="supporting supporting-small">Read aloud to people using screen readers.</p>
          </div>
        </div>
        <textarea
          className="alt-input"
          aria-labelledby={id}
          placeholder="e.g. A mug of tea on a rainy windowsill"
          maxLength={1000}
          rows={3}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="dialog-actions dialog-actions-row">
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="button-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Shrinks the photo, keeps it in on-device storage (so it survives a refresh once posted),
 * and hands back a preview. Abandoned drafts' photos are cleaned up on the next launch.
 */
async function load(file: File): Promise<Draft | null> {
  try {
    const { blob, width, height } = await downscale(file)
    const ref = crypto.randomUUID()
    const saved = await putPhoto(ref, blob)
    // If storage is unavailable (private window), the photo still posts — it just won't survive a refresh.
    return { id: ref, ref: saved ? ref : undefined, src: URL.createObjectURL(blob), alt: '', width, height }
  } catch {
    return null
  }
}

/** Single-photo previews keep their shape, within portrait 4:5 and landscape 1.91:1. */
export function clampRatio({ width, height }: { width: number; height: number }) {
  return String(Math.min(1.91, Math.max(0.8, width / height)))
}

/**
 * Sizes the sheet to the part of the screen the keyboard isn't covering,
 * so the toolbar always sits directly above it.
 */
export function useVisualViewport(): React.CSSProperties | undefined {
  const [style, setStyle] = useState<React.CSSProperties>()
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setStyle({ '--vvh': `${vv.height}px`, '--vvtop': `${vv.offsetTop}px` } as React.CSSProperties)
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
  return style
}
