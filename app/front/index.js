'use strict'

const UI = require('./UI.jsx')
const ipc = require('electron').ipcRenderer

// Wrap ipc in a simplified EventEmitter api.
// This is done so that we can eventually swap between a
// ipc or a websocket connection for remote control
const emitter = {
  on (channel, cb) {
    ipc.on(channel, function (sender) {
      cb.apply(null, Array.prototype.slice.call(arguments, 1))
    })
  },
  emit: ipc.send
}

UI.init(emitter, () => {
  emitter.emit('clientReady')
})
