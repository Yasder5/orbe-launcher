/* Epic Games : manifestes JSON *.item dans ProgramData, lancement par le protocole du launcher Epic. */
import { win32 as path } from 'node:path'
import type { Scanner, ScannedGame } from './types'

interface EpicItem {
  DisplayName?: string
  InstallLocation?: string
  LaunchExecutable?: string
  LaunchCommand?: string
  CatalogNamespace?: string
  CatalogItemId?: string
  AppName?: string
  MainGameAppName?: string
  bIsIncompleteInstall?: boolean
  bIsApplication?: boolean
  AppCategories?: string[]
}

export function parseEpicItem(json: string): ScannedGame | null {
  const it = JSON.parse(json) as EpicItem
  if (!it.AppName || !it.DisplayName || !it.CatalogNamespace || !it.CatalogItemId) return null
  if (it.MainGameAppName && it.MainGameAppName !== it.AppName) return null // DLC
  const cats = it.AppCategories ?? []
  if (cats.length && !cats.includes('games')) return null // Unreal Engine, plugins…
  const id = `${it.CatalogNamespace}:${it.CatalogItemId}:${it.AppName}`
  return {
    platform: 'epic',
    platformId: it.AppName,
    name: it.DisplayName,
    installDir: it.InstallLocation ? path.normalize(it.InstallLocation) : undefined,
    exe: it.InstallLocation && it.LaunchExecutable ? path.join(it.InstallLocation, it.LaunchExecutable) : undefined,
    launchUri: `com.epicgames.launcher://apps/${encodeURIComponent(id)}?action=launch&silent=true`,
    installed: !it.bIsIncompleteInstall
  }
}

export const epic: Scanner = {
  id: 'epic',
  name: 'Epic Games',
  async scan(env) {
    const dir = path.join(env.programData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')
    const out: ScannedGame[] = []
    for (const f of env.list(dir)) {
      if (!f.toLowerCase().endsWith('.item')) continue
      try {
        const g = parseEpicItem(env.readText(path.join(dir, f)))
        if (g) out.push(g)
      } catch {
        /* manifeste illisible : on passe au suivant */
      }
    }
    return out
  }
}
