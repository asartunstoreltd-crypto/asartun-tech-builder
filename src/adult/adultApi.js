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
    const known = [[/already marked/i, 'MARKED'], [/assignment closed/i, 'CLOSED_WORK'], [/too many attempts/i, 'ATTEMPTS'], [/photo not uploaded/i, 'NOUPLOAD'], [/class is closed/i, 'CLASS_CLOSED'], [/bad score/i, 'BADSCORE'], [/too many learners/i, 'TOOMANY'], [/bad date/i, 'BADDATE'], [/bad schedule/i, 'BADSCHEDULE'], [/bad marks|bad note/i, 'BADMARKS'],
      [/bad reference/i, 'BADREF'], [/already waiting/i, 'WAITING'], [/too many waiting/i, 'TOOMANYWAIT'], [/already has access/i, 'HASACCESS'], [/too many code tries/i, 'CODETRIES'], [/bad codes/i, 'BADCODES'], [/bad code/i, 'BADCODE'],
      [/course not available/i, 'NOCOURSE'], [/not yet complete/i, 'NOTYET'], [/certificate withdrawn/i, 'WITHDRAWN'], [/payment already decided/i, 'DECIDED'], [/bad price/i, 'BADPRICE'], [/bad course/i, 'BADCOURSE'], [/bad payment info/i, 'BADINFO'], [/not enrolled/i, 'denied'],
      [/bad text/i, 'BADTEXT'], [/no draft/i, 'NODRAFT'], [/bad audio/i, 'BADAUDIO'], [/bad slug/i, 'BADSLUG'], [/slug taken/i, 'SLUGTAKEN'], [/bad lesson/i, 'BADLESSON'], [/lesson not valid/i, 'LESSONINVALID'], [/lesson in use/i, 'LESSONINUSE'], [/lesson not found/i, 'NOLESSON']]
    const hit = known.find(([re]) => re.test(error.message || ''))
    return fail(hit ? hit[1] : /denied|authorized|42501/i.test(error.message) ? 'denied' : 'generic')
  } catch (e) { return fail(net(e)) }
}
async function select(q) {
  try { const { data, error } = await q; return error ? fail('generic') : { data, error: null } } catch (e) { return fail(net(e)) }
}

// ---- content written or corrected in the dashboard (Phase 10): the same read for learners and staff ----
async function readContent(client) {
  if (!client) return { texts: [], audio: [], courses: [], lessons: [], error: 'config' }
  const [t, a, c, l] = await Promise.all([
    select(client.from('adult_texts').select('key,lang,value,reviewed')),
    select(client.from('adult_audio').select('key,lang,path,mime,bytes,duration_ms,text_hash')),
    select(client.from('adult_courses').select('id,slug,kind,title,description,status,origin,skill_area').eq('origin', 'cms')),
    select(client.from('adult_cms_lessons').select('id,course_id,key,position,unit,title,content,status').order('position')),
  ])
  return { texts: t.data || [], audio: a.data || [], courses: c.data || [], lessons: l.data || [], error: t.error || a.error || c.error || l.error }
}
async function readContentLight(client) {       // texts and recordings only: small, used to pick up changes while someone is already signed in
  if (!client) return { texts: [], audio: [], error: 'config' }
  const [t, a] = await Promise.all([select(client.from('adult_texts').select('key,lang,value,reviewed')), select(client.from('adult_audio').select('key,lang,path,mime,bytes,duration_ms,text_hash'))])
  return { texts: t.data || [], audio: a.data || [], error: t.error || a.error }
}
const AUDIO_EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a' }
export const audioExtension = (mime) => AUDIO_EXT[mime] || null
// a short-lived link to a private recording (the browser plays it; nothing is downloaded until someone presses Listen)
export async function signedAudioUrl(client, path) {
  if (!client) return null
  try { const { data, error } = await client.storage.from('adult-audio').createSignedUrl(path, 3600); return error ? null : data.signedUrl } catch { return null }
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
  courses: () => select(supabaseAdult.from('adult_courses').select('id,slug,kind,title,description,status,is_free,price_ngn,access_days,origin').order('position')),
  enrollments: () => select(supabaseAdult.from('adult_enrollments').select('course_id,created_at,ends_at,source')),
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
  myReport: () => rpc(supabaseAdult, 'adult_my_report', {}),
  content: () => readContent(supabaseAdult),
  contentLight: () => readContentLight(supabaseAdult),
  // Phase 8: paying for a course, certificates
  paymentInfo: () => select(supabaseAdult.from('adult_payment_info').select('instructions,account_details,whatsapp').maybeSingle()),
  myPayments: () => select(supabaseAdult.from('adult_payments').select('id,course_id,status,method,reference,amount_ngn,reject_reason,created_at,decided_at').order('created_at', { ascending: false }).limit(50)),
  requestPayment: (course, reference) => rpc(supabaseAdult, 'adult_request_payment', { p_course: course, p_reference: reference }),
  cancelPayment: (id) => rpc(supabaseAdult, 'adult_cancel_payment', { p_payment: id }),
  redeemCode: (code) => rpc(supabaseAdult, 'adult_redeem_code', { p_code: code }),
  certificateStatus: (course) => rpc(supabaseAdult, 'adult_certificate_status', { p_course: course }),
  claimCertificate: (course) => rpc(supabaseAdult, 'adult_claim_certificate', { p_course: course }),
  myCertificates: () => select(supabaseAdult.from('adult_certificates').select('id,number,course_id,learner_name,course_title,issued_at,status').order('issued_at', { ascending: false })),
}

// ---- staff (facilitators and adult admin) ----
export const staffApi = {
  me: (uid) => select(supabaseStaff.from('adult_staff').select('role,active').eq('user_id', uid).maybeSingle()),
  learners: (search) => rpc(supabaseStaff, 'adult_staff_learners', { p_search: search || null }),
  detail: (id) => rpc(supabaseStaff, 'adult_staff_learner_detail', { p_learner: id }),
  classes: () => select(supabaseStaff.from('adult_classes').select('id,name,mode,location,status,course_id,schedule').order('name')),
  courses: () => select(supabaseStaff.from('adult_courses').select('id,slug,kind,title,status,is_free,price_ngn,access_days').order('position')),
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
  // Phase 10: content (adult admin) — texts, recordings, courses and lessons written in the dashboard
  content: () => readContent(supabaseStaff),
  contentLight: () => readContentLight(supabaseStaff),
  contentDrafts: async () => {
    const [t, l, h] = await Promise.all([select(supabaseStaff.from('adult_text_drafts').select('key,lang,value,updated_at')), select(supabaseStaff.from('adult_cms_lesson_drafts').select('lesson_id,content,updated_at')), select(supabaseStaff.from('adult_cms_history').select('id,lesson_id,content,at').order('at', { ascending: false }).limit(200))])
    return { textDrafts: t.data || [], lessonDrafts: l.data || [], history: h.data || [], error: t.error || l.error || h.error }
  },
  saveTextDraft: (key, lang, value) => rpc(supabaseStaff, 'adult_admin_save_text_draft', { p_key: key, p_lang: lang, p_value: value }),
  discardTextDraft: (key, lang) => rpc(supabaseStaff, 'adult_admin_discard_text_draft', { p_key: key, p_lang: lang }),
  publishText: (key, lang, reviewed) => rpc(supabaseStaff, 'adult_admin_publish_text', { p_key: key, p_lang: lang, p_reviewed: Boolean(reviewed) }),
  markReviewed: (key, lang, value, reviewed) => rpc(supabaseStaff, 'adult_admin_mark_reviewed', { p_key: key, p_lang: lang, p_value: value, p_reviewed: Boolean(reviewed) }),
  revertText: (key, lang) => rpc(supabaseStaff, 'adult_admin_revert_text', { p_key: key, p_lang: lang }),
  // a recording: the file goes to private storage first (only the adult admin may), then the database records it
  uploadAudio: async ({ key, lang, blob, mime, durationMs, textHash }) => {
    const ext = AUDIO_EXT[mime]
    if (!supabaseStaff || !ext || blob.size < 1 || blob.size > 3145728) return fail('BADAUDIO')
    const path = `audio/${key}/${lang}-${Date.now()}.${ext}`
    try {
      const up = await supabaseStaff.storage.from('adult-audio').upload(path, blob, { contentType: mime, cacheControl: '3600', upsert: false })
      if (up.error) return fail('BADAUDIO')
    } catch (e) { return fail(net(e)) }
    const r = await rpc(supabaseStaff, 'adult_admin_set_audio', { p_key: key, p_lang: lang, p_path: path, p_mime: mime, p_bytes: blob.size, p_duration_ms: durationMs || null, p_text_hash: textHash })
    if (r.error) { try { await supabaseStaff.storage.from('adult-audio').remove([path]) } catch { /* nothing more to do */ } return r }
    if (r.data) { try { await supabaseStaff.storage.from('adult-audio').remove([r.data]) } catch { /* the old file stays; harmless */ } }
    return { data: { path }, error: null }
  },
  confirmAudio: (key, lang, textHash) => rpc(supabaseStaff, 'adult_admin_confirm_audio', { p_key: key, p_lang: lang, p_text_hash: textHash }),
  deleteAudio: async (key, lang) => {
    const r = await rpc(supabaseStaff, 'adult_admin_delete_audio', { p_key: key, p_lang: lang })
    if (!r.error && r.data) { try { await supabaseStaff.storage.from('adult-audio').remove([r.data]) } catch { /* the file stays; harmless */ } }
    return r
  },
  createCourse: (i) => rpc(supabaseStaff, 'adult_admin_create_course', { p_slug: i.slug, p_title: i.title, p_description: i.description, p_skill_area: i.area }),
  updateCourse: (i) => rpc(supabaseStaff, 'adult_admin_update_course', { p_course: i.course, p_title: i.title, p_description: i.description, p_skill_area: i.area }),
  createLesson: (course, title) => rpc(supabaseStaff, 'adult_admin_create_lesson', { p_course: course, p_title: title }),
  saveLessonDraft: (lesson, content) => rpc(supabaseStaff, 'adult_admin_save_lesson_draft', { p_lesson: lesson, p_content: content }),
  publishLesson: (lesson) => rpc(supabaseStaff, 'adult_admin_publish_lesson', { p_lesson: lesson }),
  setLessonStatus: (lesson, status) => rpc(supabaseStaff, 'adult_admin_set_lesson_status', { p_lesson: lesson, p_status: status }),
  moveLesson: (lesson, dir) => rpc(supabaseStaff, 'adult_admin_move_lesson', { p_lesson: lesson, p_dir: dir }),
  deleteLesson: (lesson) => rpc(supabaseStaff, 'adult_admin_delete_lesson', { p_lesson: lesson }),
  // Phase 8: course pricing, payments, codes, certificates (adult admin)
  setCourse: (i) => rpc(supabaseStaff, 'adult_admin_set_course', { p_course: i.course, p_status: i.status, p_free: i.free, p_price: i.free ? 0 : i.price, p_days: i.free ? null : i.days }),
  paymentInfo: () => select(supabaseStaff.from('adult_payment_info').select('instructions,account_details,whatsapp').maybeSingle()),
  setPaymentInfo: (i) => rpc(supabaseStaff, 'adult_admin_set_payment_info', { p_instructions: i.instructions, p_account: i.account, p_whatsapp: i.whatsapp || null }),
  adminPayments: (status) => rpc(supabaseStaff, 'adult_admin_payments', { p_status: status || null }),
  verifyPayment: (id) => rpc(supabaseStaff, 'adult_admin_verify_payment', { p_payment: id }),
  rejectPayment: (id, reason) => rpc(supabaseStaff, 'adult_admin_reject_payment', { p_payment: id, p_reason: reason || null }),
  createCodes: (i) => rpc(supabaseStaff, 'adult_admin_create_codes', { p_course: i.course, p_count: i.count, p_note: i.note || null, p_valid_days: i.days }),
  codes: () => rpc(supabaseStaff, 'adult_admin_codes', {}),
  certificates: () => select(supabaseStaff.from('adult_certificates').select('id,number,learner_name,course_title,issued_at,status,revoked_reason').order('issued_at', { ascending: false }).limit(300)),
  revokeCertificate: (id, reason) => rpc(supabaseStaff, 'adult_admin_revoke_certificate', { p_id: id, p_reason: reason || null }),
  // Phase 7: attendance, schedule, reports
  reportData: (cls) => rpc(supabaseStaff, 'adult_report_data', { p_class: cls }),
  openSession: (cls, date, note) => rpc(supabaseStaff, 'adult_open_session', { p_class: cls, p_date: date, p_note: note || null }),
  markAttendance: (session, marks) => rpc(supabaseStaff, 'adult_mark_attendance', { p_session: session, p_marks: marks }),
  removeSession: (session) => rpc(supabaseStaff, 'adult_remove_session', { p_session: session }),
  setSchedule: (cls, s) => rpc(supabaseStaff, 'adult_set_class_schedule', { p_class: cls, p_mode: s.mode, p_days: s.days, p_start: s.days.length ? s.start : null, p_end: s.days.length ? s.end : null, p_location: s.location || null, p_note: s.note || null }),
  unassignFacilitator: (cls, email) => rpc(supabaseStaff, 'adult_admin_unassign_facilitator', { p_class: cls, p_email: email }),
  submitAssessment: (learner, a) => rpc(supabaseStaff, 'adult_submit_assessment', { p_learner: learner, p_client: a.client, p_mode: 'assisted', p_items: a.items, p_scores: a.scores, p_recommended: a.recommended }),
}
