// Builders for the Phase 2 challenge types (same {ha, en} convention as dsl.js). `kind` is what the admin editor uses to pick the editor.
import { L } from './dsl.js'
export const predictC = (key, ask, options, correct, table, explain) => ({ type: 'predict', kind: 'predict', key, ask, options, correct, table, explain })
export const simC = (key, o) => ({ type: 'sim', kind: 'sim', key, ...o })
export const planC = (key) => ({ type: 'business_plus', kind: 'business_plus', key })
export const reflectC = (key, title, prompts, minChars = 15) => ({ type: 'reflect', kind: 'reflect', key, title, prompts, minChars })
export const opt = (id, ha, en, effect = 0) => ({ id, label: L(ha, en), effect })
export const row = (ha, en, value) => ({ label: L(ha, en), value })
