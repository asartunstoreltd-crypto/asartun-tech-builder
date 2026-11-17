// If the network drops while a lesson is being saved, keep the result on the phone and send it later.
const KEY = 'adult-pending-progress'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } }
const write = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-50))) } catch { /* storage full: nothing more we can do */ } }
export const pendingCount = () => read().length
export const enqueue = (item) => { const q = read().filter((x) => x.client !== item.client); q.push(item); write(q) }
// send(item) -> Promise<{error}>. Items that fail with a network error stay queued; permanent errors are dropped.
export async function flush(send) {
  const left = []
  for (const item of read()) {
    const { error } = await send(item)
    const tries = (item.tries || 0) + 1
    if ((error === 'network' || error === 'generic') && tries < 6) left.push({ ...item, tries })     // gives up after 6 tries (bad data)
  }
  write(left)
  return left.length
}
