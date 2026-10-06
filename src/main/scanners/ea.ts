/* EA app (et anciens jeux Origin) : dossiers d'installation dans le registre ; l'exe vient de
   __Installer\installerdata.xml (<filePath>[clé]\jeu.exe</filePath>). Lancement direct : l'EA app prend le relais pour les DRM. */
import { win32 as path } from 'node:path'
import { children } from './reg'
import type { Scanner, ScanEnv, ScannedGame } from './types'

export const EA_KEYS = ['HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\EA Games', 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Origin Games']

/* Exécutable et titre dans installerdata.xml */
export function parseInstallerData(xml: string): { exe?: string; title?: string; id?: string } {
  const fp = xml.match(/<runtime>[\s\S]*?<filePath>([^<]+)<\/filePath>/i)?.[1]
  const exe = fp?.replace(/^\[[^\]]*\]/, '').replace(/^[\\/]+/, '').trim()
  // titre anglais en priorité : c'est sous ce nom que les jaquettes sont trouvées
  const title = xml.match(/<gameTitle[^>]*locale="en_US"[^>]*>([^<]+)</i)?.[1] ?? xml.match(/<gameTitle[^>]*>([^<]+)</i)?.[1]
  const id = xml.match(/<contentID>([^<]+)<\/contentID>/i)?.[1]
  return { exe: exe || undefined, title: title?.trim(), id: id?.trim() }
}

export async function eaGames(env: ScanEnv): Promise<ScannedGame[]> {
  const out: ScannedGame[] = []
  for (const key of EA_KEYS) {
    for (const [sub, v] of children(await env.reg(key), key)) {
      const dir = v['Install Dir'] ?? v.InstallDir
      if (!dir) continue
      const base = path.normalize(dir)
      const xml = path.join(base, '__Installer', 'installerdata.xml')
      const info = env.exists(xml) ? parseInstallerData(env.readText(xml)) : {}
      const exe = info.exe ? path.join(base, info.exe) : undefined
      if (!exe || !env.exists(exe)) continue // sans exe fiable on ne propose pas le jeu
      out.push({ platform: 'ea', platformId: info.id ?? sub, name: v.DisplayName ?? info.title ?? sub, installDir: base, exe, workDir: path.dirname(exe), installed: true })
    }
  }
  return out
}

export const ea: Scanner = { id: 'ea', name: 'EA app', scan: eaGames }
