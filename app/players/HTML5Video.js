import { EventEmitter } from 'events'

class HTML5Video extends EventEmitter {

  static POLL_FREQUENCY = 1000
  get POLL_FREQUENCY() { return HTML5Video.POLL_FREQUENCY }

  constructor(controller) {
    super()
    this.controller = controller
  }

  enable() {
    // TODO: Pass in video el
  }

  disable() {
    this.stop()
  }

  load(file, stream, autoPlay = false, currentTime = 0) {
    this.stop()

    const el = this.element
    const src = document.createElement('source')
    src.setAttribute('src', stream)
    el.appendChild(src)
    el.load()
    el.currentTime = currentTime

    if (autoPlay) {
      this._startPolling()
      el.play()
    }
  }

  _startPolling() {
    this._stopPolling()
    this.interval = setInterval(() => {
      this.emit('status', {
        currentTime: this.element.currentTime,
        buffered: this.element.buffered
      })
    }, this.POLL_FREQUENCY)
  }

  _stopPolling() {
    clearInterval(this.interval)
  }

  resume() {
    this._startPolling()
    this.element.play()
  }

  pause() {
    this._stopPolling()
    this.element.pause()
  }

  stop() {
    this._stopPolling()
    this.element.pause()
    this.element.load()
    this.element.innerHTML = ''
  }

  seekToSecond(second) {
    this.element.currentTime = second
  }

  setElement(el) {
    this.element = el

    el.addEventListener('loadedmetadata', () => {
      this.emit('metadata', {
        duration: el.duration,
        height: el.videoHeight,
        width: el.videoWidth
      })
    })

    el.addEventListener('ended', () => {
      this._stopPolling()
      this.emit('end')
    })
  }

}

module.exports = HTML5Video
