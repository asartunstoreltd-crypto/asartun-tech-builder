// Course A — Basic Literacy (Hausa). The curriculum is DATA kept in this file (not in the database) so that it can be
// reviewed in one place by a native Hausa speaker and checked by tests. Progress is stored in the database by lesson key.
// STATUS: all Hausa words, glosses and sentences are a DRAFT written for review; check spelling and naturalness before use.
//
// Every lesson follows the sequence in the brief. step.type:
//   teach   explain (text + phone voice)           show    animated demonstration of the strokes
//   trace   write over a faint guide with arrows   write   write alone, then compare with the model and say how it went
//   match   choose the matching capital letter     find    choose the word that has the letter / is the same word
//   review  summary, then the progress is saved
import { canGuide } from './guide.js'

export const COURSE_SLUG = 'basic-literacy'

const VOWELS = ['A', 'E', 'I', 'O', 'U']
const CONSONANTS = ['B', 'Ɓ', 'C', 'D', 'Ɗ', 'F', 'G', 'H', 'J', 'K', 'Ƙ', 'L', 'M', 'N', 'R', 'S', 'T', 'W', 'Y', 'Ƴ', 'Z']
// letter -> [example word, English meaning]; the word contains the letter
export const LETTER_WORDS = {
  A: ['agogo', 'clock'], E: ['keke', 'bicycle'], I: ['ido', 'eye'], O: ['kofa', 'door'], U: ['uwa', 'mother'],
  B: ['baba', 'father'], 'Ɓ': ['ɓera', 'rat'], C: ['cokali', 'spoon'], D: ['dawa', 'medicine'], 'Ɗ': ['ɗaki', 'room'],
  F: ['fura', 'millet drink'], G: ['gida', 'house'], H: ['hanya', 'road'], J: ['jaki', 'donkey'], K: ['kaza', 'chicken'],
  'Ƙ': ['ƙwai', 'egg'], L: ['lemo', 'orange'], M: ['mota', 'car'], N: ['nama', 'meat'], R: ['rana', 'sun'],
  S: ['sama', 'sky'], T: ['tuwo', 'tuwo (food)'], W: ['waya', 'phone'], Y: ['yara', 'children'], 'Ƴ': ['ƴa', 'daughter'], Z: ['zuma', 'honey'],
}
export const WORDS = [
  ['baba', 'father'], ['uwa', 'mother'], ['ruwa', 'water'], ['rana', 'sun, day'], ['gida', 'house'],
  ['kaza', 'chicken'], ['dawa', 'medicine'], ['sama', 'sky'], ['mota', 'car'], ['waya', 'phone'],
]
// Sentences are written one word per line so the letters stay large enough to trace on a phone.
export const SENTENCES = [
  ['Ina gida.', 'I am at home.'], ['Ina son ruwa.', 'I want water.'], ['Na je gida.', 'I went home.'],
  ['Rana ta fito.', 'The sun has come out.'], ['Ka kira ni.', 'Call me.'],
]
export const MESSAGES = [
  ['Zo gida yau.', 'Come home today.', ['Zo gida yau.', 'Na je gida.', 'Ka kira ni.']],
  ['Ka kira ni.', 'Call me.', ['Ina son ruwa.', 'Ka kira ni.', 'Rana ta fito.']],
  ['Ruwa na gida.', 'There is water at home.', ['Ina gida.', 'Ruwa na gida.', 'Zo gida yau.']],
]

const up = (s) => s.toUpperCase()
const key = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const lines = (sentence) => up(sentence).split(' ').join('\n')

// Rotate so the correct answer is not always in the same place (deterministic, so tests and learners see the same thing).
const rot = (arr, n) => arr.map((_, i) => arr[(i + n) % arr.length])
const others = (pool, notThis, count, seed) => rot(pool.filter((x) => x !== notThis), seed).slice(0, count)

function letterLesson(letter, i) {
  const [word, gloss] = LETTER_WORDS[letter]
  const lower = letter.toLowerCase()
  const capitals = [...VOWELS, ...CONSONANTS]
  const wordsWithout = Object.values(LETTER_WORDS).map((w) => w[0]).filter((w) => !up(w).includes(letter))
  return {
    key: 'letter-' + (i + 1 < 10 ? '0' : '') + (i + 1), unit: 'letters', title: { key: 'lessonLetterTitle', vars: { upper: letter } },
    steps: [
      { type: 'teach', kind: 'letter', letter, lower, word, gloss },
      { type: 'show', text: letter },
      { type: 'trace', text: letter },
      { type: 'write', text: letter },
      { type: 'match', prompt: lower, target: letter, options: rot([letter, ...others(capitals, letter, 3, i * 3 + 1)], i % 4) },
      { type: 'find', kind: 'hasLetter', letter, target: word, options: rot([word, ...others(wordsWithout, word, 2, i * 2)], (i + 1) % 3) },
      { type: 'review' },
    ],
  }
}
function wordLesson([word, gloss], i) {
  const pool = WORDS.map((w) => w[0])
  return {
    key: 'word-' + key(word), unit: 'words', title: { key: 'lessonWordTitle', vars: { word: up(word) } },
    steps: [
      { type: 'teach', kind: 'word', word, gloss },
      { type: 'show', text: up(word) },
      { type: 'trace', text: up(word) },
      { type: 'write', text: up(word) },
      { type: 'find', kind: 'sameWord', target: word, options: rot([word, ...others(pool, word, 2, i + 1)], i % 3) },
      { type: 'review' },
    ],
  }
}
function sentenceLesson([sentence, gloss], i) {
  const pool = SENTENCES.map((s) => s[0])
  return {
    key: 'sentence-' + key(sentence), unit: 'sentences', title: { key: 'lessonSentenceTitle', vars: { n: i + 1 } },
    steps: [
      { type: 'teach', kind: 'sentence', sentence, gloss },
      { type: 'trace', text: lines(sentence) },
      { type: 'write', text: lines(sentence) },
      { type: 'find', kind: 'sameSentence', target: sentence, options: rot([sentence, ...others(pool, sentence, 2, i + 1)], i % 3) },
      { type: 'review' },
    ],
  }
}
function messageLesson([text, gloss, options], i) {
  return {
    key: 'message-' + (i + 1), unit: 'messages', title: { key: 'lessonMessageTitle', vars: { n: i + 1 } },
    steps: [
      { type: 'teach', kind: 'message', sentence: text, gloss },
      { type: 'find', kind: 'sameSentence', target: text, options: rot(options, i) },
      { type: 'review' },
    ],
  }
}
const nameLesson = { key: 'my-name', unit: 'name', title: { key: 'lessonNameTitle', vars: {} }, steps: [{ type: 'teach', kind: 'name' }, { type: 'trace', text: '@NAME' }, { type: 'write', text: '@NAME' }, { type: 'review' }] }

export const UNITS = [
  { id: 'letters', titleKey: 'unitLetters', start: 'letters', lessons: [...VOWELS, ...CONSONANTS].map(letterLesson) },
  { id: 'words', titleKey: 'unitWords', start: 'words', lessons: WORDS.map(wordLesson) },
  { id: 'name', titleKey: 'unitName', start: 'words', lessons: [nameLesson] },
  { id: 'sentences', titleKey: 'unitSentences', start: 'sentences', lessons: SENTENCES.map(sentenceLesson) },
  { id: 'messages', titleKey: 'unitMessages', start: 'practical', lessons: MESSAGES.map(messageLesson) },
]
export const LESSONS = UNITS.flatMap((u) => u.lessons)
export const lessonByKey = (k) => LESSONS.find((l) => l.key === k) || null
export const unitOf = (lesson) => UNITS.find((u) => u.id === lesson.unit)
export const nextLesson = (k) => { const i = LESSONS.findIndex((l) => l.key === k); return i >= 0 ? LESSONS[i + 1] || null : null }

// The learner's own first name, upper-case, for the "write your name" lesson. Returns '' when it cannot be guided
// (a letter outside the Hausa alphabet): the page then uses free writing with a model to compare.
export function nameForGuide(fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0] || ''
  return first.toUpperCase()
}
export const nameCanGuide = (name) => name.length > 0 && name.length <= 12 && canGuide(name)

// Where a learner should start, from the assessment's advice (literacy.start): the first lesson of that unit.
export function firstLessonFor(start) {
  const u = UNITS.find((x) => x.start === start) || UNITS[0]
  return u.lessons[0]
}
