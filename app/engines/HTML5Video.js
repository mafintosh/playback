import { EventEmitter } from 'events'

class HTML5Video extends EventEmitter {

  get POLL_FREQUENCY() { return 250 }

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
    return this.element.duration
  }

  currentTime() {
    return this.element.currentTime
  }

}

module.exports = HTML5Video
