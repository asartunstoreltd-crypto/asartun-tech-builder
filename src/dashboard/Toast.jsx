import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const Ctx = createContext({ notify: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const id = useRef(0)
  const dismiss = useCallback((i) => setItems((l) => l.filter((x) => x.id !== i)), [])
  const notify = useCallback((kind, text) => {
    const i = ++id.current
    setItems((l) => [...l.slice(-3), { id: i, kind, text }])
    setTimeout(() => dismiss(i), kind === 'error' ? 8000 : 4500)
  }, [dismiss])
  const value = useMemo(() => ({ notify, ok: (t) => notify('ok', t), fail: (t) => notify('error', t) }), [notify])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="dash-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'dash-toast ' + t.kind} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span>{t.text}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
