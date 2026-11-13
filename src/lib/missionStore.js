import { registerAudio } from './narration.js'

// Turns database rows into the exact mission object the learner MissionEngine already uses
// (same shape as src/data/cassavaMission.js). Used by the learner app AND the admin preview.
const MEDIA_KEYS = ['image', 'video', 'audio_ha', 'audio_en']

export function collectPaths(v, out = new Set()) {
  if (Array.isArray(v)) v.forEach((x) => collectPaths(x, out))
  else if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (MEDIA_KEYS.includes(k) && typeof x === 'string' && x) out.add(x)
      else collectPaths(x, out)
    }
  }
  return out
}

// Short-lived signed links: the storage bucket is private. Learners get links only for PUBLISHED media (storage policy).
export async function signPaths(client, paths) {
  const list = [...paths]
  const map = {}
  const broken = []
  if (!list.length) return { map, broken }
  const { data, error } = await client.storage.from('media').createSignedUrls(list, 3600)
  if (error || !data) return { map, broken: list }
  data.forEach((d) => { if (d.signedUrl && !d.error) map[d.path] = d.signedUrl; else broken.push(d.path) })
  return { map, broken }
}

const withUrls = (v, map) => {
  if (Array.isArray(v)) return v.map((x) => withUrls(x, map))
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, x] of Object.entries(v)) o[k] = withUrls(x, map)
    if (typeof v.image === 'string' && map[v.image]) o.imageUrl = map[v.image]
    if (typeof v.video === 'string' && map[v.video]) o.videoUrl = map[v.video]
    return o
  }
  return v
}

export function buildMission(m, steps, questions, map) {
  const by = (stage) => steps.filter((s) => s.stage === stage).sort((a, b) => a.position - b.position)
  const reg = {}
  const aud = (id, c) => {
    if (c && c.audio_ha && map[c.audio_ha]) reg['ha/' + id] = map[c.audio_ha]
    if (c && c.audio_en && map[c.audio_en]) reg['en/' + id] = map[c.audio_en]
  }
  const teach = by('teach').map((s, i) => { aud(`${m.slug}.teach.${i}`, s.content); return withUrls(s.content, map) })
  const stepDict = {}
  by('demo').forEach((s) => { stepDict[s.step_key] = withUrls(s.content, map) })
  const procedures = by('procedure').map((s) => {
    const c = s.content
    if (Array.isArray(c.items)) {            // processes made in the admin builder keep their steps inline
      const keys = c.items.map((it, n) => {
        const k = `${s.step_key}_${n}`
        stepDict[k] = withUrls(it, map)
        aud(`${m.slug}.step.${k}`, it)
        return k
      })
      return { ...withUrls(c, map), items: undefined, id: s.step_key, steps: keys }
    }
    return { ...withUrls(c, map), id: s.step_key }
  })
  const challenges = by('challenge').map((s) => withUrls(s.content, map))
  const quiz = [...questions].sort((a, b) => a.position - b.position).map((q, i) => {
    aud(`${m.slug}.quiz.${i}`, q.media)
    return { q: q.question, a: q.options, c: q.correct_index, e: q.explanation, imageUrl: q.media && q.media.image ? map[q.media.image] : undefined }
  })
  registerAudio(reg)
  return {
    id: m.slug, no: m.mission_no ?? 0, title: (m.engine_options && m.engine_options.header_title) || m.title,
    mixed: Boolean(m.engine_options && m.engine_options.mixed), stages: m.stages, rewards: m.reward_rules,
    teach, steps: stepDict, procedures, challenges, quiz,
  }
}

// Learner side: RLS only returns published / coming-soon missions to this client.
export async function loadPublished(client) {
  const { data: ms, error } = await client.from('missions').select('*').in('status', ['published', 'coming_soon'])
    .order('mission_no', { ascending: true, nullsFirst: false })
  if (error) throw error
  const pub = ms.filter((m) => m.status === 'published')
  let steps = []
  let qs = []
  if (pub.length) {
    const ids = pub.map((m) => m.id)
    const [a, b] = await Promise.all([
      client.from('mission_steps').select('*').in('mission_id', ids),
      client.from('game_questions').select('*').in('mission_id', ids)])
    if (a.error || b.error) throw (a.error || b.error)
    steps = a.data
    qs = b.data
  }
  const paths = new Set()
  pub.forEach((m) => { if (m.cover_image_path) paths.add(m.cover_image_path) })
  collectPaths(steps.map((s) => s.content), paths)
  collectPaths(qs.map((q) => q.media), paths)
  const { map } = await signPaths(client, paths)
  const content = {}
  pub.forEach((m) => {
    content[m.slug] = buildMission(m, steps.filter((s) => s.mission_id === m.id), qs.filter((q) => q.mission_id === m.id), map)
  })
  const list = ms.map((m, i) => ({
    id: m.slug, no: m.mission_no ?? i + 1, emoji: m.emoji, ready: m.status === 'published', title: m.title,
    coverUrl: m.status === 'published' && m.cover_image_path ? map[m.cover_image_path] : undefined,
  }))
  return { list, content }
}
