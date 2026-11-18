import { forwardRef, useEffect, useMemo, useState } from 'react'
import HandwritingCanvas from './HandwritingCanvas.jsx'

// Shows a piece of submitted work: handwriting (vector strokes) or a photo, optionally with the teacher's marks on top.
// annotate=true gives the teacher a red pencil, highlighter, eraser, undo/redo/clear to mark directly over the work.
// Ref (when annotating): getStrokes() -> the marks drawn in this session.
const WorkViewer = forwardRef(function WorkViewer({ submission, imageUrl, overlay, annotate = false, labels = {}, onImageError }, ref) {
  const [img, setImg] = useState(null)
  const photo = submission.kind === 'photo'
  useEffect(() => {
    setImg(null)
    if (!photo || !imageUrl) return undefined
    const i = new Image()
    i.onload = () => setImg(i); i.onerror = () => onImageError?.()
    i.src = imageUrl
    return undefined
  }, [photo, imageUrl])                                    // eslint-disable-line react-hooks/exhaustive-deps
  const underlay = useMemo(() => (photo ? (img ? { type: 'image', img } : null) : { type: 'strokes', strokes: submission.strokes || [] }), [photo, img, submission])
  const aspect = photo ? (img ? img.naturalWidth / img.naturalHeight : 1.33) : Number(submission.aspect) || 1.4
  return <HandwritingCanvas key={photo ? (img ? 'img' : 'wait') : 'strokes'} ref={ref} aspect={aspect} tools={annotate} disabled={!annotate} penColor="#c0392b" highlighter={annotate}
    underlay={underlay} overlay={overlay} labels={labels} />
})
export default WorkViewer
