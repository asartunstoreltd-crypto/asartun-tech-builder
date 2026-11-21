import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAdminAuth } from '../admin/AdminAuth.jsx'
import { staffApi } from '../adult/adultApi.js'
import { buildContext } from './access.js'
import { signOutAndWipe, wipeUserData } from './session.js'

// Combines the two separate grants of the signed-in login. UI convenience only; the database enforces everything.
const Ctx = createContext(null)
export const useDash = () => useContext(Ctx)

export function DashAuthProvider({ children }) {
  const admin = useAdminAuth()                                   // session + admin_roles (loaded by AdminAuthProvider)
  const uid = admin.session && admin.session.user && admin.session.user.id
  const [adult, setAdult] = useState({ uid: null, role: null, suspended: false, loaded: false })
  const seen = useRef(null)

  const loadAdult = (id, live) => staffApi.me(id).then(({ data }) => {
    if (live && !live.stop) setAdult({ uid: id, role: data && data.active ? data.role : null, suspended: Boolean(data && !data.active), loaded: true })
  })
  useEffect(() => {
    if (!uid) { setAdult({ uid: null, role: null, suspended: false, loaded: false }); return undefined }
    const live = { stop: false }
    loadAdult(uid, live)
    // A suspension or role change shows up without a manual reload (the database already refuses the data immediately).
    const recheck = () => { if (document.visibilityState === 'visible') loadAdult(uid, live) }
    const timer = setInterval(recheck, 60000)
    document.addEventListener('visibilitychange', recheck)
    return () => { live.stop = true; clearInterval(timer); document.removeEventListener('visibilitychange', recheck) }
  }, [uid])                                                      // eslint-disable-line react-hooks/exhaustive-deps

  // ACCOUNT SWITCH / SIGN-OUT (also from another tab): wipe this device's per-user data and reload so no in-memory state survives.
  useEffect(() => {
    if (seen.current && uid && seen.current !== uid) { wipeUserData(); window.location.reload(); return }
    if (seen.current && !uid) { wipeUserData(); window.location.replace('/dashboard'); return }
    seen.current = uid || null
  }, [uid])

  const ready = admin.status !== 'loading' && (!uid || (adult.uid === uid && adult.loaded))
  const ctx = useMemo(() => buildContext({ adminRoles: admin.roles, adultRole: adult.uid === uid ? adult.role : null }), [admin.roles, adult, uid])
  const value = useMemo(() => ({
    session: admin.session, email: admin.session && admin.session.user && admin.session.user.email, uid, ready, ctx,
    suspended: adult.uid === uid && adult.suspended, signIn: admin.signIn, signOut: signOutAndWipe,
  }), [admin.session, admin.signIn, uid, ready, ctx, adult])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
