import { describe, expect, it } from 'vitest'
import { pickNext, type Box } from '../src/renderer/src/nav/spatial'

/* grille 3x3 de cartes 100x150, espacées de 20 */
const grid = Array.from({ length: 9 }, (_, i) => ({ id: i, box: { x: (i % 3) * 120, y: Math.floor(i / 3) * 170, w: 100, h: 150 } as Box }))
const at = (i: number) => grid[i].box
const next = (i: number, d: 'up' | 'down' | 'left' | 'right', items = grid) => pickNext(at(i), items.filter((g) => g.id !== i), d)?.id ?? null

describe('pickNext', () => {
  it('se déplace dans une grille', () => {
    expect(next(4, 'right')).toBe(5)
    expect(next(4, 'left')).toBe(3)
    expect(next(4, 'up')).toBe(1)
    expect(next(4, 'down')).toBe(7)
  })
  it('ne sort pas de la grille', () => {
    expect(next(2, 'right')).toBeNull()
    expect(next(0, 'up')).toBeNull()
  })
  it('préfère le même axe à la diagonale plus proche', () => {
    const items = [{ id: 'loin', box: { x: 600, y: 0, w: 100, h: 50 } }, { id: 'diag', box: { x: 150, y: 80, w: 100, h: 50 } }]
    expect(pickNext({ x: 0, y: 0, w: 100, h: 50 }, items, 'right')?.id).toBe('loin')
  })
  it('descend vers un bouton large sous la grille', () => {
    const items = [...grid, { id: 99, box: { x: 0, y: 600, w: 400, h: 60 } }]
    expect(next(8, 'down', items)).toBe(99)
  })
  it('remonte de la barre vers la carte la plus alignée', () => {
    const items = [...grid, { id: 99, box: { x: 240, y: 600, w: 100, h: 60 } }]
    expect(pickNext(items[9].box, grid, 'up')?.id).toBe(8)
  })
})
