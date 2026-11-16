// Phone + PIN rules. The Edge Function (supabase/functions/adult-admin) repeats the same rules on the server;
// scripts/test-adult.mjs checks that the two stay identical. The server is the one that counts; this is for friendly messages.
export const LOGIN_DOMAIN = import.meta.env?.VITE_ADULT_LOGIN_DOMAIN || 'adult.asartun.invalid'

export function normalizePhone(raw) {
  const s = String(raw ?? '').replace(/[\s\-().]/g, '')
  if (/^\+[0-9]{10,15}$/.test(s)) return s
  if (/^00[0-9]{10,15}$/.test(s)) return '+' + s.slice(2)
  if (/^0[789][01][0-9]{8}$/.test(s)) return '+234' + s.slice(1)     // Nigerian mobile: 080…, 070…, 090…, 081…
  if (/^234[0-9]{10}$/.test(s)) return '+' + s
  return null
}

// Returns a message key (see strings.js) or null when the PIN is acceptable.
export function pinProblem(pin) {
  const p = String(pin ?? '')
  if (!/^[0-9]{6}$/.test(p)) return 'pinSix'
  if (/^(\d)\1{5}$/.test(p)) return 'pinSame'
  if ('01234567890123456789'.includes(p) || '98765432109876543210'.includes(p)) return 'pinSeq'
  if (['112233', '121212', '123123', '111222', '123321'].includes(p)) return 'pinWeak'
  return null
}

export const loginName = (phone) => phone.replace('+', '') + '@' + LOGIN_DOMAIN
