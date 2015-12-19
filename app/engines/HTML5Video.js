import { EventEmitter } from 'events'

class HTML5Video extends EventEmitter {

  static POLL_FREQUENCY = 500
  get POLL_FREQUENCY() { return HTML5Video.POLL_FREQUENCY }

  constructor(controller) {
    super()
    this.controller = controller
    controller.on('update', this._update.bind(this))
  }

  _update(state) {
    if (state.stream && state.stream !== this.element.src) {
      this.element.src = state.stream
    }

    if (state.status === this.controller.STATUS_PLAYING) {
      this.element.play()
    } else {
      this.element.pause()
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
