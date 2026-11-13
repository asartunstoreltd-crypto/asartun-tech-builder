import { Home, Trophy, Users, Settings } from 'lucide-react'
import { useLang } from '../lib/i18n.jsx'
const tabs = [['dashboard', 'home', Home], ['rewards', 'rewards', Trophy], ['parent', 'parent', Users], ['settings', 'settings', Settings]]

export default function NavBar({ view, setView }) {
  const { t } = useLang()
  return (
    <nav className="nav">
      {tabs.map(([id, key, Icon]) => (
        <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
          <Icon size={26} /><span>{t(key)}</span>
        </button>
      ))}
    </nav>
  )
}
