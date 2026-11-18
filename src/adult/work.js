// What state is an assignment in for this learner?  latest = their newest attempt that is not superseded (or undefined).
export const workState = (assignment, latest) =>
  !latest ? (assignment.status === 'closed' ? 'closed' : 'notSent')
    : latest.status === 'reviewed' ? 'marked' : latest.status === 'redo' ? 'redo' : 'sent'
export const STATE_KEY = { notSent: 'workNotSent', sent: 'workSent', marked: 'workMarked', redo: 'workRedo', closed: 'workClosed' }
// May the learner send (or replace) work now?  Mirrors the database rule in adult_submit_work.
export const canSend = (assignment, latest) => assignment.status === 'open' && (!latest || latest.status === 'submitted' || latest.status === 'redo')
