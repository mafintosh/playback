#!/usr/bin/env atom-shell

var app = require('app')
var BrowserWindow = require('browser-window')
var path = require('path')
var ipc = require('ipc')
var dialog = require('dialog')

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
    'always-on-top': true
  })

  win.loadUrl('file://' + path.join(__dirname, 'index.html#' + JSON.stringify(process.argv.slice(2))))

  ipc.on('close', function () {
    app.quit()
  })

  ipc.on('open-file-dialog', function () {
    var files = dialog.showOpenDialog({ properties: [ 'openFile', 'multiSelections' ]})
    win.send('add-to-playlist', files)
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
})