import { learnerApi, staffApi } from './adultApi.js'
import { supabaseAdult, supabaseStaff } from './adultSupabase.js'
import { registerCmsContent, setAudio, setAudioClient, setContentReady, setOverrides } from './content.js'

// Loads what the admin changed (text corrections, recordings, dashboard courses) once after sign-in.
// A learner gets only what the database lets them read; staff get all published content. If it cannot be loaded the app
// simply keeps its built-in content: a failed load never blocks learning.
export async function loadContent(who) {
  const api = who === 'staff' ? staffApi : learnerApi
  setAudioClient(who === 'staff' ? supabaseStaff : supabaseAdult)
  try {
    const c = await api.content()
    setOverrides(c.texts); setAudio(c.audio); registerCmsContent(c.courses, c.lessons)
  } catch { /* keep the built-in content */ }
  setContentReady(true)
}
