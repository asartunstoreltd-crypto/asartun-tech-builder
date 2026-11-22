import { useCallback, useEffect, useMemo, useState } from 'react'
import { staffApi } from '../adultApi.js'
import { useAdult } from '../AdultAuth.jsx'
import AudioEditor from '../components/AudioEditor.jsx'
import { PhoneScreen } from '../components/DigitalSteps.jsx'
import { COURSES } from '../courses.js'
import { AREAS_CMS, LIMITS, bi, clipFor, coverage, isLessonKeyName, lessonTextKeys, newStepId, placeholders, screenGroups, spokenItems, spokenItemsOfCourse, template, validateLessonContent } from '../content.js'
import { loadContent } from '../contentLoader.js'
import { SCREENS } from '../digital.js'
import { strings } from '../strings.js'

// Adult-admin screen (Phase 10): correct texts, add recordings, write new courses and lessons — no coding.
// Everything is a DRAFT until the admin presses Publish. The screen only arranges things: the database decides who may do what
// (adult admin only) and checks the same limits again (adult_cms_valid, text and audio checks).
const ERR = { network: 'errNetwork', denied: 'errDenied', BADTEXT: 'ctErrText', NODRAFT: 'ctErrNoDraft', BADSLUG: 'ctErrSlug', SLUGTAKEN: 'ctErrSlugTaken', BADCOURSE: 'errBadCourse', BADLESSON: 'ctErrLesson', LESSONINVALID: 'ctErrInvalid', LESSONINUSE: 'ctErrInUse', NOLESSON: 'ctErrLesson', BADAUDIO: 'audErr' }
const e2 = (t, code) => t(ERR[code] || 'errGeneric')
const AREA_KEY = { read: 'skRead', count: 'skCount', apply: 'skApply', digital: 'skDigital', safety: 'skSafety', other: 'skOther' }
const LESSON_ERR = { shape: 'ctErrLesson', title: 'ctErrTitle', unit: 'ctErrTitle', steps: 'ctErrSteps', stepId: 'ctErrSteps', teach: 'ctErrTeach', prompt: 'ctErrQuestion', options: 'ctErrOptions', optionsSame: 'ctErrOptions', right: 'ctErrOptions', why: 'ctErrQuestion', scam: 'ctErrQuestion', tap: 'ctErrTap', tapTarget: 'ctErrTap', type: 'ctErrLesson', questions: 'ctErrTooMany' }
const STEP_TYPE = { teach: 'ctStepTeach', choice: 'ctStepChoice', scam: 'ctStepScam', tap: 'ctStepTap' }
const PAGE = 20
const fmt = (v) => (v ? new Date(v).toLocaleDateString() : '')

function useContentData() {
  const [d, setD] = useState(null)
  const load = useCallback(async () => {
    const [c, dr] = await Promise.all([staffApi.content(), staffApi.contentDrafts()])
    setD({ texts: c.texts, courses: c.courses, lessons: c.lessons, drafts: dr.textDrafts, lessonDrafts: dr.lessonDrafts, history: dr.history, error: c.error || dr.error })
  }, [])
  useEffect(() => { load() }, [load])
  const changed = useCallback(async () => { await loadContent('staff'); await load() }, [load])      // also refresh what learners (and this screen) will see
  return [d, changed]
}

export default function ContentTab() {
  const { t } = useAdult()
  const [d, changed] = useContentData()
  const [sub, setSub] = useState('texts')
  if (!d) return <p className="ad-note">{t('wait')}</p>
  return (
    <section className="ad-stack">
      <h2>{t('ctTitle')}</h2>
      <p className="ad-note">{t('ctIntro')}</p>
      {d.error && <p className="ad-banner">{t('errNetwork')}</p>}
      <div className="ad-subtabs" role="tablist">{[['texts', 'ctTexts'], ['lessons', 'ctBuiltIn'], ['screens', 'ctScreens'], ['courses', 'ctCourses']].map(([k, l]) => <button key={k} role="tab" aria-selected={sub === k} className={sub === k ? 'on' : ''} onClick={() => setSub(k)}>{t(l)}</button>)}</div>
      {sub === 'texts' && <TextList d={d} changed={changed} />}
      {sub === 'lessons' && <BuiltInLessons d={d} changed={changed} />}
      {sub === 'screens' && <ScreenTexts />}
      {sub === 'courses' && <CourseBuilder d={d} changed={changed} />}
    </section>
  )
}

// ================================================================= texts
function TextList({ d, changed }) {
  const { t } = useAdult()
  const [q, setQ] = useState(''); const [group, setGroup] = useState('all'); const [status, setStatus] = useState('all'); const [page, setPage] = useState(0); const [open, setOpen] = useState(null)
  const pub = useMemo(() => Object.fromEntries(d.texts.map((r) => [r.lang + '|' + r.key, r])), [d.texts])
  const dr = useMemo(() => Object.fromEntries(d.drafts.map((r) => [r.lang + '|' + r.key, r])), [d.drafts])
  const keys = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return Object.keys(strings.en).filter((k) => {
      if (group === 'lessons' && !isLessonKeyName(k)) return false
      if (group === 'app' && isLessonKeyName(k)) return false
      const edited = Boolean(pub['ha|' + k] || pub['en|' + k] || dr['ha|' + k] || dr['en|' + k])
      const checked = Boolean(pub['ha|' + k]?.reviewed)
      if (status === 'edited' && !edited) return false
      if (status === 'unchecked' && checked) return false
      if (status === 'drafts' && !(dr['ha|' + k] || dr['en|' + k])) return false
      return !needle || k.toLowerCase().includes(needle) || (strings.ha[k] || '').toLowerCase().includes(needle) || (strings.en[k] || '').toLowerCase().includes(needle)
    })
  }, [q, group, status, pub, dr])
  const pages = Math.max(1, Math.ceil(keys.length / PAGE)); const cur = Math.min(page, pages - 1)
  return (
    <div className="ad-stack">
      <label>{t('ctSearch')}<input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} /></label>
      <div className="ad-grid">
        <label>{t('ctGroup')}<select value={group} onChange={(e) => { setGroup(e.target.value); setPage(0) }}><option value="all">{t('ctAll')}</option><option value="lessons">{t('ctGroupLessons')}</option><option value="app">{t('ctGroupApp')}</option></select></label>
        <label>{t('ctStatus')}<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0) }}><option value="all">{t('ctAll')}</option><option value="edited">{t('ctEdited')}</option><option value="drafts">{t('ctDrafts')}</option><option value="unchecked">{t('ctUnchecked')}</option></select></label>
      </div>
      <p className="ad-note">{t('ctCount', { n: keys.length })}</p>
      <ul className="ad-list">
        {keys.slice(cur * PAGE, cur * PAGE + PAGE).map((k) => (
          <li key={k}>
            <button onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}><strong>{k}</strong><span>{(pub['ha|' + k]?.value || strings.ha[k] || '').slice(0, 90)}</span>
              <span className="ad-note">{pub['ha|' + k]?.reviewed ? t('ctChecked') : t('ctNotChecked')}{dr['ha|' + k] || dr['en|' + k] ? ' · ' + t('ctHasDraft') : ''}</span></button>
            {open === k && <TextEditor k={k} pub={pub} dr={dr} changed={changed} />}
          </li>))}
      </ul>
      <div className="ad-row"><button className="ad-btn" disabled={cur === 0} onClick={() => setPage(cur - 1)}>{t('ctPrev')}</button><span>{cur + 1} / {pages}</span><button className="ad-btn" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>{t('ctNext')}</button></div>
    </div>
  )
}

// one text key: Hausa and English side by side, draft -> publish, "checked", back to built-in, recordings
export function TextEditor({ k, pub, dr, changed }) {
  const { t } = useAdult()
  const base = { ha: strings.ha[k] || '', en: strings.en[k] || '' }
  const eff = (l) => dr[l + '|' + k]?.value ?? pub[l + '|' + k]?.value ?? base[l]
  const [v, setV] = useState({ ha: eff('ha'), en: eff('en') })
  const [checked, setChecked] = useState(Boolean(pub['ha|' + k]?.reviewed))
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [msg, setMsg] = useState('')
  const need = (l) => placeholders(base[l])
  const problem = (l) => (!v[l].trim() ? 'ctErrEmpty' : v[l].length > LIMITS.text ? 'ctErrText' : placeholders(v[l]) !== need(l) ? 'ph' : null)
  const live = (l) => pub[l + '|' + k]?.value ?? base[l]
  const differs = (l) => v[l] !== live(l)
  const run = async (fn, ok) => { setBusy(true); setErr(''); setMsg(''); const r = await fn(); setBusy(false); if (r && r.error) return setErr(e2(t, r.error)); if (ok) setMsg(t(ok)); await changed() }
  const saveDraft = () => run(async () => { for (const l of ['ha', 'en']) { const r = differs(l) ? await staffApi.saveTextDraft(k, l, v[l]) : await staffApi.discardTextDraft(k, l); if (r.error) return r } }, 'ctDraftSaved')
  const publish = () => run(async () => {
    for (const l of ['ha', 'en']) { if (!differs(l)) continue; let r = await staffApi.saveTextDraft(k, l, v[l]); if (r.error) return r; r = await staffApi.publishText(k, l, checked); if (r.error) return r }
    for (const l of ['ha', 'en']) if (!differs(l) && (pub[l + '|' + k] || checked)) { const r = await staffApi.markReviewed(k, l, v[l], checked); if (r.error) return r }
  }, 'ctPublished')
  const revert = () => run(async () => { for (const l of ['ha', 'en']) { const r = await staffApi.revertText(k, l); if (r.error) return r } setV({ ha: base.ha, en: base.en }); setChecked(false) }, 'ctReverted')
  const bad = ['ha', 'en'].map(problem).find(Boolean)
  return (
    <div className="ad-card ad-stack">
      {['ha', 'en'].map((l) => (
        <label key={l}>{l === 'ha' ? 'Hausa' : 'English'}
          <textarea rows={3} maxLength={LIMITS.text} value={v[l]} onChange={(e) => setV({ ...v, [l]: e.target.value })} />
          {problem(l) === 'ph' && <span className="ad-error" role="alert">{t('ctErrPlaceholders', { list: need(l) || '—' })}</span>}
          {need(l) && <span className="ad-note">{t('ctKeepPlaceholders', { list: need(l) })}</span>}
        </label>))}
      <label className="ad-check"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />{t('ctMarkChecked')}</label>
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      <button className="ad-btn primary" disabled={busy || Boolean(bad) || (!differs('ha') && !differs('en') && checked === Boolean(pub['ha|' + k]?.reviewed))} onClick={publish}>{t('ctPublish')}</button>
      <button className="ad-btn" disabled={busy || Boolean(bad) || (!differs('ha') && !differs('en'))} onClick={saveDraft}>{t('ctSaveDraft')}</button>
      {(pub['ha|' + k] || pub['en|' + k] || dr['ha|' + k] || dr['en|' + k]) && <button className="ad-link" disabled={busy} onClick={revert}>{t('ctRevert')}</button>}
      <details><summary><strong>{t('audTitle')}</strong></summary>
        <p className="ad-note">{t('ctAudioAfter')}</p>
        <AudioEditor keyName={k} lang="ha" /><AudioEditor keyName={k} lang="en" /></details>
    </div>
  )
}

// ================================================================= built-in lessons: correct their texts and add recordings
function BuiltInLessons({ d, changed }) {
  const { t, lang } = useAdult()
  const pub = useMemo(() => Object.fromEntries(d.texts.map((r) => [r.lang + '|' + r.key, r])), [d.texts])
  const dr = useMemo(() => Object.fromEntries(d.drafts.map((r) => [r.lang + '|' + r.key, r])), [d.drafts])
  const courses = Object.values(COURSES).filter((c) => !c.cms)
  const [slug, setSlug] = useState(courses[0] ? courses[0].slug : ''); const [lk, setLk] = useState('')
  const def = COURSES[slug]; const lesson = def && def.lessons.find((l) => l.key === lk)
  return (
    <div className="ad-stack">
      <p className="ad-note">{t('ctBuiltInNote')}</p>
      <label>{t('apCodeCourse')}<select value={slug} onChange={(e) => { setSlug(e.target.value); setLk('') }}>{courses.map((c) => <option key={c.slug} value={c.slug}>{t(c.titleKey)}</option>)}</select></label>
      <label>{t('ctLesson')}<select value={lk} onChange={(e) => setLk(e.target.value)}><option value="">—</option>{def && def.lessons.map((l) => <option key={l.key} value={l.key}>{t(l.title.key, l.title.vars)}</option>)}</select></label>
      {def && <p className="ad-note"><strong>{t('ctRecorded', coverage(spokenItemsOfCourse(def)))}</strong></p>}
      {lesson && <SpokenItems lesson={lesson} />}
      {lesson && (lessonTextKeys(lesson).length === 0 ? <p className="ad-note">{t('ctNoTexts')}</p> : lessonTextKeys(lesson).map((k) => (
        <div key={k}><p><strong>{k}</strong></p><TextEditor key={k + lang} k={k} pub={pub} dr={dr} changed={changed} /></div>)))}
    </div>
  )
}

// the fixed texts on the learner's home, course list, progress, write and help screens: one recording slot per language
const SCREEN_LABEL = { home: 'ctScrHome', courses: 'ctScrCourses', progress: 'ctScrProgress', write: 'ctScrWrite', help: 'ctScrHelp', lists: 'ctScrLists' }
function ScreenTexts() {
  const { t } = useAdult()
  const groups = screenGroups()
  const all = groups.flatMap((g) => g.keys.flatMap((k) => ['ha', 'en'].map((lang) => ({ key: k, lang }))))
  return (
    <div className="ad-stack">
      <p className="ad-note">{t('ctScreensNote')}</p>
      <p><strong>{t('ctRecorded', coverage(all))}</strong></p>
      {groups.map((g) => (
        <div key={g.id} className="ad-card ad-stack">
          <h3>{t(SCREEN_LABEL[g.id])}</h3>
          {g.keys.map((k) => (
            <details key={k}>
              <summary><strong>{template('ha', k).slice(0, 80)}</strong> <span className="ad-note">· {['ha', 'en'].every((l) => clipFor(l, k)) ? t('ctMarkDone') : t('ctMarkTodo')}</span></summary>
              <AudioEditor keyName={k} lang="ha" /><AudioEditor keyName={k} lang="en" />
            </details>))}
        </div>))}
    </div>
  )
}

// everything this lesson says aloud (letters, words, sentences, questions): one recording slot each, shared by every lesson that says the same words
function SpokenItems({ lesson }) {
  const { t } = useAdult()
  const items = spokenItems(lesson)
  if (items.length === 0) return null
  return (
    <div className="ad-card ad-stack">
      <h3>{t('ctSpoken')}</h3><p className="ad-note">{t('ctSpokenNote')}</p>
      {items.map((it) => (
        <details key={it.lang + it.key}>
          <summary><strong>{it.text.length > 70 ? it.text.slice(0, 70) + '…' : it.text}</strong> <span className="ad-note">({it.lang === 'ha' ? 'Hausa' : 'English'}) · {clipFor(it.lang, it.key) ? t('ctMarkDone') : t('ctMarkTodo')}</span></summary>
          <AudioEditor keyName={it.key} lang={it.lang} />
        </details>))}
    </div>
  )
}

// ================================================================= courses and lessons written in the dashboard
function BiField({ label, value, onChange, max, rows = 2, optional = false }) {
  const { t } = useAdult()
  const set = (l, x) => onChange({ ...bi(value), [l]: x })
  return (
    <div className="ad-stack">
      <p><strong>{label}</strong>{optional ? ' ' + t('ctOptional') : ''}</p>
      <label>Hausa<textarea rows={rows} maxLength={max} value={bi(value).ha} onChange={(e) => set('ha', e.target.value)} /></label>
      <label>English<textarea rows={rows} maxLength={max} value={bi(value).en} onChange={(e) => set('en', e.target.value)} /></label>
    </div>
  )
}

function CourseBuilder({ d, changed }) {
  const { t, lang } = useAdult()
  const [open, setOpen] = useState(null); const [creating, setCreating] = useState(false)
  const course = d.courses.find((c) => c.id === open)
  if (course) return <CourseEditor key={course.id} course={course} d={d} changed={changed} onBack={() => setOpen(null)} />
  return (
    <div className="ad-stack">
      <p className="ad-note">{t('ctCoursesNote')}</p>
      {d.courses.length === 0 ? <p className="ad-note">{t('ctNoCourses')}</p> : <ul className="ad-list">{d.courses.map((c) => <li key={c.id}><button onClick={() => setOpen(c.id)}><strong>{c.title[lang] || c.title.en}</strong><span>{c.slug} · {t(c.status === 'published' ? 'stPublished' : c.status === 'archived' ? 'stArchived' : c.status === 'coming_soon' ? 'stSoon' : 'stDraft')} · {d.lessons.filter((l) => l.course_id === c.id).length} {t('ctLessonsN')}</span></button></li>)}</ul>}
      {creating ? <NewCourse onDone={async (id) => { setCreating(false); await changed(); if (id) setOpen(id) }} /> : <button className="ad-btn primary" onClick={() => setCreating(true)}>{t('ctNewCourse')}</button>}
    </div>
  )
}

function NewCourse({ onDone }) {
  const { t } = useAdult()
  const [f, setF] = useState({ slug: '', title: { ha: '', en: '' }, description: { ha: '', en: '' }, area: 'other' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const go = async (ev) => {
    ev.preventDefault(); setErr(''); setBusy(true)
    const { data, error } = await staffApi.createCourse({ slug: f.slug.trim(), title: f.title, description: f.description.ha ? f.description : null, area: f.area })
    setBusy(false); if (error) return setErr(e2(t, error)); onDone(data)
  }
  return (
    <form className="ad-card ad-form" onSubmit={go}>
      <h3>{t('ctNewCourse')}</h3>
      <label>{t('ctSlug')}<input value={f.slug} maxLength={30} autoCapitalize="none" onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></label>
      <p className="ad-note">{t('ctSlugHelp')}</p>
      <BiField label={t('ctCourseTitle')} value={f.title} max={LIMITS.courseTitle} rows={1} onChange={(v) => setF({ ...f, title: v })} />
      <BiField label={t('ctCourseDesc')} value={f.description} max={LIMITS.courseDesc} optional onChange={(v) => setF({ ...f, description: v })} />
      <label>{t('ctArea')}<select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{AREAS_CMS.map((a) => <option key={a} value={a}>{t(AREA_KEY[a])}</option>)}</select></label>
      {err && <p className="ad-error" role="alert">{err}</p>}
      <button className="ad-btn primary" disabled={busy || f.slug.length < 3 || !f.title.ha.trim()}>{t('ctCreate')}</button>
      <button type="button" className="ad-link" onClick={() => onDone(null)}>{t('cancel')}</button>
    </form>
  )
}

function CourseEditor({ course, d, changed, onBack }) {
  const { t, lang } = useAdult()
  const [f, setF] = useState({ title: bi(course.title), description: bi(course.description), area: course.skill_area || 'other' })
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [edit, setEdit] = useState(null); const [newTitle, setNewTitle] = useState({ ha: '', en: '' })
  const lessons = d.lessons.filter((l) => l.course_id === course.id).sort((a, b) => a.position - b.position)
  const run = async (fn, ok) => { setBusy(true); setErr(''); setMsg(''); const r = await fn(); setBusy(false); if (r && r.error) { setErr(e2(t, r.error)); return r } if (ok) setMsg(t(ok)); await changed(); return r }
  const lesson = lessons.find((l) => l.id === edit)
  if (lesson) return <LessonEditor key={lesson.id} course={course} lesson={lesson} draft={d.lessonDrafts.find((x) => x.lesson_id === lesson.id)} history={d.history.filter((h) => h.lesson_id === lesson.id)} changed={changed} onBack={() => setEdit(null)} />
  return (
    <div className="ad-stack">
      <button className="ad-link" onClick={onBack}>{t('rpBack')}</button>
      <h3>{course.title[lang] || course.title.en}</h3>
      <p className="ad-note">{t('ctPublishNote')}</p>
      <form className="ad-card ad-form" onSubmit={(ev) => { ev.preventDefault(); run(() => staffApi.updateCourse({ course: course.id, title: f.title, description: f.description.ha ? f.description : null, area: f.area }), 'acSaved') }}>
        <BiField label={t('ctCourseTitle')} value={f.title} max={LIMITS.courseTitle} rows={1} onChange={(v) => setF({ ...f, title: v })} />
        <BiField label={t('ctCourseDesc')} value={f.description} max={LIMITS.courseDesc} optional onChange={(v) => setF({ ...f, description: v })} />
        <label>{t('ctArea')}<select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })}>{AREAS_CMS.map((a) => <option key={a} value={a}>{t(AREA_KEY[a])}</option>)}</select></label>
        <button className="ad-btn" disabled={busy || !f.title.ha.trim()}>{t('acSave')}</button>
      </form>
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      <h3>{t('ctLessons')}</h3>
      {lessons.length === 0 ? <p className="ad-note">{t('ctNoLessons')}</p> : <ul className="ad-list">{lessons.map((l, i) => (
        <li key={l.id} className="ad-roster">
          <div><strong>{i + 1}. {l.title[lang] || l.title.ha}</strong><span className="ad-note">{t(l.status === 'published' ? 'stPublished' : l.status === 'archived' ? 'stArchived' : 'stDraft')}{d.lessonDrafts.some((x) => x.lesson_id === l.id) ? ' · ' + t('ctHasDraft') : ''}</span></div>
          <div className="ad-row">
            <button className="ad-btn" onClick={() => setEdit(l.id)}>{t('ctEdit')}</button>
            <button className="ad-btn" aria-label={t('ctUp')} disabled={busy || i === 0} onClick={() => run(() => staffApi.moveLesson(l.id, -1))}>↑</button>
            <button className="ad-btn" aria-label={t('ctDown')} disabled={busy || i === lessons.length - 1} onClick={() => run(() => staffApi.moveLesson(l.id, 1))}>↓</button>
          </div>
          <div className="ad-row">
            {l.status === 'published' && <button className="ad-link" disabled={busy} onClick={() => run(() => staffApi.setLessonStatus(l.id, 'draft'))}>{t('ctUnpublish')}</button>}
            {l.status === 'published' && <button className="ad-link" disabled={busy} onClick={() => run(() => staffApi.setLessonStatus(l.id, 'archived'))}>{t('ctArchive')}</button>}
            {l.status !== 'published' && l.published_at && <button className="ad-link" disabled={busy} onClick={() => run(() => staffApi.setLessonStatus(l.id, 'published'))}>{t('ctRepublish')}</button>}
            {!l.published_at && <button className="ad-link" disabled={busy} onClick={() => run(() => staffApi.deleteLesson(l.id))}>{t('ctDelete')}</button>}
          </div>
        </li>))}</ul>}
      <form className="ad-card ad-form" onSubmit={async (ev) => { ev.preventDefault(); const r = await run(() => staffApi.createLesson(course.id, newTitle)); if (r && r.data) { setNewTitle({ ha: '', en: '' }); setEdit(r.data.id) } }}>
        <BiField label={t('ctNewLesson')} value={newTitle} max={LIMITS.title} rows={1} onChange={setNewTitle} />
        <button className="ad-btn primary" disabled={busy || !newTitle.ha.trim()}>{t('ctCreate')}</button>
      </form>
    </div>
  )
}

const blankStep = (type) => {
  const id = newStepId()
  if (type === 'teach') return { id, type, text: { ha: '', en: '' } }
  if (type === 'choice') return { id, type, prompt: { ha: '', en: '' }, options: [{ ha: '', en: '' }, { ha: '', en: '' }], right: 0, why: { ha: '', en: '' } }
  if (type === 'scam') return { id, type, text: { ha: '', en: '' }, scam: true, why: { ha: '', en: '' } }
  return { id, type: 'tap', ask: { ha: '', en: '' }, screen: 'home', target: 'phone' }
}
const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a;[a[i], a[j]] = [a[j], a[i]]; return a }

function LessonEditor({ lesson, draft, history, changed, onBack }) {
  const { t, lang } = useAdult()
  const start = draft ? draft.content : (lesson.content && lesson.content.steps ? lesson.content : { title: lesson.title, steps: [] })
  const [c, setC] = useState(() => ({ title: bi(start.title), unit: start.unit ? bi(start.unit) : { ha: '', en: '' }, steps: (start.steps || []).map((s) => ({ ...s, id: s.id || newStepId() })) }))
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [msg, setMsg] = useState('')
  const content = () => ({ title: c.title, ...(c.unit.ha.trim() ? { unit: c.unit } : {}), steps: c.steps })
  const problem = validateLessonContent(content())
  const setStep = (i, patch) => setC({ ...c, steps: c.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const run = async (fn, ok) => { setBusy(true); setErr(''); setMsg(''); const r = await fn(); setBusy(false); if (r && r.error) return setErr(e2(t, r.error)); if (ok) setMsg(t(ok)); await changed() }
  const save = () => run(() => staffApi.saveLessonDraft(lesson.id, content()), 'ctDraftSaved')
  const publish = () => run(async () => { let r = await staffApi.saveLessonDraft(lesson.id, content()); if (r.error) return r; return staffApi.publishLesson(lesson.id) }, 'ctPublished')
  const published = lesson.status === 'published'
  return (
    <div className="ad-stack">
      <button className="ad-link" onClick={onBack}>{t('rpBack')}</button>
      <h3>{lesson.title[lang] || lesson.title.ha} · {t(published ? 'stPublished' : lesson.status === 'archived' ? 'stArchived' : 'stDraft')}</h3>
      <BiField label={t('ctLessonTitle')} value={c.title} max={LIMITS.title} rows={1} onChange={(v) => setC({ ...c, title: v })} />
      <BiField label={t('ctUnit')} value={c.unit} max={LIMITS.unit} rows={1} optional onChange={(v) => setC({ ...c, unit: v })} />
      <p className="ad-note">{t('ctRecordAfterPublish')}</p>
      {c.steps.map((s, i) => (
        <div key={s.id} className="ad-card ad-stack">
          <div className="ad-row"><strong>{i + 1}. {t(STEP_TYPE[s.type] || 'ctStepTeach')}</strong>
            <span className="ad-row"><button className="ad-btn" aria-label={t('ctUp')} disabled={i === 0} onClick={() => setC({ ...c, steps: move(c.steps, i, -1) })}>↑</button><button className="ad-btn" aria-label={t('ctDown')} disabled={i === c.steps.length - 1} onClick={() => setC({ ...c, steps: move(c.steps, i, 1) })}>↓</button><button className="ad-btn" aria-label={t('ctDelete')} onClick={() => setC({ ...c, steps: c.steps.filter((_, j) => j !== i) })}>✕</button></span></div>
          <StepFields s={s} lessonKey={lesson.key} published={published} set={(p) => setStep(i, p)} />
        </div>))}
      <div className="ad-stack"><p><strong>{t('ctAddStep')}</strong></p>
        <div className="ad-grid">{['teach', 'choice', 'scam', 'tap'].map((ty) => <button key={ty} className="ad-btn" disabled={c.steps.length >= LIMITS.steps} onClick={() => setC({ ...c, steps: [...c.steps, blankStep(ty)] })}>{t(STEP_TYPE[ty])}</button>)}</div></div>
      {history.length > 0 && <label>{t('ctEarlier')}<select value="" onChange={(e) => { const h = history.find((x) => String(x.id) === e.target.value); if (h) setC({ title: bi(h.content.title), unit: h.content.unit ? bi(h.content.unit) : { ha: '', en: '' }, steps: h.content.steps }) }}><option value="">—</option>{history.map((h) => <option key={h.id} value={h.id}>{fmt(h.at)}</option>)}</select></label>}
      {problem && c.steps.length > 0 && <p className="ad-banner" role="status">{t(LESSON_ERR[problem] || 'ctErrLesson')}</p>}
      {err && <p className="ad-error" role="alert">{err}</p>}{msg && <p className="ad-ok" role="status">{msg}</p>}
      <button className="ad-btn primary" disabled={busy || Boolean(problem)} onClick={publish}>{t('ctPublish')}</button>
      <button className="ad-btn" disabled={busy} onClick={save}>{t('ctSaveDraft')}</button>
    </div>
  )
}

// the audio panel of one text of a dashboard lesson. Recordings are made after publishing, when the text is part of the live lesson.
function Voice({ lessonKey, stepId, field, published }) {
  const { t } = useAdult()
  if (!published) return null
  const key = `cms.${lessonKey}.${stepId}.${field}`
  return <details><summary>{t('audTitle')}</summary><AudioEditor keyName={key} lang="ha" /><AudioEditor keyName={key} lang="en" /></details>
}

function StepFields({ s, lessonKey, published, set }) {
  const { t } = useAdult()
  const V = (field) => <Voice lessonKey={lessonKey} stepId={s.id} field={field} published={published} />
  if (s.type === 'teach') return <><BiField label={t('ctText')} value={s.text} max={LIMITS.teach} rows={4} onChange={(v) => set({ text: v })} />{V('text')}</>
  if (s.type === 'choice') return (
    <>
      <BiField label={t('ctQuestion')} value={s.prompt} max={LIMITS.prompt} onChange={(v) => set({ prompt: v })} />{V('prompt')}
      {s.options.map((o, i) => (
        <div key={i} className="ad-stack">
          <BiField label={t('ctOption', { n: i + 1 })} value={o} max={LIMITS.option} rows={1} onChange={(v) => set({ options: s.options.map((x, j) => (j === i ? v : x)) })} />{V('o' + i)}
          <label className="ad-check"><input type="radio" name={'right-' + s.id} checked={s.right === i} onChange={() => set({ right: i })} />{t('ctRight')}</label>
          {s.options.length > LIMITS.optionsMin && <button type="button" className="ad-link" onClick={() => set({ options: s.options.filter((_, j) => j !== i), right: s.right === i ? 0 : s.right > i ? s.right - 1 : s.right })}>{t('ctDelete')}</button>}
        </div>))}
      {s.options.length < LIMITS.optionsMax && <button type="button" className="ad-btn" onClick={() => set({ options: [...s.options, { ha: '', en: '' }] })}>{t('ctAddOption')}</button>}
      <BiField label={t('ctWhy')} value={s.why || { ha: '', en: '' }} max={LIMITS.why} optional onChange={(v) => set({ why: v })} />{V('why')}
    </>)
  if (s.type === 'scam') return (
    <>
      <BiField label={t('ctMessage')} value={s.text} max={LIMITS.scam} rows={3} onChange={(v) => set({ text: v })} />{V('text')}
      <div className="ad-seg" role="group" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <button type="button" aria-pressed={s.scam} className={s.scam ? 'on absent' : ''} onClick={() => set({ scam: true })}>{t('dlScam')}</button>
        <button type="button" aria-pressed={!s.scam} className={!s.scam ? 'on present' : ''} onClick={() => set({ scam: false })}>{t('dlSafe')}</button>
      </div>
      <BiField label={t('ctWhy')} value={s.why} max={LIMITS.why} onChange={(v) => set({ why: v })} />{V('why')}
    </>)
  const els = SCREENS[s.screen] || []
  return (
    <>
      <BiField label={t('ctAsk')} value={s.ask} max={LIMITS.ask} rows={1} onChange={(v) => set({ ask: v })} />{V('ask')}
      <label>{t('ctScreen')}<select value={s.screen} onChange={(e) => set({ screen: e.target.value, target: (SCREENS[e.target.value].find((x) => x.kind === 'btn') || {}).id })}>{Object.keys(SCREENS).map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
      <p className="ad-note">{t('ctTapRight')}</p>
      <PhoneScreen screen={s.screen} picked={els.some((e) => e.id === s.target) ? s.target : null} target={s.target} onTap={(id) => set({ target: id })} />
    </>)
}
