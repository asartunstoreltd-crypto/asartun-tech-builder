// The two lesson courses, so the lesson list and the player can serve either one.
import * as lit from './curriculum.js'
import * as num from './numeracy.js'

export const COURSE_DEFS = {
  'basic-literacy': { slug: lit.COURSE_SLUG, kind: 'literacy', units: lit.UNITS, lessons: lit.LESSONS, listPath: '/adult/learn', startField: 'literacy', first: lit.firstLessonFor, byKey: lit.lessonByKey, next: lit.nextLesson, numeracy: false },
  'basic-numeracy': { slug: num.COURSE_SLUG, kind: 'numeracy', units: num.UNITS, lessons: num.LESSONS, listPath: '/adult/numeracy', startField: 'numeracy', first: num.firstLessonFor, byKey: num.lessonByKey, next: num.nextLesson, numeracy: true },
}
// Lesson keys are unique across both courses (tests check it), so a key alone says which course a lesson belongs to.
export const courseOfKey = (k) => Object.values(COURSE_DEFS).find((c) => c.byKey(k)) || null
export const lessonAny = (k) => { const c = courseOfKey(k); return c ? c.byKey(k) : null }
