import { EventEmitter } from 'events'

class Chromecast extends EventEmitter {

  static POLL_FREQUENCY = 1000
  get POLL_FREQUENCY() { return Chromecast.POLL_FREQUENCY }

  constructor(controller) {
    super()
    this.controller = controller
  }

  enable(opts) {
    this.device = opts.device
  }

  disable() {
    if (this.device) {
      this.stop()
      this.device = null
    }
  }

  load(file, stream, autoPlay = false, currentTime = 0) {
    this.device.play(stream, {
      autoPlay,
      title: file.name,
      seek: currentTime
    }, this._onMetadata.bind(this))

    if (autoPlay) {
      this._startPolling()
    }
  }

  _onMetadata(err, status) {
    console.log('Cast onmetadata: ', status)
    this.emit('metadata', {
      duration: status.media.duration
    })
  }

  _onStatus(err, status) {
    if (!status) {
      this._stopPolling()
      this.emit('end')
    } else {
      this.emit('status', {
        currentTime: status.currentTime
      })
    }
  }

  _startPolling() {
    this._stopPolling()
    this.interval = setInterval(() => {
      if (!this.device) { return clearInterval(this.interval) }
      this.device.status(this._onStatus.bind(this))
    }, this.POLL_FREQUENCY)
  }

  _stopPolling() {
    clearInterval(this.interval)
  }

  resume() {
    this._startPolling()
    if (this.device) {
      this.device.resume()
    }
  }

  pause() {
    this._stopPolling()
    if (this.device) {
      this.device.pause()
    }
  }

  stop() {
    this._stopPolling()
    if (this.device) {
      this.device.stop()
    }
  }

  seekToSecond(second) {
    this.device.seek(second)
  }

}

module.exports = Chromecast
