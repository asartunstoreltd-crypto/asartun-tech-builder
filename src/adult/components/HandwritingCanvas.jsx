import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Finger / stylus writing area. Pointer Events work for touch, pen and mouse. No dependency.
// Strokes are kept as vectors in 0..1 coordinates (tiny to store, independent of screen size).
// Tools: pencil, eraser, undo, redo, clear (clear can be undone). Phase 4 adds tracing guides on top of this.
//
// Props: height (css px), guide (optional faint text drawn under the writing), labels {pencil,eraser,undo,redo,clear},
//        disabled, onChange(strokes)
// Ref:   getStrokes(), isEmpty(), toBlob(type, quality) -> Promise<Blob>, toDataURL(), reset()
const PEN_W = 0.012          // relative to canvas width
const ERASER_W = 0.045

const HandwritingCanvas = forwardRef(function HandwritingCanvas({ height = 240, guide = '', labels = {}, disabled = false, onChange }, ref) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const layer = useRef(null)                    // strokes live on their own layer so the eraser never rubs out the guide
  const state = useRef({ strokes: [], past: [], future: [], cur: null, pointer: null, raf: 0 })
  const [tool, setTool] = useState('pen')
  const [, bump] = useState(0)
  const rerender = () => bump((n) => n + 1)

  const draw = useCallback(() => {
    const cv = canvas.current; if (!cv) return
    const w = cv.width, h = cv.height
    if (!layer.current) layer.current = document.createElement('canvas')
    const ly = layer.current; ly.width = w; ly.height = h
    const lc = ly.getContext('2d'); lc.lineCap = 'round'; lc.lineJoin = 'round'
    const s = state.current
    const all = s.cur ? [...s.strokes, s.cur] : s.strokes
    for (const st of all) {
      lc.globalCompositeOperation = st.tool === 'eraser' ? 'destination-out' : 'source-over'
      lc.strokeStyle = '#111'; lc.fillStyle = '#111'
      lc.lineWidth = st.w * w
      const p = st.pts
      if (p.length === 1) { lc.beginPath(); lc.arc(p[0][0] * w, p[0][1] * h, (st.w * w) / 2, 0, 7); lc.fill(); continue }
      lc.beginPath(); lc.moveTo(p[0][0] * w, p[0][1] * h)
      for (let i = 1; i < p.length; i++) lc.lineTo(p[i][0] * w, p[i][1] * h)
      lc.stroke()
    }
    const c = cv.getContext('2d')
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h)
    if (guide) {
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.font = `${Math.round(h * 0.7)}px system-ui, sans-serif`
      c.fillText(guide, w / 2, h / 2)
    }
    c.drawImage(ly, 0, 0)
  }, [guide])

  const schedule = useCallback(() => {
    const s = state.current
    if (s.raf) return
    s.raf = requestAnimationFrame(() => { s.raf = 0; draw() })
  }, [draw])

  // keep the bitmap sharp on every screen, and redraw on rotation / resize
  useEffect(() => {
    const el = wrap.current; if (!el) return
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.current.width = Math.max(1, Math.round(el.clientWidth * dpr))
      canvas.current.height = Math.max(1, Math.round(height * dpr))
      draw()
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(el)
    return () => { ro?.disconnect(); cancelAnimationFrame(state.current.raf) }
  }, [height, draw])

  const commit = (strokes) => {
    const s = state.current
    s.past.push(s.strokes); s.strokes = strokes; s.future = []
    onChange?.(s.strokes); draw(); rerender()
  }
  const pos = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]
  }
  const down = (e) => {
    if (disabled) return
    const s = state.current
    if (s.pointer !== null) return                        // ignore a second finger / resting palm while writing
    s.pointer = e.pointerId
    try { canvas.current.setPointerCapture(e.pointerId) } catch { /* not fatal */ }
    s.cur = { tool, w: tool === 'eraser' ? ERASER_W : PEN_W, pts: [pos(e)] }
    schedule(); e.preventDefault()
  }
  const move = (e) => {
    const s = state.current
    if (s.pointer !== e.pointerId || !s.cur) return
    const evs = e.nativeEvent.getCoalescedEvents ? e.nativeEvent.getCoalescedEvents() : [e.nativeEvent]
    const r = canvas.current.getBoundingClientRect()
    for (const ev of (evs.length ? evs : [e.nativeEvent])) {
      s.cur.pts.push([Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height))])
    }
    schedule()
  }
  const up = (e) => {
    const s = state.current
    if (s.pointer !== e.pointerId) return
    s.pointer = null
    const st = s.cur; s.cur = null
    if (st) commit([...s.strokes, st])
  }

  const undo = () => { const s = state.current; if (!s.past.length) return; s.future.push(s.strokes); s.strokes = s.past.pop(); onChange?.(s.strokes); draw(); rerender() }
  const redo = () => { const s = state.current; if (!s.future.length) return; s.past.push(s.strokes); s.strokes = s.future.pop(); onChange?.(s.strokes); draw(); rerender() }
  const clear = () => { if (state.current.strokes.length) commit([]) }

  useImperativeHandle(ref, () => ({
    getStrokes: () => state.current.strokes,
    isEmpty: () => state.current.strokes.filter((x) => x.tool === 'pen').length === 0,
    toDataURL: () => canvas.current.toDataURL('image/png'),
    toBlob: (type = 'image/png', quality = 0.8) => new Promise((res) => canvas.current.toBlob(res, type, quality)),
    reset: () => { const s = state.current; s.strokes = []; s.past = []; s.future = []; s.cur = null; onChange?.([]); draw(); rerender() },
  }))

  const s = state.current
  return (
    <div className="hw">
      <div className="hw-tools" role="toolbar">
        <button type="button" className={'hw-btn' + (tool === 'pen' ? ' on' : '')} onClick={() => setTool('pen')} aria-pressed={tool === 'pen'}>{labels.pencil || 'Pencil'}</button>
        <button type="button" className={'hw-btn' + (tool === 'eraser' ? ' on' : '')} onClick={() => setTool('eraser')} aria-pressed={tool === 'eraser'}>{labels.eraser || 'Eraser'}</button>
        <button type="button" className="hw-btn" onClick={undo} disabled={!s.past.length}>{labels.undo || 'Undo'}</button>
        <button type="button" className="hw-btn" onClick={redo} disabled={!s.future.length}>{labels.redo || 'Redo'}</button>
        <button type="button" className="hw-btn" onClick={clear} disabled={!s.strokes.length}>{labels.clear || 'Clear'}</button>
      </div>
      <div className="hw-area" ref={wrap} style={{ height }}>
        <canvas ref={canvas} className="hw-canvas" aria-label={labels.area || 'Writing area'}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      </div>
    </div>
  )
})
export default HandwritingCanvas
