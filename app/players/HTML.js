class HTMLPlayer {

  POLL_FREQUENCY = 500;

  constructor(element, emitter) {
    this.element = element
    this._onMetadata = this._onMetadata.bind(this)
    this._onEnd = this._onEnd.bind(this)
    this.emitter = emitter

    const list = ['setMuted', 'setVolume', 'start', 'resume', 'pause', 'stop', 'seek', 'hideSubtitles', 'showSubtitles', 'enablePlayer', 'disablePlayer']
    list.forEach((f) => {
      emitter.on(f, (player, ...args) => {
        if (player === 'html') {
          this[f](...args)
        }
      })
    })

    this.element.addEventListener('loadedmetadata', this._onMetadata)
    this.element.addEventListener('ended', this._onEnd)
  }

  enablePlayer() {
    this.element.style.display = 'block'
  }

  disablePlayer() {
    this.element.style.display = 'none'
  }

  _onMetadata() {
    this.emitter.emit('playerMetadata', {
      duration: this.element.duration,
      height: this.element.videoHeight,
      width: this.element.videoWidth
    })
  }

  _onEnd() {
    this._stopPolling()
    this.emitter.emit('playerEnd')
  }

  _startPolling() {
    this._stopPolling()
    this.interval = setInterval(() => {
      this.emitter.emit('playerStatus', {
        currentTime: this.element.currentTime,
        buffered: this.element.buffered
      })
    }, this.POLL_FREQUENCY)
  }

  _stopPolling() {
    clearInterval(this.interval)
  }

  start(file, autoPlay = false, currentTime = 0, showSubtitles = false, volume = 1) {
    this.stop()

    const el = this.element
    const src = document.createElement('source')
    src.setAttribute('src', file.streamUrl)
    el.appendChild(src)
    el.load()
    el.currentTime = currentTime
    el.volume = volume

    if (showSubtitles) {
      this.showSubtitles()
    }

    if (autoPlay) {
      this.resume()
    }
  }

  showSubtitles() {
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
  }

  hideSubtitles() {
    this.element.querySelector('track').mode = 'hidden'
    this.element.removeChild(this.element.querySelector('track'))
  }

  setVolume(value) {
    this.element.volume = value
  }

  setMuted(muted) {
    this.element.muted = muted
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
    this.element.innerHTML = ''
    this.element.load()
  }

  seek(second) {
    this.element.currentTime = second
  }

}

export default HTMLPlayer
