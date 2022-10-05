import { defu } from 'defu'
import fs from 'fs-extra'
import { dirname, join } from 'pathe'
import { nanoid } from 'nanoid'
import { fileURLToPath } from 'node:url'
import { electron } from './electron.js'

const { app, BrowserWindow, screen, shell } = electron

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface CreateWindowOptions {
  /**
   * Used to restore a previous window.
   */
  state?: WindowState
}

export interface WindowState {
  id: string
  x?: number
  y?: number
  width?: number
  height?: number
  closed: boolean
}

function getDefaultWindowOptions (): Omit<CreateWindowOptions, 'id'> {
  const primaryDisplaySize = screen.getPrimaryDisplay().size
  return {
    state: {
      id: nanoid(),
      closed: false,
      x: 0,
      y: 0,
      width: primaryDisplaySize.width,
      height: primaryDisplaySize.height,
    },
  }
}

function getWindowStateFolder () {
  return join(app.getPath('userData'), 'window-state')
}

function saveWindowState (state: WindowState) {
  const filePath = join(getWindowStateFolder(), `${state.id}.json`)
  fs.ensureDirSync(getWindowStateFolder())
  fs.writeJSONSync(filePath, state)
  return state
}

export async function createWindow (options?: CreateWindowOptions) {
  const finalOptions = defu(options ?? {}, getDefaultWindowOptions())

  const preload = join(__dirname, '../preload/index.js')
  const url = process.env.VITE_DEV_SERVER_URL
  const indexHtml = join(process.env.DIST, 'index.html')

  const win = new BrowserWindow({
    title: 'Web browser',
    minWidth: 300,
    minHeight: 300,
    x: finalOptions.state.x,
    y: finalOptions.state.y,
    width: finalOptions.state.width,
    height: finalOptions.state.height,
    icon: join(process.env.PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (app.isPackaged) {
    win.loadFile(indexHtml)
  } else {
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  }

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    // @TODO open new  web view
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  let state: WindowState = {
    ...finalOptions.state,
    closed: false,
  }

  win.addListener('move', () => {
    const [x, y] = win.getPosition()
    state = saveWindowState({
      ...state,
      x,
      y,
    })
  })

  win.addListener('resize', () => {
    const [width, height] = win.getSize()
    state = saveWindowState({
      ...state,
      width,
      height,
    })
  })

  win.addListener('close', () => {
    // @TODO differenciate between close and quit
    // state = saveWindowState({
    //   ...state,
    //   closed: true,
    // })
  })

  return win
}

async function loadWindowStates (): Promise<WindowState[]> {
  const folder = getWindowStateFolder()
  if (fs.existsSync(folder)) {
    const files = await fs.readdir(folder)
    return Promise.all(files.map((file) => {
      const filePath = join(folder, file)
      return fs.readJSON(filePath)
    }))
  }
  return []
}

export async function restoreWindows () {
  const windowStates = await loadWindowStates()

  await Promise.all(windowStates.map(async (state) => {
    if (!state.closed) {
      await createWindow({ state })
    }
  }))
  if (!windowStates.some(w => !w.closed)) {
    await createWindow()
  }
}
