#!/usr/bin/env atom-shell

var app = require('app')
var BrowserWindow = require('browser-window')
var path = require('path')
var ipc = require('ipc')

app.on('ready', function () {
  var win = new BrowserWindow({
    title: 'playback',
    width: 600,
    height: 352,
    frame: false,
    show: false,
    'always-on-top': true
  })

  win.loadUrl('file://' + path.join(__dirname, 'index.html#' + JSON.stringify(process.argv.slice(2))))

  ipc.on('metadata', function (e, message) {
    var wid = win.getSize()[0]
    var hei = (wid / message.ratio) | 0
    win.setSize(wid, hei)
  })

  ipc.on('ready', function () {
    win.show()
  })
})