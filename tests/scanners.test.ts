import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseInstallerData } from '../src/main/scanners/ea'
import { parseEpicItem } from '../src/main/scanners/epic'
import { gogFromReg } from '../src/main/scanners/gog'
import { runScanners } from '../src/main/scanners/index'
import { parseReg } from '../src/main/scanners/reg'
import { libraryPaths, parseManifest, steam } from '../src/main/scanners/steam'
import type { ScanEnv, Scanner } from '../src/main/scanners/types'
import { ubisoftFromReg, UBI_KEY } from '../src/main/scanners/ubisoft'
import { parseVdf } from '../src/main/scanners/vdf'
import { DEFAULT_SETTINGS } from '../src/shared/types'

const fx = (f: string) => readFileSync(join(__dirname, 'fixtures', f), 'utf8')

describe('VDF', () => {
  it('lit objets imbriqués, échappements et commentaires', () => {
    const v = parseVdf(fx('appmanifest_367520.acf')) as any
    expect(v.AppState.name).toBe('Hollow Knight')
    expect(v.AppState.UserConfig.language).toBe('french')
    expect((parseVdf('"a" { "p" "C:\\\\x\\"y" }') as any).a.p).toBe('C:\\x"y')
  })
})

describe('Steam', () => {
  it('trouve toutes les bibliothèques (nouveau et ancien format)', () => {
    expect(libraryPaths(fx('libraryfolders.vdf'), 'C:\\Program Files (x86)\\Steam')).toEqual(['C:\\Program Files (x86)\\Steam', 'D:\\SteamLibrary'])
    expect(libraryPaths('"LibraryFolders" { "TimeNextStatsReport" "1" "1" "E:\\\\Jeux" }', 'C:\\Steam')).toEqual(['C:\\Steam', 'E:\\Jeux'])
  })
  it('lit un manifeste et ignore les outils', () => {
    expect(parseManifest(fx('appmanifest_367520.acf'), 'D:\\SteamLibrary')).toMatchObject({
      platformId: '367520', name: 'Hollow Knight', installDir: 'D:\\SteamLibrary\\steamapps\\common\\Hollow Knight', launchUri: 'steam://rungameid/367520', installed: true
    })
    expect(parseManifest('"AppState" { "appid" "228980" "name" "Steamworks Common Redistributables" }', 'C:\\')).toBeNull()
    expect(parseManifest('"AppState" { "appid" "1" "name" "Jeu" "StateFlags" "1026" }', 'C:\\')?.installed).toBe(false)
  })
  it('scan complet sur un faux disque', async () => {
    const files: Record<string, string> = {
      'C:\\Steam\\steamapps\\libraryfolders.vdf': '"libraryfolders" { "0" { "path" "C:\\\\Steam" } "1" { "path" "D:\\\\Lib" } }',
      'C:\\Steam\\steamapps\\appmanifest_367520.acf': fx('appmanifest_367520.acf'),
      'D:\\Lib\\steamapps\\appmanifest_620.acf': '"AppState" { "appid" "620" "name" "Portal 2" "StateFlags" "4" "installdir" "Portal 2" }'
    }
    const env: ScanEnv = {
      programData: 'C:\\ProgramData',
      reg: async (k) => new Map(k.startsWith('HKCU') ? [[k.toUpperCase(), { SteamPath: 'C:/Steam' }]] : []),
      exists: (p) => p in files,
      readText: (p) => files[p],
      list: (d) => Object.keys(files).filter((f) => f.startsWith(d + '\\')).map((f) => f.slice(d.length + 1))
    }
    expect((await steam.scan(env)).map((g) => g.name).sort()).toEqual(['Hollow Knight', 'Portal 2'])
  })
})

describe('Epic', () => {
  it('lit un manifeste .item', () => {
    expect(parseEpicItem(fx('epic.item'))).toMatchObject({
      platformId: 'Bison', name: 'Outer Wilds',
      exe: 'C:\\Program Files\\Epic Games\\OuterWilds\\Binaries\\Win64\\Game.exe',
      launchUri: 'com.epicgames.launcher://apps/ns123%3Aitem456%3ABison?action=launch&silent=true'
    })
  })
  it('ignore DLC et applications', () => {
    expect(parseEpicItem(JSON.stringify({ ...JSON.parse(fx('epic.item')), MainGameAppName: 'Autre' }))).toBeNull()
    expect(parseEpicItem(JSON.stringify({ ...JSON.parse(fx('epic.item')), AppCategories: ['engines'] }))).toBeNull()
  })
})

describe('registre', () => {
  it('parse la sortie de reg query', () => {
    const m = parseReg(fx('gog-reg.txt'))
    expect(m.get('HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432NODE\\GOG.COM\\GAMES\\1207658924')?.gameName).toBe('The Witcher 3: Wild Hunt')
    expect(m.get('HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432NODE\\GOG.COM\\GAMES\\1207658924')?.launchParam).toBe('')
  })
  it('GOG : jeux sans DLC ni sous-clés', () => {
    const g = gogFromReg(parseReg(fx('gog-reg.txt')))
    expect(g).toHaveLength(1)
    expect(g[0]).toMatchObject({ platformId: '1207658924', exe: 'D:\\GOG Games\\The Witcher 3\\bin\\x64\\witcher3.exe', args: undefined })
  })
  it('Ubisoft : nom tiré du dossier', () => {
    const m = parseReg(`${UBI_KEY}\\635\r\n    InstallDir    REG_SZ    C:/Program Files (x86)/Ubisoft/Ubisoft Game Launcher/games/Assassin's Creed Origins/\r\n`)
    expect(ubisoftFromReg(m)[0]).toMatchObject({ name: "Assassin's Creed Origins", launchUri: 'uplay://launch/635/0' })
  })
  it('EA : exe et titre depuis installerdata.xml', () => {
    expect(parseInstallerData(fx('installerdata.xml'))).toEqual({ exe: 'Game\\Launcher\\MassEffectLauncher.exe', title: 'Mass Effect Legendary Edition', id: 'Origin.OFR.50.0004012' })
  })
})

describe('runScanners', () => {
  it('isole un scanner en échec et ignore les désactivés', async () => {
    const ok: Scanner = { id: 'steam', name: 'ok', scan: async () => [{ platform: 'steam', platformId: '1', name: 'A' }] }
    const ko: Scanner = { id: 'epic', name: 'ko', scan: async () => { throw new Error('boum') } }
    const off: Scanner = { id: 'gog', name: 'off', scan: async () => [{ platform: 'gog', platformId: '2', name: 'B' }] }
    const r = await runScanners({ ...DEFAULT_SETTINGS, scanners: { ...DEFAULT_SETTINGS.scanners, gog: false } }, {} as ScanEnv, [ok, ko, off])
    expect(r.ok.steam).toHaveLength(1)
    expect(r.failed).toEqual(['epic'])
    expect(r.ok.gog).toBeUndefined()
  })
})

import { mainExe } from '../src/main/scanners/folder'

describe('dossiers de jeux', () => {
  it("prend le plus gros exe qui n'est pas un outil", () => {
    const tree: Record<string, string[]> = {
      'D:\\Jeux\\Celeste': ['Celeste.exe', 'unins000.exe', 'Content'],
      'D:\\Jeux\\Celeste\\Content': ['Big.exe', 'Crash_Reporter.exe'],
      'D:\\Jeux\\Vide': ['readme.txt']
    }
    const env = { list: (d: string) => tree[d] ?? [] } as unknown as ScanEnv
    const sizes: Record<string, number> = { 'D:\\Jeux\\Celeste\\Celeste.exe': 50, 'D:\\Jeux\\Celeste\\unins000.exe': 900, 'D:\\Jeux\\Celeste\\Content\\Big.exe': 60, 'D:\\Jeux\\Celeste\\Content\\Crash_Reporter.exe': 999 }
    expect(mainExe(env, 'D:\\Jeux\\Celeste', (p) => sizes[p] ?? 0)).toBe('D:\\Jeux\\Celeste\\Content\\Big.exe')
    expect(mainExe(env, 'D:\\Jeux\\Vide', () => 0)).toBeNull()
  })
})
