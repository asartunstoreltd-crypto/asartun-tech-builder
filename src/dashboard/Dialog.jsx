import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

// Accessible modal: focus moves in, Tab stays inside, Escape closes, focus returns to where it was.
export function Dialog({ title, onClose, children, footer, wide = false, busy = false }) {
  const box = useRef(null)
  useEffect(() => {
    const before = document.activeElement
    const first = box.current && box.current.querySelector('[data-autofocus],' + FOCUSABLE)
    if (first) first.focus(); else if (box.current) box.current.focus()
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && box.current) {
        const f = Array.from(box.current.querySelectorAll(FOCUSABLE))
        if (!f.length) return
        const a = f[0]; const z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); if (before && before.focus) before.focus() }
  }, [])                                                             // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="dash-modal" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className={'dash-dialog' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <div className="dash-dialog-head"><h2>{title}</h2><button type="button" className="dash-x" aria-label="Close" disabled={busy} onClick={onClose}>×</button></div>
        <div className="dash-dialog-body">{children}</div>
        {footer && <div className="dash-dialog-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, children, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  return (
    <Dialog title={title} onClose={onCancel} busy={busy} footer={<>
      <button type="button" className="dash-btn ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      <button type="button" className={'dash-btn ' + (danger ? 'danger' : 'primary')} disabled={busy} data-autofocus onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</button>
    </>}>{children}</Dialog>
  )
}
