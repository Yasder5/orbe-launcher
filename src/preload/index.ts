import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('orbe', { version: process.versions.electron })
