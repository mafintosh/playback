import { EventEmitter } from 'events'

class Chromecast extends EventEmitter {

  static POLL_FREQUENCY = 1000
  get POLL_FREQUENCY() { return Chromecast.POLL_FREQUENCY }

  constructor(controller) {
    super()
    this.controller = controller

    this._onStatusUpdate = this._onStatusUpdate.bind(this)
    this._onMetadata = this._onMetadata.bind(this)
  }

  enable() {
    this.status = {
      currentTime: 0,
      media: {
        duration: 0
      }
    }
  }

  disable() {
    if (this.device) { this.stop() }
  }

  _getDevice() {
    const deviceId = this.controller.state.casting
    let device
    this.controller.state.chromecasts.some(d => {
      if (d.host + d.name === deviceId) {
        device = d
        return true
      }
    })
    return device
  }

  load(file, stream, autoPlay = false, currentTime = 0) {
    const device = this.device = this._getDevice()

    device.play(stream, {
      title: file.name,
      autoPlay,
      seek: currentTime
    }, this._onMetadata)

    device.on('status', this._onStatusUpdate)
    this.interval = setInterval(() => {
      if (!this.device) { return clearInterval(this.interval) }
      this.device.status(this._onMetadata)
    }, 1000)
  }

  resume() {
    this.device.resume()
  }

  pause() {
    this.device.pause()
  }

  stop() {
    this.device.stop()
    this.device.removeListener('status', this._onMetadata)
    this.device = null
    clearInterval(this.interval)
  }

  _onMetadata(err, data) {
    this.status = data
  }

  _onStatusUpdate(status) {
    Object.assign(this.status, status)
  }

  seekToSecond(second) {
    this.device.seek(second)
  }

  duration() {
    return this.status.media.duration
  }

  currentTime() {
    return this.status.currentTime
  }

  buffered() {
    return []
  }

}

module.exports = Chromecast
