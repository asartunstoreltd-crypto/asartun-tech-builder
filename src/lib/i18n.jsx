import { createContext, useContext, useEffect, useState } from 'react'
import { ui } from '../data/translations'

const Ctx = createContext(null)

// Hausa is the default language. The choice is saved on the device.
export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('atb-lang') || 'ha' } catch { return 'ha' } })
  useEffect(() => {
    try { localStorage.setItem('atb-lang', lang) } catch { /* ignore */ }
    document.documentElement.lang = lang
  }, [lang])
  // t('key', {name: 'x'}) reads the central dictionary and fills {name}.
  const t = (key, vars) => {
    let s = ui[lang][key] ?? ui.en[key] ?? key
    if (typeof s === 'string' && vars) for (const k in vars) s = s.replaceAll('{' + k + '}', vars[k])
    return s
  }
  // L({ha, en}) picks the current language from a data object.
  const L = (o) => (o ? o[lang] ?? o.en : '')
  return <Ctx.Provider value={{ lang, setLang, t, L }}>{children}</Ctx.Provider>
}
export const useLang = () => useContext(Ctx)
