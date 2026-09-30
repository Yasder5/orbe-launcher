/* Réglages partagés dans l'interface, synchronisés avec le processus principal. */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '@shared/types'
import { api } from '../api'

interface Ctx {
  settings: Settings
  ready: boolean
  update: (patch: Partial<Settings>) => Promise<void>
}

const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, ready: false, update: async () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    api['settings:get']().then((s) => { setSettings(s); setReady(true) })
    return api.on('settings:changed', setSettings)
  }, [])
  const update = useCallback(async (patch: Partial<Settings>) => setSettings(await api['settings:set'](patch)), [])
  return <SettingsCtx.Provider value={{ settings, ready, update }}>{children}</SettingsCtx.Provider>
}

export const useSettings = () => useContext(SettingsCtx)
