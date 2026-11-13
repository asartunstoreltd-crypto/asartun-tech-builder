// Simple reward animation: emojis float up. Pure CSS.
export default function Confetti() {
  const items = ['🎉', '⭐', '🌟', '🎊', '✨', '🏆', '⭐', '🎉']
  return <div className="confetti" aria-hidden="true">{items.map((e, i) => <span key={i} style={{ left: `${8 + i * 12}%`, animationDelay: `${i * 0.12}s` }}>{e}</span>)}</div>
}
