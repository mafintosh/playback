import {
  app,
  dialog,
  BrowserWindow,
  powerSaveBlocker,
  globalShortcut,
  shell,
  Menu,
  ipcMain as ipc
} from 'electron'
import minimist from 'minimist'
import clipboard from 'clipboard'
import Controller from './Controller'

const argv = minimist(process.argv.slice(2), {
  alias: { follow: 'f', player: 'p' },
  string: ['player'],
  boolean: ['follow']
})

const argURIs = argv._

const allowSleep = () => {
  if (typeof app.sleepId !== 'undefined') {
    powerSaveBlocker.stop(app.sleepId)
    delete app.sleepId
  }
}

const preventSleep = () => {
  if (typeof app.sleepId === 'undefined') {
    app.sleepId = powerSaveBlocker.start('prevent-display-sleep')
  }
}

app.on('ready', () => {
  let win

  const controller = new Controller(argv.follow)

  controller.on('ready', (serverPath) => {
    win = new BrowserWindow({
      title: 'playback',
      frame: false,
      width: 860,
      height: 470
    })

    win.loadURL('file://' + __dirname + '/front/index.html#' + encodeURIComponent(serverPath))
    win.on('closed', () => win = null)

    // Client loaded
    ipc.on('clientReady', () => {
      controller.setPlayer(argv.player || controller.PLAYER_WEBCHIMERA)
      if (argURIs.length) {
        controller.loadFiles(argURIs)
      }
    })

    controller.on('openFileDialog', () => {
      dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] }, (files) => {
        if (files) controller.loadFiles(files)
      })
    })

    // Window controls
    ipc.on('close', () => win.close())
    ipc.on('minimize', () => win.minimize())
    ipc.on('maximize', () => win.maximize())

    // Prevent/allow computer sleep
    controller.on('preventSleep', () => preventSleep())
    controller.on('allowSleep', () => allowSleep())

    // Media keybaord shortcut handlers
    globalShortcut.register('mediaplaypause', () => controller.togglePlay())
    globalShortcut.register('medianexttrack', () => controller.next())
    globalShortcut.register('mediaprevioustrack', () => controller.previous())

    // Remote IPC send
    controller.REMOTE_SEND.forEach(f => {
      controller.on(f, (...args) => {
        const newArgs = [controller.state.player].concat(args)
        console.log(`Sending ipc event '${f}'`)
        win.webContents.send(f, ...newArgs)
      })
    })

    // Remote IPC Receive
    controller.REMOTE_RECEIVE.forEach(f => {
      ipc.on(f, (sender, ...args) => {
        console.log(`Received ipc event '${f}'`)
        controller[f].apply(controller, args)
      })
    })

    // Build app menu
    const menuTemplate = [{
      label: 'Playback',
      submenu: [{
        label: 'About Playback',
        click() {
          shell.openExternal('https://mafintosh.github.io/playback/')
        }
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() {
          app.quit()
        }
      }]
    }, {
      label: 'File',
      submenu: [{
        label: 'Add media',
        accelerator: 'Command+O',
        click() {
          controller.openFileDialog()
        }
      }, {
        label: 'Add link from clipboard',
        accelerator: 'CommandOrControl+V',
        click() {
          controller.loadFiles(clipboard.readText().split('\n'))
        }
      }]
    }, {
      label: 'Window',
      submenu: [{
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      }, {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      }, {
        type: 'separator'
      }, {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click() {
          win.webContents.openDevTools()
        }
      }]
    }, {
      label: 'Help',
      submenu: [{
        label: 'Report Issue',
        click() {
          shell.openExternal('https://github.com/mafintosh/playback/issues')
        }
      }, {
        label: 'View Source Code on GitHub',
        click() {
          shell.openExternal('https://github.com/mafintosh/playback')
        }
      }, {
        type: 'separator'
      }, {
        label: 'Releases',
        click() {
          shell.openExternal('https://github.com/mafintosh/playback/releases')
        }
      }]
    }]

    const appMenu = Menu.buildFromTemplate(menuTemplate)
    Menu.setApplicationMenu(appMenu)
  })
})

app.on('window-all-closed', () => app.quit())
app.on('will-quit', () => allowSleep())
