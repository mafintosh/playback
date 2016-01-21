import UI from './UI.jsx'
import { ipcRenderer as ipc } from 'electron'

// Wrap ipc in a simplified EventEmitter api.
// This is done so that we can eventually swap between a
// ipc or a websocket connection for remote control
const emitter = {
  on(channel, cb) {
    ipc.on(channel, (sender, ...args) => {
      cb(...args)
    })
  },
  emit: ipc.send
}

UI.init(emitter, () => {
  emitter.emit('clientReady')
})
