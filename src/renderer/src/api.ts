/* Accès à l'API du processus principal. Hors Electron (aperçu navigateur), une maquette en mémoire prend le relais. */
import type { OrbeApi } from '@shared/ipc'
import { mock } from './dev/mock'

declare global {
  interface Window {
    orbe?: OrbeApi
  }
}

export const api: OrbeApi = window.orbe ?? mock
export const isMock = !window.orbe
