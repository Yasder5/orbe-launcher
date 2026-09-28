/* Pont sécurisé : expose uniquement les canaux du contrat, rien de Node. */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { CHANNELS, EVENTS, type EventName } from '../shared/ipc'

const api: Record<string, unknown> = Object.fromEntries(CHANNELS.map((c) => [c, (...args: unknown[]) => ipcRenderer.invoke(c, ...args)]))

api.on = (event: EventName, cb: (payload: unknown) => void) => {
  if (!(EVENTS as readonly string[]).includes(event)) throw new Error('événement inconnu')
  const listener = (_e: IpcRendererEvent, payload: unknown) => cb(payload)
  ipcRenderer.on(event, listener)
  return () => ipcRenderer.removeListener(event, listener)
}

contextBridge.exposeInMainWorld('orbe', api)
