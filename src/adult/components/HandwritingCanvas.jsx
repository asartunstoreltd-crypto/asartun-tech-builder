import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Finger / stylus writing area. Pointer Events work for touch, pen and mouse. No dependency.
// Strokes are kept as vectors in 0..1 coordinates (tiny to store, independent of screen size).
// Tools: pencil, eraser, undo, redo, clear (clear can be undone).
//
// Props
//   height | aspect   fixed height in css px, OR width/height ratio (needed when a guide is drawn: guides are laid out for it)
//   guideStrokes      [{pts:[[x,y]..]}] in the canvas's 0..1 coordinates (from layoutText). Drawn faint, with a numbered start
//                     dot and an arrow showing the writing direction.
//   guideMode         'faint' (default) | 'demo' (animates the guide being written, then stays) | 'none'
//   replayKey         change it to replay the demo
//   underlay          the work being marked, drawn beneath everything: {type:'image', img} or {type:'strokes', strokes}
//   overlay           corrections drawn read-only on top (red pen / yellow highlighter), e.g. a teacher's marks
//   initialStrokes    strokes to start with (a saved draft); they can be erased, undone as one clear
//   penColor          colour of the pencil ('#111' default; teachers use red)
//   highlighter       true adds a yellow highlighter tool (for marking mistakes)
//   guide             optional faint text drawn under the writing
//   tools             false hides the toolbar (read-only demonstrations)
//   labels, disabled, onChange(strokes)
// Ref: getStrokes(), isEmpty(), toBlob(type, quality), toDataURL(), reset()
const PEN_W = 0.012          // relative to canvas width
const ERASER_W = 0.045
const HIGHLIGHT_W = 0.03
const HIGHLIGHT = 'rgba(255, 214, 0, 0.38)'
const RED = '#c0392b'

// Paint pen / highlighter strokes. The eraser is only ever applied on the live layer (destination-out).
function paintStrokes(c, strokes, w, h, color) {
  c.lineCap = 'round'; c.lineJoin = 'round'
  for (const st of strokes) {
    if (st.tool === 'eraser') { c.globalCompositeOperation = 'destination-out' } else c.globalCompositeOperation = 'source-over'
    const col = st.tool === 'highlight' ? HIGHLIGHT : color
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = st.w * w
    const p = st.pts
    if (!p || !p.length) continue
    if (p.length === 1) { c.beginPath(); c.arc(p[0][0] * w, p[0][1] * h, (st.w * w) / 2, 0, 7); c.fill(); continue }
    c.beginPath(); c.moveTo(p[0][0] * w, p[0][1] * h)
    for (let i = 1; i < p.length; i++) c.lineTo(p[i][0] * w, p[i][1] * h)
    c.stroke()
  }
  c.globalCompositeOperation = 'source-over'
}
// strokes saved without a width (older or compact form) get the default width of their tool
const withWidth = (strokes) => (strokes || []).map((st) => (st.w ? st : { ...st, w: st.tool === 'highlight' ? HIGHLIGHT_W : PEN_W }))
const GUIDE = '#0d5c63'

const lineLen = (p) => { let l = 0; for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return l }
function pointAtFraction(p, f) {            // position and direction at fraction f (0..1) of the way along a polyline
  const target = lineLen(p) * f; let acc = 0
  for (let i = 1; i < p.length; i++) {
    const seg = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
    if (acc + seg >= target && seg > 0) { const t = (target - acc) / seg; return { x: p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, y: p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t, dx: p[i][0] - p[i - 1][0], dy: p[i][1] - p[i - 1][1] } }
    acc += seg
  }
  const a = p[p.length - 2] || p[0], b = p[p.length - 1]
  return { x: b[0], y: b[1], dx: b[0] - a[0], dy: b[1] - a[1] }
}

const HandwritingCanvas = forwardRef(function HandwritingCanvas(
  { height = 240, aspect, guideStrokes, guideMode = 'faint', replayKey = 0, guide = '', tools = true, labels = {}, disabled = false, onChange, underlay, overlay, penColor = '#111', highlighter = false, initialStrokes }, ref) {
  const wrap = useRef(null)
  const canvas = useRef(null)
  const layer = useRef(null)                    // strokes live on their own layer so the eraser never rubs out the guide
  const state = useRef({ strokes: withWidth(initialStrokes), past: [], future: [], cur: null, pointer: null, raf: 0, demoT: 1 })     // initialStrokes: a saved draft, restored once
  const [tool, setTool] = useState('pen')
  const [, bump] = useState(0)
  const rerender = () => bump((n) => n + 1)
  const gs = useRef(guideStrokes); gs.current = guideStrokes
  const gm = useRef(guideMode); gm.current = guideMode
  const extra = useRef({}); extra.current = { underlay, overlay, penColor }

  const drawGuide = (c, w, h) => {
    const strokes = gs.current
    if (!strokes || !strokes.length || gm.current === 'none') return
    const demo = gm.current === 'demo', T = state.current.demoT
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round'
    const base = h * 0.04
    // faint full path (always)
    c.strokeStyle = demo ? 'rgba(13,92,99,0.12)' : 'rgba(13,92,99,0.26)'; c.lineWidth = base
    for (const st of strokes) { c.beginPath(); st.pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h))); c.stroke() }
    const total = strokes.length
    if (demo) {                                   // animated part: stroke k is written during [k/total, (k+1)/total] of T
      strokes.forEach((st, k) => {
        const f = Math.max(0, Math.min(1, T * total - k)); if (f <= 0) return
        const n = Math.max(2, Math.round(st.pts.length * f)); const part = []
        for (let i = 0; i < n; i++) part.push(i === n - 1 && f < 1 ? Object.values(pointAtFraction(st.pts, f)).slice(0, 2) : st.pts[Math.min(i, st.pts.length - 1)])
        c.strokeStyle = GUIDE; c.lineWidth = base * 0.8; c.beginPath(); part.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h))); c.stroke()
        if (f < 1) { const e = part[part.length - 1]; c.fillStyle = '#f2a900'; c.beginPath(); c.arc(e[0] * w, e[1] * h, base * 0.9, 0, 7); c.fill() }
      })
    }
    // direction arrow in the middle of each stroke, numbered start dot at the beginning (number only when there are several strokes)
    strokes.forEach((st, k) => {
      if (st.pts.length < 2 || lineLen(st.pts) * Math.max(w, h) < 28) return
      const m = pointAtFraction(st.pts, 0.5), len = Math.hypot(m.dx * w, m.dy * h) || 1, ux = (m.dx * w) / len, uy = (m.dy * h) / len, a = base * 1.5
      c.fillStyle = GUIDE; c.beginPath()
      c.moveTo(m.x * w + ux * a, m.y * h + uy * a); c.lineTo(m.x * w - ux * a - uy * a * 0.8, m.y * h - uy * a + ux * a * 0.8); c.lineTo(m.x * w - ux * a + uy * a * 0.8, m.y * h - uy * a - ux * a * 0.8); c.closePath(); c.fill()
      const s0 = st.pts[0], r = base * 1.25
      c.beginPath(); c.arc(s0[0] * w, s0[1] * h, r, 0, 7); c.fillStyle = '#1d6b3a'; c.fill()
      if (total > 1 && !demo) { c.fillStyle = '#fff'; c.font = `bold ${Math.round(r * 1.5)}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k + 1), s0[0] * w, s0[1] * h + 1) }
    })
    c.restore()
  }

  const draw = useCallback(() => {
    const cv = canvas.current; if (!cv) return
    const w = cv.width, h = cv.height
    if (!layer.current) layer.current = document.createElement('canvas')
    const ly = layer.current; ly.width = w; ly.height = h
    const lc = ly.getContext('2d')
    const s = state.current
    paintStrokes(lc, s.cur ? [...s.strokes, s.cur] : s.strokes, w, h, extra.current.penColor)
    const c = cv.getContext('2d')
    c.globalCompositeOperation = 'source-over'
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h)
    const ul = extra.current.underlay
    if (ul && ul.type === 'image' && ul.img) c.drawImage(ul.img, 0, 0, w, h)
    else if (ul && ul.type === 'strokes') paintStrokes(c, withWidth(ul.strokes), w, h, '#111')
    if (guide) {
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.font = `${Math.round(h * 0.7)}px system-ui, sans-serif`
      c.fillText(guide, w / 2, h / 2)
    }
    drawGuide(c, w, h)
    c.drawImage(ly, 0, 0)
    const ov = extra.current.overlay
    if (ov && ov.length) paintStrokes(c, withWidth(ov), w, h, RED)
  }, [guide])                                   // eslint-disable-line react-hooks/exhaustive-deps

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
      canvas.current.height = Math.max(1, Math.round(el.clientHeight * dpr))
      draw()
    }
    fit()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    ro?.observe(el)
    return () => { ro?.disconnect(); cancelAnimationFrame(state.current.raf) }
  }, [height, aspect, draw])

  useEffect(() => { draw() }, [underlay, overlay, penColor, draw])

  // redraw when the guide changes; run the demonstration animation
  useEffect(() => {
    const s = state.current
    cancelAnimationFrame(s.demoRaf)
    if (guideMode !== 'demo') { s.demoT = 1; draw(); return }
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { s.demoT = 1; draw(); return }
    s.demoT = 0
    const total = (guideStrokes?.length || 1) * 1100 + 300; const t0 = performance.now()
    const tick = (now) => { s.demoT = Math.min(1, (now - t0) / total); draw(); if (s.demoT < 1) s.demoRaf = requestAnimationFrame(tick) }
    s.demoRaf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(s.demoRaf)
  }, [guideStrokes, guideMode, replayKey, draw])

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
    s.cur = { tool, w: tool === 'eraser' ? ERASER_W : tool === 'highlight' ? HIGHLIGHT_W : PEN_W, pts: [pos(e)] }
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
    isEmpty: () => state.current.strokes.filter((x) => x.tool !== 'eraser').length === 0,
    toDataURL: () => canvas.current.toDataURL('image/png'),
    toBlob: (type = 'image/png', quality = 0.8) => new Promise((res) => canvas.current.toBlob(res, type, quality)),
    reset: () => { const s = state.current; s.strokes = []; s.past = []; s.future = []; s.cur = null; onChange?.([]); draw(); rerender() },
  }))

  const s = state.current
  return (
    <div className="hw">
      {tools && (
        <div className="hw-tools" role="toolbar">
          <button type="button" className={'hw-btn' + (tool === 'pen' ? ' on' : '')} onClick={() => setTool('pen')} aria-pressed={tool === 'pen'}>{labels.pencil || 'Pencil'}</button>
          {highlighter && <button type="button" className={'hw-btn' + (tool === 'highlight' ? ' on' : '')} onClick={() => setTool('highlight')} aria-pressed={tool === 'highlight'}>{labels.highlight || 'Highlight'}</button>}
          <button type="button" className={'hw-btn' + (tool === 'eraser' ? ' on' : '')} onClick={() => setTool('eraser')} aria-pressed={tool === 'eraser'}>{labels.eraser || 'Eraser'}</button>
          <button type="button" className="hw-btn" onClick={undo} disabled={!s.past.length}>{labels.undo || 'Undo'}</button>
          <button type="button" className="hw-btn" onClick={redo} disabled={!s.future.length}>{labels.redo || 'Redo'}</button>
          <button type="button" className="hw-btn" onClick={clear} disabled={!s.strokes.length}>{labels.clear || 'Clear'}</button>
        </div>
      )}
      <div className="hw-area" ref={wrap} style={aspect ? { aspectRatio: String(aspect) } : { height }}>
        <canvas ref={canvas} className="hw-canvas" aria-label={labels.area || 'Writing area'}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      </div>
    </div>
  )
})
export default HandwritingCanvas
