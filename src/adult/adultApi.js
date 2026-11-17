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
    return error ? fail(/denied|authorized|42501/i.test(error.message) ? 'denied' : 'generic') : { data, error: null }
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
  progress: () => select(supabaseAdult.from('adult_lesson_progress').select('lesson_key,course_id,status,attempts,best_trace,last_trace,write_rating,last_results,updated_at')),
  recordLesson: (i) => rpc(supabaseAdult, 'adult_record_lesson', { p_course: i.course, p_lesson: i.lesson, p_client: i.client, p_status: i.status, p_results: i.results }),
  enroll: (course) => rpc(supabaseAdult, 'adult_enroll_free', { p_course: course }),
  submitAssessment: (a) => rpc(supabaseAdult, 'adult_submit_assessment', { p_learner: null, p_client: a.client, p_mode: 'self', p_items: a.items, p_scores: a.scores, p_recommended: a.recommended }),
  touch: () => rpc(supabaseAdult, 'adult_touch', {}),
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
  submitAssessment: (learner, a) => rpc(supabaseStaff, 'adult_submit_assessment', { p_learner: learner, p_client: a.client, p_mode: 'assisted', p_items: a.items, p_scores: a.scores, p_recommended: a.recommended }),
}
