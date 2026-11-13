import { collectPaths } from '../lib/missionStore.js'
import { typeInfo } from './api.js'

const bad = (s) => !String(s || '').trim()

// Pre-publish check on the editor state. Errors block publishing; warnings do not.
// (The database repeats the Hausa+English check, so this can never be bypassed.)
export function checkMission(st, rows, knownPaths) {
  const E = []
  const W = []
  const m = st.m
  const both = (o, label) => ['ha', 'en'].forEach((l) => { if (bad(o && o[l])) E.push(`${label}: missing ${l === 'ha' ? 'Hausa' : 'English'}`) })
  both(m.title, 'Mission title')
  both(m.description, 'Mission description')
  m.objectives.forEach((o, i) => both(o, `Learning objective ${i + 1}`))
  if (!m.objectives.length) W.push('No learning objectives yet.')
  if (!m.cover_image_path) W.push('No cover image.')
  if (!m.estimated_minutes) W.push('No estimated learning time.')
  if (!m.category_id) W.push('No category chosen.')
  if (m.stages.includes('teach') && !st.teach.length) E.push('Learn stage is on but has no steps.')
  if ((m.stages.includes('show') || m.stages.includes('practice')) && !st.procs.length) E.push('Watch/Practice is on but there is no demonstration.')
  if (m.stages.includes('challenge') && !st.chals.length) E.push('Challenge stage is on but has no challenge.')
  if (!st.quiz.length) E.push('The quiz needs at least one question.')
  let noAudio = 0
  st.teach.forEach((b, i) => {
    const n = `Learn step ${i + 1} (${typeInfo(b.type).name})`
    both(b.content.title, n + ' title')
    if (!b.content.lines.length) E.push(`${n} is empty: add at least one line.`)
    b.content.lines.forEach((l, j) => both(l.text, `${n} line ${j + 1}`))
    if (!b.content.audio_ha || !b.content.audio_en) noAudio += 1
  })
  st.procs.forEach((b, i) => {
    const n = `Demonstration ${i + 1}`
    both(b.content.name, n + ' name')
    if (b.content.items.length < 2) E.push(`${n} needs at least 2 steps.`)
    b.content.items.forEach((it, j) => { both(it.name, `${n} step ${j + 1} name`); both(it.text, `${n} step ${j + 1} text`) })
  })
  st.chals.forEach((b, i) => {
    const c = b.content
    if (c.type === 'business') return
    const n = `Challenge ${i + 1}`
    both(c.ask, n + ' question')
    if (c.options.length < 2) E.push(`${n} needs at least 2 groups.`)
    if (c.items.length < 2) E.push(`${n} needs at least 2 items.`)
    c.options.forEach((o, j) => both(o.label, `${n} group ${j + 1}`))
    c.items.forEach((it, j) => {
      both(it.name, `${n} item ${j + 1}`)
      if (!c.options.some((o) => o.kind === it.kind)) E.push(`${n} item ${j + 1} has no correct group.`)
    })
  })
  st.quiz.forEach((b, i) => {
    const c = b.content
    const n = `Question ${i + 1}`
    both(c.question, n)
    if (c.options.length < 2) E.push(`${n} needs at least 2 answers.`)
    c.options.forEach((o, j) => both(o, `${n} answer ${j + 1}`))
    if (c.correct < 0 || c.correct >= c.options.length) E.push(`${n}: choose the correct answer.`)
    both(c.explanation, `${n} explanation`)
    if (!c.media || !c.media.audio_ha || !c.media.audio_en) noAudio += 1
  })
  if (noAudio) W.push(`${noAudio} lesson steps or questions have no narration in one or both languages. (No audio button is shown for them.)`)
  const paths = collectPaths([rows.steps.map((s) => s.content), rows.questions.map((q) => q.media)])
  if (m.cover_image_path) paths.add(m.cover_image_path)
  paths.forEach((p) => { if (!knownPaths.has(p)) E.push('Broken media link (file not in the Media Library): ' + p) })
  return { errors: E, warnings: W }
}
