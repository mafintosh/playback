import { EventEmitter } from 'events'

class Chromecast extends EventEmitter {

  static POLL_FREQUENCY = 1000
  get POLL_FREQUENCY() { return Chromecast.POLL_FREQUENCY }

  constructor(controller) {
    super()
    this.controller = controller

    this._onStatusUpdate = this._onStatusUpdate.bind(this)
    this._onMetadata = this._onMetadata.bind(this)
    this._update = this._update.bind(this)
  }

  enable() {
    this.controller.on('update', this._update)
    this.status = {
      currentTime: 0,
      media: {
        duration: 0
      }
    }
  }

  disable() {
    this.controller.removeListener('update', this._update)
    if (this.player) { this._stop() }
  }

  _getPlayer() {
    const playerId = this.controller.state.casting
    let player
    this.controller.state.chromecasts.some(p => {
      if (p.host + p.name === playerId) {
        player = p
        return true
      }
    })
    return player
  }

  _update(state) {
    const player = this._getPlayer()
    if (!player) { return }

    // if the current stream isn't the stream we have, stop casting
    if (state.stream && state.stream !== this.currentStream) {
      if (this.currentStream) {
        this._stop()
      }
    }

    if (!this.playing && !this.currentStream && state.status === this.controller.STATUS_PLAYING) {
      // not playing, no existing stream, start
      this._play(player, state.stream)
    } else if (!this.playing && this.currentStream && state.status === this.controller.STATUS_PLAYING) {
      // not playing, existing stream, resume
      this._resume()
    } else if (this.playing && state.status === this.controller.STATUS_PAUSED) {
      // playing, pause
      this._pause()
    } else if (this.currentStream && state.status === this.controller.STATUS_STOPPED) {
      // have a currentStream, stop
      this._stop()
    }
  }

  _play(player, stream) {
    this.player = player
    player.play(stream, {
      type: 'video/mp4'
    }, this._onMetadata)
    player.on('status', this._onStatusUpdate)
    this.playing = true
    this.currentStream = stream
    this.interval = setInterval(() => {
      this.player.status(this._onMetadata)
    }, 1000)
  }

  _resume() {
    this.player.resume()
    this.playing = true
  }

  _pause() {
    this.player.pause()
    this.playing = false
  }

  _stop() {
    this.player.stop()
    this.player.removeListener('status', this._onMetadata)
    this.player = null
    this.playing = false
    this.currentStream = null
    clearInterval(this.interval)
  }

  _onMetadata(err, data) {
    this.status = data
  }

  _onStatusUpdate(status) {
    Object.assign(this.status, status)
  }

  seekToSecond(second) {
    this._getPlayer().seek(second)
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
