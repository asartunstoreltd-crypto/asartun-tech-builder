import { useLang } from '../lib/i18n.jsx'
export default function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div className="lang" role="group" aria-label="Language">
      <button className={lang === 'ha' ? 'on' : ''} onClick={() => setLang('ha')}>HAUSA</button>
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>ENGLISH</button>
    </div>
  )
}
