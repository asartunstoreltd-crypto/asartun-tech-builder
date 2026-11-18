import { supabaseAdult, supabaseStaff } from './adultSupabase.js'
import { loginName, normalizePhone } from './phone.js'

// Every function returns {data, error}. `error` is a short code the pages translate; the raw database message is never shown.
const fail = (code) => ({ data: null, error: code })
const net = (e) => (e && (e.name === 'TypeError' || /fetch|network/i.test(e.message || '')) ? 'network' : 'generic')

async function call(client, action, payload) {
  if (!client) return fail('config')
  try {
    const { data, error } = await client.functions.invoke('adult-admin', { body: { action, ...payload } })
    if (error) {
      let code = 'generic'
      try { const b = await error.context?.json?.(); if (b?.error && /^[A-Z_]+$/.test(b.error)) code = b.error } catch { /* keep generic */ }
      return fail(code)
    }
    if (data?.error) return fail(data.error)
    return { data, error: null }
  } catch (e) { return fail(net(e)) }
}

async function rpc(client, fn, args) {
  if (!client) return fail('config')
  try {
    const { data, error } = await client.rpc(fn, args)
    if (!error) return { data, error: null }
    const known = [[/already marked/i, 'MARKED'], [/assignment closed/i, 'CLOSED_WORK'], [/too many attempts/i, 'ATTEMPTS'], [/photo not uploaded/i, 'NOUPLOAD'], [/class is closed/i, 'CLASS_CLOSED'], [/bad score/i, 'BADSCORE']]
    const hit = known.find(([re]) => re.test(error.message || ''))
    return fail(hit ? hit[1] : /denied|authorized|42501/i.test(error.message) ? 'denied' : 'generic')
  } catch (e) { return fail(net(e)) }
}
async function select(q) {
  try { const { data, error } = await q; return error ? fail('generic') : { data, error: null } } catch (e) { return fail(net(e)) }
}

// ---- learner ----
export const learnerApi = {
  signIn: async (phoneRaw, pin) => {
    const phone = normalizePhone(phoneRaw)
    if (!phone) return fail('PHONE')
    try {
      const { error } = await supabaseAdult.auth.signInWithPassword({ email: loginName(phone), password: String(pin) })
      return error ? fail(/network|fetch/i.test(error.message) ? 'network' : 'WRONG_LOGIN') : { data: true, error: null }   // deliberately generic
    } catch (e) { return fail(net(e)) }
  },
  signOut: () => supabaseAdult.auth.signOut(),
  register: (full_name, phone, pin) => call(supabaseAdult, 'self_register', { full_name, phone, pin }),
  profile: (uid) => select(supabaseAdult.from('adult_profiles').select('*').eq('id', uid).maybeSingle()),
  updateSettings: (uid, patch) => select(supabaseAdult.from('adult_profiles').update(patch).eq('id', uid)),
  courses: () => select(supabaseAdult.from('adult_courses').select('id,slug,kind,title,description,status,is_free').order('position')),
  enrollments: () => select(supabaseAdult.from('adult_enrollments').select('course_id,created_at')),
  latestAssessment: () => select(supabaseAdult.from('adult_assessments').select('id,mode,scores,recommended,needs_confirmation,created_at').order('created_at', { ascending: false }).limit(1)),
  progress: () => select(supabaseAdult.from('adult_lesson_progress').select('lesson_key,course_id,status,attempts,best_trace,last_trace,best_calc,write_rating,last_results,updated_at')),
  recordLesson: (i) => rpc(supabaseAdult, 'adult_record_lesson', { p_course: i.course, p_lesson: i.lesson, p_client: i.client, p_status: i.status, p_results: i.results }),
  enroll: (course) => rpc(supabaseAdult, 'adult_enroll_free', { p_course: course }),
  submitAssessment: (a) => rpc(supabaseAdult, 'adult_submit_assessment', { p_learner: null, p_client: a.client, p_mode: 'self', p_items: a.items, p_scores: a.scores, p_recommended: a.recommended }),
  touch: () => rpc(supabaseAdult, 'adult_touch', {}),
  assignments: () => select(supabaseAdult.from('adult_assignments').select('id,class_id,title,instructions,kind,due_at,max_score,status,lesson_key,created_at').order('created_at', { ascending: false })),
  mySubmissions: () => select(supabaseAdult.from('adult_submissions').select('id,assignment_id,attempt_no,kind,status,submitted_at').order('attempt_no', { ascending: false })),
  submissionDetail: async (id) => {
    const a = await select(supabaseAdult.from('adult_submissions').select('id,kind,strokes,aspect,file_path,status,attempt_no').eq('id', id).maybeSingle())
    if (a.error || !a.data) return a
    const f = await select(supabaseAdult.from('adult_feedback').select('score,comment,corrections,request_redo,updated_at').eq('submission_id', id).maybeSingle())
    return f.error ? f : { data: { ...a.data, feedback: f.data }, error: null }
  },
  uploadPhoto: async (path, blob) => {
    try {
      const { error } = await supabaseAdult.storage.from('adult-submissions').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
      if (error && !/already exists|duplicate|409/i.test(`${error.message} ${error.statusCode || ''}`)) return fail(/network|fetch/i.test(error.message) ? 'network' : 'generic')   // "already exists" = an earlier try arrived: fine
      return { data: true, error: null }
    } catch (e) { return fail(net(e)) }
  },
  signedUrl: async (path) => { try { const { data, error } = await supabaseAdult.storage.from('adult-submissions').createSignedUrl(path, 300); return error ? fail('generic') : { data: data.signedUrl, error: null } } catch (e) { return fail(net(e)) } },
  submitWork: (i) => rpc(supabaseAdult, 'adult_submit_work', { p_assignment: i.assignment, p_client: i.client, p_kind: i.kind, p_strokes: i.strokes ?? null, p_aspect: i.aspect ?? null, p_file: i.file ?? null, p_mime: i.mime ?? null, p_bytes: i.bytes ?? null }),
  // Before an account is deleted its photos must be removed through the storage API (they are not removed by deleting database rows).
  removeMyFiles: async (uid) => {
    try {
      for (let guard = 0; guard < 20; guard++) {
        const { data, error } = await supabaseAdult.storage.from('adult-submissions').list(uid, { limit: 100 })
        if (error) return fail('generic')
        if (!data || !data.length) return { data: true, error: null }
        const { error: re } = await supabaseAdult.storage.from('adult-submissions').remove(data.map((f) => `${uid}/${f.name}`))
        if (re) return fail('generic')
      }
      return fail('generic')
    } catch (e) { return fail(net(e)) }
  },
  deleteAccount: () => rpc(supabaseAdult, 'adult_delete_my_account', {}),
}

// ---- staff (facilitators and adult admin) ----
export const staffApi = {
  me: (uid) => select(supabaseStaff.from('adult_staff').select('role,active').eq('user_id', uid).maybeSingle()),
  learners: (search) => rpc(supabaseStaff, 'adult_staff_learners', { p_search: search || null }),
  detail: (id) => rpc(supabaseStaff, 'adult_staff_learner_detail', { p_learner: id }),
  classes: () => select(supabaseStaff.from('adult_classes').select('id,name,mode,location,status,course_id').order('name')),
  courses: () => select(supabaseStaff.from('adult_courses').select('id,slug,title,status').order('position')),
  createClass: (name, course, mode, location) => rpc(supabaseStaff, 'adult_admin_create_class', { p_name: name, p_course: course || null, p_mode: mode, p_location: location || null }),
  assignFacilitator: (cls, email) => rpc(supabaseStaff, 'adult_admin_assign_facilitator', { p_class: cls, p_email: email }),
  addMember: (cls, phone) => rpc(supabaseStaff, 'adult_staff_add_member', { p_class: cls, p_phone: phone }),
  removeMember: (cls, learner) => rpc(supabaseStaff, 'adult_staff_remove_member', { p_class: cls, p_learner: learner }),
  createLearner: (p) => call(supabaseStaff, 'create_learner', p),
  resetPin: (learner_id) => call(supabaseStaff, 'reset_pin', { learner_id }),
  createStaff: (p) => call(supabaseStaff, 'create_staff', p),
  assignments: () => rpc(supabaseStaff, 'adult_staff_assignments', {}),
  createAssignment: (i) => rpc(supabaseStaff, 'adult_create_assignment', { p_class: i.class, p_title: i.title, p_instructions: i.instructions || '', p_kind: i.kind, p_lesson: i.lesson || null, p_due: i.due || null, p_max: i.max || 10 }),
  setAssignmentStatus: (id, status) => rpc(supabaseStaff, 'adult_set_assignment_status', { p_id: id, p_status: status }),
  closeClass: (cls) => rpc(supabaseStaff, 'adult_close_class', { p_class: cls }),
  reviewQueue: (status) => rpc(supabaseStaff, 'adult_staff_review_queue', { p_status: status }),
  submission: (id) => rpc(supabaseStaff, 'adult_staff_submission', { p_id: id }),
  review: (i) => rpc(supabaseStaff, 'adult_review_submission', { p_submission: i.id, p_score: i.score, p_comment: i.comment || null, p_corrections: i.corrections || [], p_redo: Boolean(i.redo) }),
  signedUrl: async (path) => { try { const { data, error } = await supabaseStaff.storage.from('adult-submissions').createSignedUrl(path, 300); return error ? fail('generic') : { data: data.signedUrl, error: null } } catch (e) { return fail(net(e)) } },
  submitAssessment: (learner, a) => rpc(supabaseStaff, 'adult_submit_assessment', { p_learner: learner, p_client: a.client, p_mode: 'assisted', p_items: a.items, p_scores: a.scores, p_recommended: a.recommended }),
}
