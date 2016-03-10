'use strict'

const electron = require('electron')
const app = electron.app
const dialog = electron.dialog
const BrowserWindow = electron.BrowserWindow
const powerSaveBlocker = electron.powerSaveBlocker
const globalShortcut = electron.globalShortcut
const shell = electron.shell
const Menu = electron.Menu
const MenuItem = electron.MenuItem
const ipc = electron.ipcMain

const path = require('path')

const minimist = require('minimist')
const clipboard = require('clipboard')
const Controller = require('./Controller')

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
      frame: process.platform !== 'darwin',
      width: 860,
      height: 470
    })

    win.loadURL(path.join('file://', __dirname, '/front/index.html#', encodeURIComponent(serverPath)))
    win.on('closed', () => {
      win = null
    })

    // Client loaded
    ipc.on('clientReady', () => {
      controller.setPlayer(argv.player || controller.PLAYER_HTML)
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
    ipc.on('showContextMenu', () => {
      const menu = new Menu()

      menu.append(new MenuItem({
        label: 'Always on top',
        type: 'checkbox',
        checked: win.isAlwaysOnTop(),
        click: () => win.setAlwaysOnTop(!win.isAlwaysOnTop())
      }))

      menu.append(new MenuItem({
        label: 'Paste link from clipboard',
        click: () => controller.loadFiles(clipboard.readText().split('\n'))
      }))

      menu.append(new MenuItem({
        label: 'Toggle subtitles',
        click: () => controller.toggleSubtitles()
      }))

      menu.popup(win)
    })

    // Prevent/allow computer sleep
    controller.on('preventSleep', () => preventSleep())
    controller.on('allowSleep', () => allowSleep())

    // Media keybaord shortcut handlers
    globalShortcut.register('mediaplaypause', () => controller.togglePlay())
    globalShortcut.register('medianexttrack', () => controller.next())
    globalShortcut.register('mediaprevioustrack', () => controller.previous())

    // Remote IPC send
    controller.REMOTE_SEND.forEach((f) => {
      controller.on(f, function () {
        const newArgs = [f, controller.state.player].concat(Array.prototype.slice.call(arguments))
        console.log(`Sending ipc event '${f}'`)
        win.webContents.send.apply(win.webContents, newArgs)
      })
    })

    // Remote IPC Receive
    controller.REMOTE_RECEIVE.forEach((f) => {
      ipc.on(f, function (sender) {
        console.log(`Received ipc event '${f}'`)
        controller[f].apply(controller, Array.prototype.slice.call(arguments, 1))
      })
    })

    // Build app menu
    const menuTemplate = [{
      label: 'Playback',
      submenu: [{
        label: 'About Playback',
        click () {
          shell.openExternal('https://mafintosh.github.io/playback/')
        }
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click () {
          app.quit()
        }
      }]
    }, {
      label: 'File',
      submenu: [{
        label: 'Add media',
        accelerator: 'Command+O',
        click () {
          controller.openFileDialog()
        }
      }, {
        label: 'Add link from clipboard',
        accelerator: 'CommandOrControl+V',
        click () {
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
        click () {
          win.webContents.openDevTools()
        }
      }]
    }, {
      label: 'Help',
      submenu: [{
        label: 'Report Issue',
        click () {
          shell.openExternal('https://github.com/mafintosh/playback/issues')
        }
      }, {
        label: 'View Source Code on GitHub',
        click () {
          shell.openExternal('https://github.com/mafintosh/playback')
        }
      }, {
        type: 'separator'
      }, {
        label: 'Releases',
        click () {
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
