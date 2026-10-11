/* Manettes Xbox (XInput) lues par le processus principal : marche même quand le launcher est en arrière-plan.
   Bouton Guide via XInputGetStateEx (ordinal 100, non documenté mais stable) ; sinon combo Back + Start. */
import { createRequire } from 'node:module'
import { log } from '../log'

const L = log('xinput')
const GUIDE = 0x0400, BACK = 0x0020, START = 0x0010

export function watchGuide(onHold: () => void, holdMs = 800): () => void {
  if (process.platform !== 'win32') return () => {}
  let getState: ((i: number, s: { Gamepad?: { wButtons: number } }) => number) | null = null
  try {
    const koffi = createRequire(__filename)('koffi') as typeof import('koffi')
    const GAMEPAD = koffi.struct('XINPUT_GAMEPAD', { wButtons: 'uint16_t', bLeftTrigger: 'uint8_t', bRightTrigger: 'uint8_t', sThumbLX: 'int16_t', sThumbLY: 'int16_t', sThumbRX: 'int16_t', sThumbRY: 'int16_t' })
    const STATE = koffi.struct('XINPUT_STATE', { dwPacketNumber: 'uint32_t', Gamepad: GAMEPAD })
    const lib = koffi.load('xinput1_4.dll')
    try {
      getState = lib.func('__stdcall', 100, 'uint32_t', ['uint32_t', koffi.out(koffi.pointer(STATE))]) // XInputGetStateEx
    } catch {
      getState = lib.func('__stdcall', 'XInputGetState', 'uint32_t', ['uint32_t', koffi.out(koffi.pointer(STATE))])
    }
  } catch (e) {
    L.warn('XInput indisponible', e)
    return () => {}
  }
  let since = 0, fired = false
  const t = setInterval(() => {
    let held = false
    for (let i = 0; i < 4; i++) {
      const s: { Gamepad?: { wButtons: number } } = {}
      if (getState!(i, s) !== 0) continue // manette absente
      const b = s.Gamepad?.wButtons ?? 0
      if (b & GUIDE || (b & BACK && b & START)) held = true
    }
    const now = Date.now()
    if (!held) { since = 0; fired = false; return }
    if (!since) since = now
    if (!fired && now - since >= holdMs) { fired = true; onHold() }
  }, 100)
  return () => clearInterval(t)
}
