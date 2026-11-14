// Short builders so a new mission is easy to write. Everything is Hausa + English ({ha, en}).
export const L = (ha, en) => ({ ha, en })
// A step: S = trained adults only, K = a child can help (adult nearby)
export const S = (emoji, ha, en, tha, ten) => ({ emoji, name: L(ha, en), text: L(tha, ten) })
export const K = (...a) => ({ ...S(...a), kid: true })
// A learning page. lines = [[headingKey|null, hausa, english], ...]  (headingKey: whatIs / whatDoes / whyNeeded / fact)
export const page = (emoji, ha, en, lines, warn = false) => ({
  emoji, ...(warn ? { warn: true } : {}), title: L(ha, en),
  lines: lines.map(([k, h, e]) => ({ ...(k ? { k } : {}), text: L(h, e) })),
})
export const hello = L('Sannu, ƙaramin mai ƙirƙira! 👋', 'Hello, young inventor! 👋')
export const chain = ['Abu na asali → Sarrafawa → Sabon abu → Amfani', 'Resource → Processing → New product → Value']
export const story = (emoji, lines) => ({ emoji, title: hello, lines: lines.map(([h, e]) => ({ text: L(h, e) })) })
export const recap = (rh, re, ph, pe) => page('🌍', 'Abu na asali da sabon abu', 'Resource and new product', [[null, rh, re], [null, ph, pe], [null, ...chain]])
export const safety = (h1, e1, h2, e2) => page('⚠️', 'Tsaro', 'Safety', [[null, h1, e1], [null, h2 + ' Wannan wasa ne kawai.', e2 + ' This is a game only.']], true)
export const part = (emoji, ha, en, [wh, we], [dh, de], [yh, ye]) => page(emoji, ha, en, [['whatIs', wh, we], ['whatDoes', dh, de], ['whyNeeded', yh, ye]])
export const value = (h, e) => page('💰', 'Sarrafawa yana ƙara ƙima', 'Processing adds value', [[null, h, e],
  [null, 'Kowanne yana da hanyarsa. Wasu matakai na manya ne kawai. Za ka kalle su duka.', 'Each has its own way. Some steps are for adults only. You will watch them all.']])
// A process shown, then practised. steps = ids from the mission's `steps`
export const proc = (id, emoji, ha, en, steps, sh, se, res) => ({
  id, emoji, name: L(ha, en), steps, summary: L(sh, se), result: { emoji: res ? res[0] : emoji, name: L(res ? res[1] : ha, res ? res[2] : en) },
})
export const item = (emoji, kind, ha, en, wh, we) => ({ emoji, kind, name: L(ha, en), why: L(wh, we) })
export const sortC = (items, extra = {}) => ({ type: 'sort', key: 'sort', items, ...extra })
export const safetyC = (items) => ({ type: 'safety', key: 'safety', items })
export const business = { type: 'business', key: 'business' }
export const quest = (ha, en, answers, c, eh, ee) => ({ q: L(ha, en), a: answers.map(([h, e]) => L(h, e)), c, e: L(eh, ee) })
export const profitQ = quest('Yaya ake samun riba?', 'How do we find profit?',
  [['Farashin sayarwa − kuɗin da aka kashe', 'Selling price − money spent'], ['Farashin sayarwa + kuɗin da aka kashe', 'Selling price + money spent'], ['Kuɗin ƙunshewa kaɗai', 'Packaging cost only']], 0,
  'Riba = farashin sayarwa − jimillar kuɗin da aka kashe.', 'Profit = selling price − total money spent.')
export const rewards = (badge) => ({ teach: [10, 'Resource Explorer'], show: 5, practice: [10, 'Young Inventor'], sort: 5, safety: 5, business: [15, 'Smart Builder'], quiz: 5, finish: [10, badge] })
export const mission = (o) => ({ mixed: true, stages: ['teach', 'show', 'practice', 'challenge', 'quiz', 'reward'], ...o })
