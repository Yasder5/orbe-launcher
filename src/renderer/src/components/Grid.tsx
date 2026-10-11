/* Grille virtualisée : seules les rangées visibles (+ marge) sont dans le DOM, la navigation reste continue. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Game } from '@shared/types'
import { GameCard } from './GameCard'

const MIN_W = 200, GAP = 26, OVERSCAN = 2

export function Grid({ games, onOpen, initialId }: { games: Game[]; onOpen: (g: Game) => void; initialId?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 1200, h: 800 })
  const [top, setTop] = useState(0)
  useLayoutEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const cols = Math.max(2, Math.floor((size.w + GAP) / (MIN_W + GAP)))
  const cardW = (size.w - GAP * (cols - 1)) / cols, rowH = cardW * 1.5 + GAP
  const rows = Math.ceil(games.length / cols)
  const first = Math.max(0, Math.floor(top / rowH) - OVERSCAN), last = Math.min(rows, Math.ceil((top + size.h) / rowH) + OVERSCAN)

  // retour sur la grille : faire défiler jusqu'au jeu précédemment choisi pour qu'il soit rendu
  useEffect(() => {
    if (!initialId) return
    const i = games.findIndex((g) => 'g:' + g.id === initialId)
    if (i >= 0 && box.current) box.current.scrollTop = Math.max(0, Math.floor(i / cols) * rowH - rowH)
  }, [initialId, cols, rowH])

  const items = []
  for (let r = first; r < last; r++) {
    for (let c = 0; c < cols; c++) {
      const g = games[r * cols + c]
      if (!g) break
      items.push(
        <div key={g.id} className="grid__cell" style={{ transform: `translate(${c * (cardW + GAP)}px, ${r * rowH}px)`, width: cardW }}>
          <GameCard game={g} onOpen={onOpen} autofocus={r === 0 && c === 0} />
        </div>
      )
    }
  }
  return (
    <div className="grid" ref={box} onScroll={(e) => setTop(e.currentTarget.scrollTop)}>
      <div className="grid__inner" style={{ height: rows * rowH }}>{items}</div>
    </div>
  )
}
