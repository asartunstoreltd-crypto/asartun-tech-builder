import { canAccess } from './access.js'
import { useDash } from './DashAuth.jsx'

// Hides a section from someone who may not open it, even when they type the address by hand. It renders a message in place
// (no redirect, so no loop). The database refuses the data anyway.
export default function Guard({ id, children }) {
  const { ctx, suspended } = useDash()
  if (canAccess(ctx, id)) return children
  return (
    <div className="dash-card" role="alert">
      <h2>No access</h2>
      <p>{suspended ? 'This staff account is suspended. Ask an Adult Admin to reactivate it.' : 'Your account is not authorised for this section.'}</p>
    </div>
  )
}
