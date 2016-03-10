'use strict'

const playerEvents = require('./playerEvents')

function Chromecast (controller, chromecasts) {
  this.POLL_FREQUENCY = 1000

  this.chromecasts = chromecasts
  this.controller = controller

  playerEvents.forEach((f) => {
    controller.on(f, function () {
      if (this.controller.state.player === 'chromecast') {
        this[f].apply(this, Array.prototype.slice.call(arguments))
      }
    }.bind(this))
  })
}

Object.assign(Chromecast.prototype, {
  enablePlayer (id) {
    const device = this.chromecasts.players[this.chromecasts.players.findIndex((d) => d.host + d.name === id)]
    this.device = device
  },

  disablePlayer () {
    this.device = null
  },

  start (file, autoPlay, currentTime, showSubtitles, volume, muted) {
    this.active = true
    this.device.play(file.streamUrl, {
      autoPlay,
      title: file.name,
      seek: currentTime,
      autoSubtitles: showSubtitles,
      subtitles: file.subtitlesUrl ? [file.subtitlesUrl] : []
    }, this._onMetadata.bind(this, volume, autoPlay))
  },

  showSubtitles () {
    this.device.subtitles(1)
  },

  hideSubtitles () {
    this.device.subtitles(false)
  },

  _onMetadata (volume, autoPlay, err, status) {
    if (autoPlay) {
      this._startPolling()
    }
    this.device.volume(volume)
    this.controller.playerMetadata({ duration: status.media.duration })
  },

  _onEnd () {
    this._stopPolling()
    this.active = false
    this.controller.playerEnd()
  },

  _onStatus (err, status) {
    if (err) return
    if (!status) {
      this._onEnd()
    } else {
      this.controller.playerStatus({ currentTime: status.currentTime })
    }
  },

  _startPolling () {
    this._stopPolling()
    this.interval = setInterval(() => {
      this.device.status(this._onStatus.bind(this))
    }, this.POLL_FREQUENCY)
  },

  _stopPolling () {
    clearInterval(this.interval)
  },

  resume () {
    this.device.resume()
    this._startPolling()
  },

  pause () {
    this._stopPolling()
    this.device.pause()
  },

  stop () {
    this._stopPolling()
    if (this.active) {
      this.active = false
      this.device.stop()
    }
  },

  seek (second) {
    this.device.seek(second)
  },

  setVolume (value) {
    this.device.volume(value)
  },

  setMuted (muted) {
    this.device.volume(muted ? 0 : 0.5)
  }
})

module.exports = Chromecast
