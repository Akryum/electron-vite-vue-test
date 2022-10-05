// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
import { release } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'pathe'
import { electron } from './electron.js'
import { createWindow, restoreWindows } from './window.js'

const { app, BrowserWindow } = electron

const __dirname = dirname(fileURLToPath(import.meta.url))

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

app.whenReady().then(async () => {
  console.log('app ready')

  process.env.DIST_ELECTRON = join(__dirname, '..')
  process.env.DIST = join(process.env.DIST_ELECTRON, '../client')
  process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(process.env.DIST_ELECTRON, '../../public')

  await restoreWindows()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  createWindow()
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})
