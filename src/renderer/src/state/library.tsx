/* Bibliothèque côté interface : jeux, collections, état du scan. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ScanReport } from '@shared/ipc'
import type { Collection, Game } from '@shared/types'
import { api } from '../api'

interface Ctx {
  games: Game[] // visibles (non masqués)
  all: Game[]
  byId: Map<string, Game>
  collections: Collection[]
  scanning: boolean
  lastScan?: ScanReport
  rescan: () => void
  reloadCollections: () => Promise<void>
}

const LibCtx = createContext<Ctx>(null!)

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [all, setAll] = useState<Game[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<ScanReport>()
  const reloadCollections = useCallback(async () => setCollections([...(await api['collections:list']())]), [])
  useEffect(() => {
    api['library:list']().then((g) => setAll([...g]))
    reloadCollections()
    const a = api.on('library:changed', (g) => setAll([...g]))
    const b = api.on('scan:state', (s) => { setScanning(s.running); if (s.report) setLastScan(s.report) })
    return () => { a(); b() }
  }, [reloadCollections])
  const value = useMemo(() => {
    const games = all.filter((g) => !g.hidden)
    return { games, all, byId: new Map(all.map((g) => [g.id, g])), collections, scanning, lastScan, rescan: () => { api['library:rescan']() }, reloadCollections }
  }, [all, collections, scanning, lastScan, reloadCollections])
  return <LibCtx.Provider value={value}>{children}</LibCtx.Provider>
}

export const useLibrary = () => useContext(LibCtx)
