/* Jeu en cours : lancement, mise en pause de l'interface pendant le jeu, son de lancement */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { RunningGame } from '@shared/ipc'
import type { Game } from '@shared/types'
import { api } from '../api'
import { play } from '../nav/sounds'

interface Ctx {
  running: RunningGame | null
  error: string
  launch: (g: Game) => Promise<void>
  stop: () => void
  clearError: () => void
}

const SessionCtx = createContext<Ctx>(null!)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState<RunningGame | null>(null)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(true)
  useEffect(() => {
    api['session:get']().then(setRunning)
    const off = api.on('session:state', (s) => setRunning(s.running))
    const f = () => setFocused(true), b = () => setFocused(false)
    addEventListener('focus', f)
    addEventListener('blur', b)
    return () => { off(); removeEventListener('focus', f); removeEventListener('blur', b) }
  }, [])
  // pendant un jeu, et tant que le launcher n'est pas au premier plan : animations, vidéo et orbe en pause
  useEffect(() => {
    const root = document.documentElement
    if (running && !focused) root.dataset.paused = ''
    else delete root.dataset.paused
  }, [running, focused])
  const launch = useCallback(async (g: Game) => {
    play('launch')
    try { await api['game:launch'](g.id) } catch (e) {
      play('error')
      setError(String((e as Error).message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''))
    }
  }, [])
  return <SessionCtx.Provider value={{ running, error, launch, stop: () => api['game:stop'](), clearError: () => setError('') }}>{children}</SessionCtx.Provider>
}

export const useSession = () => useContext(SessionCtx)
