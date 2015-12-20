import { EventEmitter } from 'events'

class HTML5Video extends EventEmitter {

  static POLL_FREQUENCY = 1000
  get POLL_FREQUENCY() { return HTML5Video.POLL_FREQUENCY }

  constructor(controller) {
    super()
    this.controller = controller
  }

  enable() {
    // nothing
  }

  disable() {
    this.stop()
  }

  load(file, stream, autoPlay = false, currentTime = 0) {
    this.stop()
    const src = document.createElement('source')
    src.setAttribute('src', stream)
    this.element.appendChild(src)
    this.element.load()
    this.element.currentTime = currentTime
    if (autoPlay) {
      this.element.play()
    }
  }

  resume() {
    this.element.play()
  }

  pause() {
    this.element.pause()
  }

  stop() {
    this.element.pause()
    this.element.load()
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild)
    }
  }

  setElement(el) {
    this.element = el
  }

  seekToSecond(second) {
    this.element.currentTime = second
  }

  duration() {
    return this.element.duration || 0
  }

  currentTime() {
    return this.element.currentTime || 0
  }

  buffered() {
    return this.element.buffered
  }

}

module.exports = HTML5Video
