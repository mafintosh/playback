import {
  app,
  dialog,
  BrowserWindow,
  ipcMain as ipc,
  powerSaveBlocker,
  default as electron
} from 'electron'

electron.crashReporter.start()

let win

const allowSleep = () => {
  if (typeof app.sleepId !== 'undefined') {
    console.log('Allowing sleep')
    powerSaveBlocker.stop(app.sleepId)
    delete app.sleepId
  }
}

const preventSleep = () => {
  if (typeof app.sleepId === 'undefined') {
    console.log('Preventing sleep')
    app.sleepId = powerSaveBlocker.start('prevent-display-sleep')
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  allowSleep()
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

  win.on('enter-full-screen', () => {
    win.send('fullscreen-change', true)
  })

  win.on('leave-full-screen', () => {
    win.send('fullscreen-change', false)
  })
})

ipc.on('open-file-dialog', () => {
  const files = dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
  if (files) win.send('load-files', files)
})

ipc.on('toggle-fullscreen', () => {
  win.setFullScreen(!win.isFullScreen())
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

ipc.on('prevent-sleep', function () {
  preventSleep()
})

ipc.on('allow-sleep', function () {
  allowSleep()
})

ipc.on('resize', function (e, message) {
  if (win.isMaximized()) return
  const wid = win.getSize()[0]
  const hei = (wid / message.ratio) | 0
  win.setSize(wid, hei)
})
