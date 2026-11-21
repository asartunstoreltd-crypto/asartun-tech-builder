import { supabaseAdmin } from '../lib/supabase.js'

// Per-user data that must not outlive a sign-out or an account switch on a shared device.
// What is NOT touched: the child's game progress ('atb'), language choices and the learner's own sessions — those are not staff data.
export function wipeUserData() {
  try { sessionStorage.clear() } catch { /* ignore */ }
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('atb-dash-')).forEach((k) => localStorage.removeItem(k))
  } catch { /* ignore */ }
  // The service worker only keeps public static files, so nothing personal is in Cache Storage; this clears it anyway as a safety net.
  try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' }) } catch { /* ignore */ }
  try { if (window.caches) window.caches.keys().then((ks) => ks.forEach((k) => window.caches.delete(k))).catch(() => {}) } catch { /* ignore */ }
}

export async function signOutAndWipe() {
  try { if (supabaseAdmin) await supabaseAdmin.auth.signOut() } catch { /* the local session is removed either way */ }
  wipeUserData()
  window.location.replace('/dashboard')                           // a full reload drops every module-level cache from memory
}
