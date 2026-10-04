/* Focus spatial : choisit l'élément le plus naturel dans une direction. Pur (rectangles en entrée) pour être testé. */

export type Dir = 'up' | 'down' | 'left' | 'right'
export interface Box { x: number; y: number; w: number; h: number }

/* Distance « ressentie » : on avance dans la direction, en pénalisant fort le décalage latéral.
   Un candidat qui chevauche l'axe (même ligne / même colonne) passe devant un candidat en diagonale. */
export function pickNext<T extends { box: Box }>(from: Box, items: T[], dir: Dir): T | null {
  const horiz = dir === 'left' || dir === 'right', sign = dir === 'right' || dir === 'down' ? 1 : -1
  let best: T | null = null, bestScore = Infinity
  for (const it of items) {
    const b = it.box
    if (b === from) continue
    // avance : bord de départ -> bord d'arrivée
    const gap = horiz ? (sign > 0 ? b.x - (from.x + from.w) : from.x - (b.x + b.w)) : sign > 0 ? b.y - (from.y + from.h) : from.y - (b.y + b.h)
    const centerAdvance = horiz ? (b.x + b.w / 2 - (from.x + from.w / 2)) * sign : (b.y + b.h / 2 - (from.y + from.h / 2)) * sign
    if (centerAdvance <= 1 || gap < -Math.min(horiz ? from.w : from.h, horiz ? b.w : b.h) / 2) continue
    // décalage latéral : 0 si les projections se chevauchent
    const [a0, a1, b0, b1] = horiz ? [from.y, from.y + from.h, b.y, b.y + b.h] : [from.x, from.x + from.w, b.x, b.x + b.w]
    const overlap = Math.min(a1, b1) - Math.max(a0, b0)
    const lateral = overlap > 0 ? 0 : Math.max(b0 - a1, a0 - b1)
    const lateralCenter = Math.abs(horiz ? b.y + b.h / 2 - (from.y + from.h / 2) : b.x + b.w / 2 - (from.x + from.w / 2))
    const score = Math.max(gap, 0) + lateral * 4 + lateralCenter * 0.1 + (overlap > 0 ? 0 : 1e4)
    if (score < bestScore) { bestScore = score; best = it }
  }
  return best
}
