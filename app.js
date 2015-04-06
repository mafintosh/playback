#!/usr/bin/env atom-shell

var app = require('app')
var BrowserWindow = require('browser-window')
var path = require('path')
var ipc = require('ipc')

var win
var link
var ready = false

app.on('open-url', function (e, lnk) {
  e.preventDefault()

  if (ready) {
    win.send('add-to-playlist', lnk)
    return
  }

  link = lnk
})

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

  ipc.on('minimize', function () {
    win.minimize()
  })

  ipc.on('maximize', function () {
    win.maximize()
  })

  ipc.on('resize', function (e, message) {
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
    if (link) win.send('add-to-playlist', link)
    win.show()
  })
})