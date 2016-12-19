#!/usr/bin/env electron

const 
    path = require('path'),
    { app, BrowserWindow, dialog, ipcMain, powerSaveBlocker, globalShortcut, shell } = require('electron');

var ipc = ipcMain
var win
var link
var ready = false

var onopen = function (e, lnk) {
  e.preventDefault()

  if (ready) {
    win.send('add-to-playlist', [].concat(lnk))
    return
  }

  link = lnk
}

app.on('open-file', onopen)
app.on('open-url', onopen)

app.on('ready', function () {

  win = new BrowserWindow({
    title: 'playback',
    width: 860,
    height: 470,
    frame: false,
    show: false,
    transparent: true
  })

  win.loadURL('file://' + path.join(__dirname, 'index.html#' + JSON.stringify(process.argv.slice(2))))

  ipc.on('close', function () {
    app.quit()
  })

  ipc.on('open-file-dialog', function () {
    var files = dialog.showOpenDialog({ properties: [ 'openFile', 'multiSelections' ]})
    if (files) {
      files.forEach(app.addRecentDocument)
      win.send('add-to-playlist', files)
    }
  })

  ipc.on('open-url-in-external', function (event, url) {
    shell.openExternal(url)
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
    var wid = win.getSize()[0]
    var hei = (wid / message.ratio) | 0
    win.setSize(wid, hei)
  })

  ipc.on('enter-full-screen', function () {
    win.setFullScreen(true)
  })

  ipc.on('exit-full-screen', function () {
    win.setFullScreen(false)
    win.show()
  })

  ipc.on('ready', function () {
    ready = true
    if (link) win.send('add-to-playlist', [].concat(link))
    win.show()
  })

  ipc.on('prevent-sleep', function () {
    app.sleepId = powerSaveBlocker.start('prevent-display-sleep')
  })

  ipc.on('allow-sleep', function () {
    powerSaveBlocker.stop(app.sleepId)
  })

  globalShortcut.register('MediaPlayPause', function () {
    win.send('media-play-pause')
  })

  globalShortcut.register('MediaNextTrack', function () {
    win.send('media-next-track')
  })

  globalShortcut.register('MediaPreviousTrack', function () {
    win.send('media-previous-track')
  })

})

app.on('will-quit', function () {

  globalShortcut.unregisterAll()

})
