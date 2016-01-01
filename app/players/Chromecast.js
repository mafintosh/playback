import { EventEmitter } from 'events'

class Chromecast extends EventEmitter {

  POLL_FREQUENCY = 1000

  constructor(controller) {
    super()
    this.controller = controller
  }

  enable(opts) {
    this.device = opts.device
  }

  disable() {
    this.device = null
  }

  load(file, autoPlay = false, currentTime = 0, showSubtitles = false) {
    this.active = true
    this.device.play(file.streamUrl, {
      autoPlay,
      title: file.name,
      seek: currentTime,
      autoSubtitles: showSubtitles,
      subtitles: file.subtitlesUrl ? [file.subtitlesUrl] : []
    }, this._onMetadata.bind(this))

    if (autoPlay) {
      this._startPolling()
    }
  }

  showSubtitles() {
    this.device.subtitles(1)
  }

  hideSubtitles() {
    this.device.subtitles(false)
  }

  _onMetadata(err, status) {
    this.emit('metadata', { duration: status.media.duration })
  }

  _onStatus(err, status) {
    if (!status) {
      this._stopPolling()
      this.active = false
      this.emit('end')
    } else {
      this.emit('status', { currentTime: status.currentTime })
    }
  }

  _startPolling() {
    this._stopPolling()
    this.interval = setInterval(() => {
      this.device.status(this._onStatus.bind(this))
    }, this.POLL_FREQUENCY)
  }

  _stopPolling() {
    clearInterval(this.interval)
  }

  resume() {
    this.device.resume()
    this._startPolling()
  }

  pause() {
    this._stopPolling()
    this.device.pause()
  }

  stop() {
    this._stopPolling()
    if (this.active) {
      this.active = false
      this.device.stop()
    }
  }

  seekToSecond(second) {
    this.device.seek(second)
  }

}

module.exports = Chromecast
