import { useEffect, useState } from 'react'
import { applyUpdate, subscribeUpdate } from './register.js'

// Small, unobtrusive banner shown only when a new version has been downloaded. Nothing reloads until the person agrees.
export default function UpdatePrompt() {
  const [waiting, setWaiting] = useState(false)
  const [hidden, setHidden] = useState(false)
  useEffect(() => subscribeUpdate(setWaiting), [])
  if (!waiting || hidden) return null
  return (
    <div className="pwa-update" role="status" aria-live="polite">
      <span>A new version is ready.</span>
      <button type="button" onClick={applyUpdate}>Update</button>
      <button type="button" className="later" onClick={() => setHidden(true)} aria-label="Not now">Later</button>
    </div>
  )
}
