import UI from './UI.jsx'
import { ipcRenderer as ipc } from 'electron'

const emitter = {}

emitter.on = (channel, cb) => {
  ipc.on(channel, (sender, ...args) => {
    cb(...args)
  })
}
emitter.emit = ipc.send

UI.init(emitter, () => {
  emitter.emit('clientReady')
})
