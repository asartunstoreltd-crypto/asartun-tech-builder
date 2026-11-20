// The adult courses in one place, so the lesson list, lesson player and facilitator screens treat them alike.
import * as lit from './curriculum.js'
import * as num from './numeracy.js'
import * as dig from './digital.js'

export const COURSES = {
  [lit.COURSE_SLUG]: { slug: lit.COURSE_SLUG, kind: 'literacy', units: lit.UNITS, lessons: lit.LESSONS, route: '/adult/learn', titleKey: 'lessonsTitle' },
  [num.COURSE_SLUG]: { slug: num.COURSE_SLUG, kind: 'numeracy', units: num.UNITS, lessons: num.LESSONS, route: '/adult/numeracy', titleKey: 'numeracyTitle' },
  [dig.COURSE_SLUG]: { slug: dig.COURSE_SLUG, kind: 'digital', units: dig.UNITS, lessons: dig.LESSONS, route: '/adult/digital', titleKey: 'digitalTitle' },
}
export const ALL_LESSONS = Object.values(COURSES).flatMap((c) => c.lessons)   // kept up to date when dashboard courses are registered (below)
const rebuild = () => { ALL_LESSONS.length = 0; ALL_LESSONS.push(...Object.values(COURSES).flatMap((c) => c.lessons)) }
// Courses written in the dashboard are added at run time (see content.js). Built-in courses (marked no "cms") can never be replaced or removed.
export function registerCourse(def) { if (!def.cms || (COURSES[def.slug] && !COURSES[def.slug].cms)) return false; COURSES[def.slug] = def; rebuild(); return true }
export function unregisterCourses(pred) { for (const slug of Object.keys(COURSES)) if (COURSES[slug].cms && pred(COURSES[slug])) delete COURSES[slug]; rebuild() }
export const lessonByKey = (k) => ALL_LESSONS.find((l) => l.key === k) || null
export const courseOfLesson = (k) => Object.values(COURSES).find((c) => c.lessons.some((l) => l.key === k)) || null
export const nextInCourse = (k) => { const c = courseOfLesson(k); if (!c) return null; const i = c.lessons.findIndex((l) => l.key === k); return c.lessons[i + 1] || null }
export const firstLessonOf = (course, start) => (course.units.find((u) => u.start === start) || course.units[0]).lessons[0]
