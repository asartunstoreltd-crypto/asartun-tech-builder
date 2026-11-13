import { ui } from '../data/translations'

// Audio files are picked up automatically from src/assets/audio/ha and /en.
// File name = narration ID, e.g. src/assets/audio/ha/cassava.teach.0.mp3
const files = import.meta.glob('../assets/audio/*/*.{mp3,m4a,wav,ogg}', { eager: true, query: '?url', import: 'default' })
const index = {}
for (const p in files) {
  const m = p.match(/audio\/(ha|en)\/(.+)\.(mp3|m4a|wav|ogg)$/)
  if (m) index[m[1] + '/' + m[2]] = files[p]
}
// Recordings uploaded in the admin panel (Supabase Storage) are registered here at run time.
const remote = {}
export const registerAudio = (entries) => Object.assign(remote, entries)   // {'ha/<id>': url}
export const getAudio = (lang, id) => remote[lang + '/' + id] || index[lang + '/' + id] || null

const clean = (s) => s.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim()
const guideKeys = ['gShow', 'gPractice', 'gChallenge', 'gQuiz']

// Every narrated text of a mission: [{id, ha, en}] (used by the recording script page).
export function buildScript(m) {
  const items = []
  const add = (id, f) => items.push({ id, ha: clean(f('ha')), en: clean(f('en')) })
  guideKeys.forEach((k) => add('ui.' + k, (l) => ui[l][k]))
  m.teach.forEach((pg, i) => add(`${m.id}.teach.${i}`, (l) => [pg.title[l], ...pg.lines.map((ln) => (ln.k ? ui[l][ln.k] + ' ' : '') + ln.text[l])].join('. ')))
  Object.keys(m.steps).forEach((id) => add(`${m.id}.step.${id}`, (l) => `${m.steps[id].name[l]}. ${m.steps[id].text[l]}`))
  m.quiz.forEach((q, i) => add(`${m.id}.quiz.${i}`, (l) => `${q.q[l]} ${q.a.map((a) => a[l]).join(', ')}`))
  return items
}
