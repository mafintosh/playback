import wcjs from 'wcjs-prebuilt'
import renderer from 'webgl-video-renderer'

class WebChimera {

  POLL_FREQUENCY = 500;

  constructor(element, emitter) {
    this.emitter = emitter
    this.element = element
    this.context = renderer.setupCanvas(element)
    this.player = wcjs.createPlayer()

    const list = ['setMuted', 'setVolume', 'start', 'resume', 'pause', 'stop', 'seek', 'hideSubtitles', 'showSubtitles', 'enablePlayer', 'disablePlayer']
    list.forEach((f) => {
      emitter.on(f, (player, ...args) => {
        if (player === 'webchimera') {
          console.log('webchimera player performing', f, ' with ', args)
          this[f](...args)
        }
      })
    })

    this.player.onFrameSetup = (width, height) => {
      this.emitter.emit('playerMetadata', {
        duration: this.player.length / 1000,
        width,
        height
      })
    }

    this.player.onFrameReady = (frame) => {
      this.context.render(frame, frame.width, frame.height, frame.uOffset, frame.vOffset)
    }

    this._onEnd = this._onEnd.bind(this)
    this.player.onEndReached = this._onEnd
  }

  enablePlayer() {
    this.element.style.display = 'block'
  }

  disablePlayer() {
    this.element.style.display = 'none'
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
      // if (this.player.state === this.player.Ended) {
      //   this._onEnd()
      // }
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

    if (!autoPlay) {
      this.player.pause()
    } else {
      this._startPolling()
    }
  }

  showSubtitles() {
  }

  hideSubtitles() {
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
