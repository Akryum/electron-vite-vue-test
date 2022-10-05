import { createRequire } from 'node:module'
import type * as Electron from 'electron'

const require = createRequire(import.meta.url)
export const electron = require('electron') as typeof Electron
