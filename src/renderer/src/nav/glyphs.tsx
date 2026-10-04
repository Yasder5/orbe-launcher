/* Boutons affichés selon la manette détectée (A/B Xbox, Croix/Rond PlayStation, touches clavier). */
import { glyph } from './glyph-map'
import type { Action } from './input'
import { useNavCtx } from './nav'
import { useT } from '../i18n/i18n'

export function Glyph({ action }: { action: Action }) {
  const { kind } = useNavCtx()
  return <span className={`glyph glyph--${kind} glyph--${action}`}>{glyph(action, kind)}</span>
}

/* Barre d'aide en bas d'écran : ce que fait chaque bouton ici */
export function HintBar({ items }: { items: [Action, string][] }) {
  const t = useT()
  return (
    <footer className="hintbar">
      {items.map(([a, label]) => (
        <span key={a} className="hint"><Glyph action={a} /> {t(label)}</span>
      ))}
    </footer>
  )
}
