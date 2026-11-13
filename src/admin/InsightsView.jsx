// Funnel per mission (where children stop) and the hardest quiz questions (where content may need fixing).
export default function InsightsView({ data }) {
  return (
    <div>
      <div className="adm-grid">
        <div className="adm-stat"><span className="adm-ico">👧🏾</span><b>{data.learners}</b><span>Learners</span></div>
        <div className="adm-stat"><span className="adm-ico">🔥</span><b>{data.active_7d}</b><span>Active, last 7 days</span></div>
      </div>
      <div className="adm-card">
        <h3>Where learners stop</h3>
        <p className="adm-note">Number of learners who reached each part. A big drop between two columns means that part is too hard, too long or unclear.</p>
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th>Mission</th><th>Learn</th><th>Watch</th><th>Practice</th><th>Challenge</th><th>Quiz</th><th>Finished</th></tr></thead>
          <tbody>{data.missions.map((m) => (
            <tr key={m.slug}><td>{(m.title && (m.title.en || m.title.ha)) || m.slug}</td>
              <td>{m.reached_learn}</td><td>{m.reached_watch}</td><td>{m.reached_practice}</td><td>{m.reached_challenge}</td><td>{m.reached_quiz}</td><td><b>{m.finished}</b></td></tr>))}</tbody>
        </table></div>
      </div>
      <div className="adm-card">
        <h3>Hardest quiz questions</h3>
        <p className="adm-note">Many wrong first answers usually means the lesson did not teach it clearly. Improve the explanation or the demonstration.</p>
        {data.hard_questions.length === 0 && <p className="adm-empty">No wrong answers recorded yet.</p>}
        <ol>{data.hard_questions.map((q) => (
          <li key={q.key}><b>{q.key.replace(':quiz-', ' · question ')}</b>: {q.question || ''}<br />
            <small>{q.wrong} wrong attempts by {q.learners} learner(s); {q.correct} learner(s) got it right eventually.</small></li>))}</ol>
      </div>
    </div>
  )
}
