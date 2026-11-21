import { useEffect, useState } from 'react'

// "Install app" support: the browser offers an install event once; keep it so a button can use it later.
let deferred = null
const listeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()) })
}
const standalone = () => typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)

export function useInstall() {
  const [, tick] = useState(0)
  useEffect(() => { const f = () => tick((n) => n + 1); listeners.add(f); return () => listeners.delete(f) }, [])
  return {
    installed: standalone(),
    canInstall: Boolean(deferred),
    prompt: async () => { if (!deferred) return; const e = deferred; deferred = null; e.prompt(); try { await e.userChoice } catch { /* ignore */ } listeners.forEach((f) => f()) },
  }
}
