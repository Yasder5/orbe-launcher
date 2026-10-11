import { describe, expect, it } from 'vitest'
import { findGameProcs } from '../src/main/launch/match'
import { splitArgs } from '../src/main/launch/session'

const procs = [
  { pid: 1, path: 'C:\\Program Files (x86)\\Steam\\steam.exe' },
  { pid: 2, path: 'D:\\SteamLibrary\\steamapps\\common\\Hollow Knight\\hollow_knight.exe' },
  { pid: 3, path: 'D:\\SteamLibrary\\steamapps\\common\\Hollow Knight\\UnityCrashHandler64.exe' },
  { pid: 4, path: 'D:\\SteamLibrary\\steamapps\\common\\Hollow Knight 2\\hk2.exe' }
]

describe('processus du jeu', () => {
  it('trouve l’exe dans le dossier, sans les outils ni un dossier voisin', () => {
    expect(findGameProcs(procs, { installDir: 'D:\\SteamLibrary\\steamapps\\common\\Hollow Knight' }).map((p) => p.pid)).toEqual([2])
    expect(findGameProcs(procs, { installDir: 'd:/steamlibrary/steamapps/common/hollow knight/' }).map((p) => p.pid)).toEqual([2])
  })
  it("reconnaît l'exe exact même hors du dossier", () => {
    expect(findGameProcs(procs, { exe: 'C:\\Program Files (x86)\\Steam\\steam.exe' }).map((p) => p.pid)).toEqual([1])
  })
  it('ignore le launcher lui-même', () => {
    expect(findGameProcs(procs, { installDir: 'C:\\Program Files (x86)\\Steam', selfPid: 1 })).toEqual([])
  })
})

describe('arguments', () => {
  it('respecte les guillemets', () => {
    expect(splitArgs('-windowed "C:\\Mon Dossier\\cfg.ini" -w 1920')).toEqual(['-windowed', 'C:\\Mon Dossier\\cfg.ini', '-w', '1920'])
    expect(splitArgs(undefined)).toEqual([])
  })
})
