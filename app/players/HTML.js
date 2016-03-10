'use strict'

const playerEvents = require('./playerEvents')

function HTMLPlayer (element, emitter) {
  this.POLL_FREQUENCY = 500

  this.element = element
  this._onMetadata = this._onMetadata.bind(this)
  this._onEnd = this._onEnd.bind(this)
  this.emitter = emitter

  playerEvents.forEach((f) => {
    emitter.on(f, function (player) {
      if (player === 'html') {
        this[f].apply(this, Array.prototype.slice.call(arguments, 1))
      }
    }.bind(this))
  })

  this.element.addEventListener('loadedmetadata', this._onMetadata)
  this.element.addEventListener('ended', this._onEnd)
  this.element.addEventListener('waiting', this._onWaitingChange.bind(this, 'waiting'))
  this.element.addEventListener('playing', this._onWaitingChange.bind(this, 'playing'))
}

Object.assign(HTMLPlayer.prototype, {
  enablePlayer () {
    this.element.style.display = 'block'
  },

  disablePlayer () {
    this.element.style.display = 'none'
  },

  _onWaitingChange (state) {
    this.emitter.emit('playerStatus', {
      buffering: state === 'waiting'
    })
  },

  _onMetadata () {
    this.emitter.emit('playerMetadata', {
      duration: this.element.duration,
      height: this.element.videoHeight,
      width: this.element.videoWidth
    })
  },

  _onEnd () {
    this._stopPolling()
    this.emitter.emit('playerEnd')
  },

  _startPolling () {
    this._stopPolling()
    this.interval = setInterval(() => {
      const buffers = []
      for (let i = 0; i < this.element.buffered.length; i++) {
        buffers.push({
          left: this.element.buffered.start(i) / this.element.duration * 100,
          width: (this.element.buffered.end(i) - this.element.buffered.start(i)) / this.element.duration * 100
        })
      }
      this.emitter.emit('playerStatus', {
        currentTime: this.element.currentTime,
        buffered: buffers
      })
    }, this.POLL_FREQUENCY)
  },

  _stopPolling () {
    clearInterval(this.interval)
  },

  start (file, autoPlay, currentTime, showSubtitles, volume, muted) {
    this.stop()

    const el = this.element
    const src = document.createElement('source')
    src.setAttribute('src', file.streamUrl)
    el.appendChild(src)
    el.load()
    el.currentTime = currentTime
    el.volume = volume
    el.muted = muted

    if (showSubtitles) {
      this.showSubtitles()
    }

    if (autoPlay) {
      this.resume()
    }
  },

  showSubtitles () {
    if (this.element.querySelector('track')) {
      this.element.querySelector('track').mode = 'showing'
    } else {
      const track = document.createElement('track')
      track.setAttribute('default', 'default')
      track.setAttribute('src', this.element.querySelector('source').src + '/subtitles')
      track.setAttribute('label', 'Subtitles')
      track.setAttribute('kind', 'subtitles')
      this.element.appendChild(track)
    }
  },

  hideSubtitles () {
    this.element.querySelector('track').mode = 'hidden'
    this.element.removeChild(this.element.querySelector('track'))
  },

  setVolume (value) {
    this.element.volume = value
  },

  setMuted (muted) {
    this.element.muted = muted
  },

  resume () {
    this._startPolling()
    this.element.play()
  },

  pause () {
    this._stopPolling()
    this.element.pause()
  },

  stop () {
    this._stopPolling()
    this.element.pause()
    this.element.innerHTML = ''
    this.element.load()
  },

  seek (second) {
    this.element.currentTime = second
  }
})

module.exports = HTMLPlayer
