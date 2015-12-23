import { EventEmitter } from 'events'

class HTMLPlayer extends EventEmitter {

  static POLL_FREQUENCY = 1000
  get POLL_FREQUENCY() { return HTMLPlayer.POLL_FREQUENCY }

  constructor(controller) {
    super()
    this.controller = controller
    this._onMetadata = this._onMetadata.bind(this)
    this._onEnd = this._onEnd.bind(this)
  }

  enable(opts) {
    this.element = opts.element
    this.element.addEventListener('loadedmetadata', this._onMetadata)
    this.element.addEventListener('ended', this._onEnd)
  }

  disable() {
    this.stop()
    this.element.removeEventListener('loadedmetadata', this._onMetadata)
    this.element.removeEventListener('ended', this._onEnd)
    this.element = null
  }

  _onMetadata() {
    this.emit('metadata', {
      duration: this.element.duration,
      height: this.element.videoHeight,
      width: this.element.videoWidth
    })
  }

  _onEnd() {
    this._stopPolling()
    this.emit('end')
  }

  load(file, autoPlay = false, currentTime = 0, showSubtitles = false) {
    this.stop()

    const el = this.element
    const src = document.createElement('source')
    src.setAttribute('src', file.streamUrl)
    el.appendChild(src)
    el.load()
    el.currentTime = currentTime

    if (showSubtitles) {
      this.showSubtitles(file)
    }

    if (autoPlay) {
      el.play()
    }
  }

  showSubtitles(file) {
    if (this.element.querySelector('track')) {
      this.element.querySelector('track').mode = 'showing'
    } else {
      const track = document.createElement('track')
      track.setAttribute('default', 'default')
      track.setAttribute('src', file.subtitlesUrl)
      track.setAttribute('label', 'Subtitles')
      track.setAttribute('kind', 'subtitles')
      this.element.appendChild(track)
    }
  }

  hideSubtitles() {
    this.element.querySelector('track').mode = 'hidden'
    this.element.removeChild(this.element.querySelector('track'))
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
    if (this.element) {
      this.element.pause()
      this.element.innerHTML = ''
      this.element.load()
    }
  }

  seekToSecond(second) {
    this.element.currentTime = second
  }

}

module.exports = HTMLPlayer
