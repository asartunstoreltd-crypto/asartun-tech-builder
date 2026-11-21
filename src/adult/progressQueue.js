// If the network drops while a lesson is being saved, keep the result on the phone and send it later.
const KEY = 'adult-pending-progress'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
const write = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-50))) } catch { /* storage full: nothing more we can do */ } }
export const pendingCount = () => read().length
// SHARED PHONES: every queued item is stamped with the learner who produced it and is only ever sent while THAT learner is signed in,
// so lesson results can never be recorded on another person's account after an account switch.
export const enqueue = (item, owner) => { if (!owner) return; const q = read().filter((x) => x.client !== item.client); q.push({ ...item, owner }); write(q) }
// send(item) -> Promise<{error}>. Items that fail with a network error stay queued; permanent errors are dropped.
export async function flush(send, owner) {
  const left = []
  for (const item of read()) {
    if (!item.owner) continue                                          // queued by an older version: the owner is unknown, so it is never sent to anyone
    if (item.owner !== owner) { left.push(item); continue }            // belongs to someone else: keep it for them, never send it now
    const { owner: _o, ...payload } = item
    const { error } = await send(payload)
    const tries = (item.tries || 0) + 1
    if ((error === 'network' || error === 'generic') && tries < 6) left.push({ ...item, tries })     // gives up after 6 tries (bad data)
  }
  write(left)
  return left.filter((x) => x.owner === owner).length
}
