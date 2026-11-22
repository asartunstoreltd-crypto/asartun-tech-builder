import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabaseAdult } from './adultSupabase.js'
import { learnerApi } from './adultApi.js'
import { contentReady, contentVersion, subscribe, template } from './content.js'
import { loadContent } from './contentLoader.js'

// Language + learner session. UI convenience only: the database enforces who may see what.
const Ctx = createContext(null)
export const useAdult = () => useContext(Ctx)

export function AdultProvider({ children }) {
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('adult-lang') || 'ha' } catch { return 'ha' } })
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('loading')       // loading | signedOut | noAccount | ready | error
  const [cv, setCv] = useState(contentVersion())          // changes when the admin's texts / recordings / courses were loaded
  useEffect(() => subscribe(setCv), [])

  const setLang = (l) => { setLangState(l); try { localStorage.setItem('adult-lang', l) } catch { /* private mode */ } }
  const t = useCallback((k, vars) => {
    let s = template(lang, k)                                // dashboard lesson text, then the admin's published correction, then the built-in text
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v])
    return s
  }, [lang, cv])                                             // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!supabaseAdult) { setStatus('signedOut'); return }
    supabaseAdult.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setStatus('signedOut') })
    const { data: sub } = supabaseAdult.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) { setProfile(null); setStatus('signedOut') } })
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user?.id
  const load = useCallback(async () => {
    if (!uid) return
    const { data, error } = await learnerApi.profile(uid)
    if (error) { setStatus('error'); return }
    if (!data) { setStatus('noAccount'); return }          // signed in, but not an adult account (e.g. a staff or child session)
    setProfile(data); setStatus('ready')
    learnerApi.touch()
    loadContent('learner')
    if (data.language && data.language !== lang) setLang(data.language)
  }, [uid])                                                // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])

  const value = useMemo(() => ({ lang, setLang, t, session, profile, status, reload: load, contentReady: contentReady() }), [lang, t, session, profile, status, load, cv])   // eslint-disable-line react-hooks/exhaustive-deps
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
