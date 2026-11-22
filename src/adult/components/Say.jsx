import { useAdult } from '../AdultAuth.jsx'
import { template } from '../content.js'
import AdultAudio from './AdultAudio.jsx'

// A Listen button for a piece of screen text. Plays the admin's recording of that text if there is one, otherwise the phone's own voice,
// and shows nothing if neither exists. A text that contains a name or a number ({placeholder}) cannot have a recording (the words change
// from person to person), so it only uses the phone's voice.
//   k  the text key      vars  values for its {placeholders}      big  a larger button
export default function Say({ k, vars, big = false }) {
  const { t, lang } = useAdult()
  const hasVars = /\{[a-zA-Z]+\}/.test(template(lang, k))
  return <AdultAudio text={t(k, vars)} audioKey={hasVars ? undefined : k} big={big} />
}
