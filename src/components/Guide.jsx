import AudioButton from './AudioButton'
// Friendly guide character with a speech bubble. audioId = narration ID (see ScriptPage).
export default function Guide({ say, audioId }) {
  return (
    <div className="guide">
      <div className="avatar">🧑🏾‍🔧</div>
      <div className="bubble"><p>{say}</p><AudioButton id={audioId} /></div>
    </div>
  )
}
