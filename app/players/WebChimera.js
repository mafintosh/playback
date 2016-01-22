import wcjs from 'wcjs-prebuilt'
import renderer from 'webgl-video-renderer'
import playerEvents from './playerEvents'
import debounce from 'lodash.debounce'

class WebChimera {

  POLL_FREQUENCY = 500;

  constructor(element, emitter) {
    this.emitter = emitter
    this.element = element
    this.context = renderer.setupCanvas(element)
    this.player = wcjs.createPlayer()

    playerEvents.forEach((f) => {
      emitter.on(f, (player, ...args) => {
        if (player === 'webchimera') {
          console.log('webchimera player performing', f, ' with ', args)
          this[f](...args)
        }
      })
    })

    this.player.onFrameReady = (frame) => {
      this.context.render(frame, frame.width, frame.height, frame.uOffset, frame.vOffset)
    }

    this._onEnd = this._onEnd.bind(this)
    this._onBuffer = debounce(this._onBuffer.bind(this), 100)
    this._onWindowResize = this._onWindowResize.bind(this)
    this.player.onBuffering = this._onBuffer
    this.player.onEndReached = this._onEnd
  }

  enablePlayer() {
    window.addEventListener('resize', this._onWindowResize)
    this.element.style.display = 'block'
  }

  disablePlayer() {
    window.removeEventListener('resize', this._onWindowResize)
    this.element.style.display = 'none'
  }

  _onBuffer(percent) {
    this.emitter.emit('playerStatus', {
      buffering: percent !== 100
    })
  }

  _onWindowResize() {
    const preferredWidth = this.element.width
    const preferredHeight = this.element.height
    const ratio = preferredWidth / preferredHeight
    const maxWidth = this.element.offsetParent.offsetWidth
    const maxHeight = this.element.offsetParent.offsetHeight
    const currentRatio = maxWidth / maxHeight

    let outputHeight
    let outputWidth
    if (ratio > currentRatio) {
      outputHeight = Math.round(maxWidth / ratio)
      outputWidth = maxWidth
    } else {
      outputWidth = Math.round(maxHeight * ratio)
      outputHeight = maxHeight
    }

    this.element.style.width = outputWidth + 'px'
    this.element.style.height = outputHeight + 'px'
  }

  _onEnd() {
    this._stopPolling()
    this.emitter.emit('playerEnd')
  }

  _startPolling() {
    this._stopPolling()
    this.interval = setInterval(() => {
      this.emitter.emit('playerStatus', {
        currentTime: this.player.time / 1000
      })
    }, this.POLL_FREQUENCY)
  }

  _stopPolling() {
    clearInterval(this.interval)
  }

  start(file, autoPlay = false, currentTime = 0, showSubtitles = false, volume = 1) {
    this.stop()
    this.player.play(file.streamUrl)
    this.player.time = currentTime * 1000
    this.player.volume = volume * 100

    this.player.onFrameSetup = (width, height) => {
      this.emitter.emit('playerMetadata', {
        duration: this.player.length / 1000,
        width,
        height
      })

      if (!autoPlay) {
        this.player.pause()
      } else {
        this._startPolling()
      }
    }
  }

  showSubtitles(url) {
    this.player.subtitles.load(url)
  }

  hideSubtitles() {
    this.player.subtitles.track = 0
  }

  setVolume(value) {
    this.player.volume = value * 100
  }

  setMuted(muted) {
    this.player.mute = muted
  }

  resume() {
    this._startPolling()
    this.player.play()
  }

  pause() {
    this._stopPolling()
    this.player.pause()
  }

  stop() {
    this._stopPolling()
    this.player.stop()
    this.context.fillBlack()
  }

  seek(second) {
    this.player.time = second * 1000
  }

}

module.exports = WebChimera
