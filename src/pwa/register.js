// Service-worker registration + update detection. Production builds only (a dev server must never be cached).
const state = { reg: null, accepted: false, waiting: false, listeners: new Set() }
const emit = () => state.listeners.forEach((f) => f(state.waiting))
export const subscribeUpdate = (f) => { state.listeners.add(f); f(state.waiting); return () => state.listeners.delete(f) }

function announce(reg) { state.reg = reg; state.waiting = Boolean(reg.waiting); emit() }

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      state.reg = reg
      if (reg.waiting && navigator.serviceWorker.controller) announce(reg)            // an update was already downloaded
      reg.addEventListener('updatefound', () => {
        const w = reg.installing
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) announce(reg) })
      })
      setInterval(() => { reg.update().catch(() => {}) }, 60 * 60 * 1000)               // look for a new version once an hour
    }).catch(() => { /* the app works without it */ })
  })
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!state.accepted || reloading) return                                             // the very first install also fires this: do not reload then
    reloading = true; window.location.reload()
  })
}

// The person tapped "Update": the waiting worker takes over, then the page reloads once.
export function applyUpdate() {
  state.accepted = true
  if (state.reg && state.reg.waiting) state.reg.waiting.postMessage({ type: 'SKIP_WAITING' })
}
// 'waiting' | 'none' | 'unsupported'
export async function checkForUpdate() {
  if (!state.reg) return 'unsupported'
  try { await state.reg.update() } catch { return 'none' }
  return state.reg.waiting ? 'waiting' : 'none'
}
