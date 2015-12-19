import electron from 'electron'

const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipc = electron.ipcMain

electron.crashReporter.start()

let win = null

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('ready', () => {
  win = new BrowserWindow({
    title: 'playback',
    width: 860,
    height: 470
  })
  win.loadURL('file://' + __dirname + '/front/index.html#' + JSON.stringify(process.argv.slice(2)))
  win.webContents.openDevTools()
  win.on('closed', () => {
    win = null
  })
})

ipc.on('fullscreen', (value = true) => {
  win.setFullScreen(value)
})

ipc.on('focus', function () {
  win.focus()
})

ipc.on('minimize', function () {
  win.minimize()
})

ipc.on('maximize', function () {
  win.maximize()
})

ipc.on('resize', function (e, message) {
  if (win.isMaximized()) return
  const wid = win.getSize()[0]
  const hei = (wid / message.ratio) | 0
  win.setSize(wid, hei)
})
