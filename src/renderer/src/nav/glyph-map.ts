/* Libellés des boutons selon la manette (pur, testé). */
import type { Action, InputKind } from './input'

const XBOX: Partial<Record<Action, string>> = { accept: 'A', back: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', menu: '☰', view: '⧉' }
const PS: Partial<Record<Action, string>> = { accept: '✕', back: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', menu: 'OPTIONS', view: 'SHARE' }
const KEY: Partial<Record<Action, string>> = { accept: 'Entrée', back: 'Échap', x: 'X', y: 'Y', lb: 'Q', rb: 'E', lt: 'PgPréc', rt: 'PgSuiv', menu: 'F1', view: 'Tab' }

export function glyph(a: Action, kind: InputKind): string {
  return (kind === 'ps' ? PS : kind === 'xbox' ? XBOX : KEY)[a] ?? a
}
