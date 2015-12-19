import { EventEmitter } from 'events'
import update from 'react-addons-update'
import Server from './Server'
import fileLoader from './loaders/file'
import youtubeLoader from './loaders/youtube'
import chromecasts from 'chromecasts'
import ChromecastEngine from './engines/Chromecast'
import HTML5VideoEngine from './engines/HTML5Video'

const loaders = [youtubeLoader, fileLoader]

class Controller extends EventEmitter {

  get STATUS_STOPPED() { return 'stopped' }
  get STATUS_PAUSED() { return 'paused' }
  get STATUS_PLAYING() { return 'playing' }
  get ENGINE_HTML5VIDEO() { return 'html5video '}
  get ENGINE_CHROMECAST() { return 'chromecast '}

  constructor() {
    super()
    this.server = new Server(this, () => { this.emit('ready') })
    this._initChromecasts()
    this._initEngines()
    this.setState({
      status: this.STATUS_STOPPED,
      volume: 100,
      muted: false,
      casting: null,
      currentFile: null,
      stream: null,
      currentTime: 0,
      duration: 0,
      playlist: [],
      chromecasts: [],
      engine: null
    })
  }

  _initChromecasts() {
    this.chromecasts = chromecasts()
    this.chromecasts.on('update', this._onChromecastsUpdate.bind(this))
  }

  _initEngines() {
    this._chromecastEngine = new ChromecastEngine(this)
    this._htmlEngine = new HTML5VideoEngine(this)
  }

  _onChromecastsUpdate() {
    this.setState({
      chromecasts: this.chromecasts.players
    })
  }

  /*
   * Update state
   */

  setState(state) {
    this.state = Object.assign({}, this.state || {}, state)
    console.log('Setting state', state, this.state)
    setImmediate(() => {
      this.emit('update', this.state)
    })
  }


  /*
   * Get state
   */

  getState() {
    return this.state
  }


  /*
   * Toggle the playing state
   */

  togglePlay() {
    if (!this.state.stream) { return }

    if (this.state.status !== this.STATUS_PLAYING) {
      this.resume()
    } else {
      this.pause()
    }
  }


  /*
   * Add a URI to the playlist
   */

  add(uri) {
    let prom
    loaders.some((loader) => {
      if (loader.test(uri)) {
        prom = loader.load(uri).then(file => {
          this.setState(update(this.state, { playlist: { $push: [file] } }))
          return file
        })
        return true
      }
    })
    return prom
  }

  /*
   * Add a URI to the playlist and play it
   */

  addAndStart(uri) {
    return this.add(uri).then(file => {
      this.start(file)
    })
  }


  /*
   * Add an array of URIs
   */

  addAll(uris) {
    return Promise.all(uris.map(this.add.bind(this)))
  }


  /*
   * Add all and play
   */

  addAllAndPlay(uris) {
    return this.addAll(uris).then(files => {
      this.start(files[0])
    })
  }


  /*
   * Start a file
   */

  start(file) {
    this.setState({
      status: this.STATUS_PLAYING,
      currentFile: file,
      stream: this.server.getPath() + '/' + encodeURIComponent(file.uri)
    })
    this._startPollingEngine()
  }


  /*
   * Resume playing a file
   */

  resume() {
    this.setState({
      status: this.STATUS_PLAYING
    })
    this._startPollingEngine()
  }


  /*
   * Pause playback
   */

  pause() {
    this.setState({
      status: this.STATUS_PAUSED
    })
    this._stopPollingEngine()
  }


  /*
   * Stop playback
   */

  stop() {
    this.setState({
      status: this.STATUS_STOPPED,
      currentFile: null,
      stream: null
    })
    this._stopPollingEngine()
  }


  /*
   * Seek to a particular second
   */

  seekToSecond(second) {
    this.state.engine.seekToSecond(second)
    this.setState({
      currentTime: second
    })
  }


  /*
   * Play the next item in the playlist, if possible
   */

  next() {
    const { currentFile, playlist } = this.state
    const currentIndex = playlist.indexOf(currentFile)
    const nextFile = playlist[currentIndex + 1]
    if (!nextFile) { return }
    this.start(nextFile)
  }


  /*
   * Play the previous item in the playlist, if possible
   */

  previous() {
    const { currentFile, playlist } = this.state
    const currentIndex = playlist.indexOf(currentFile)
    const prevFile = playlist[currentIndex - 1]
    if (!prevFile) { return }
    this.start(prevFile)
  }


  /*
   * Start polling the engine for state updates
   */

  _startPollingEngine() {
    this.pollInterval = setInterval(() => {
      console.log('polling!')
      this.setState({
        currentTime: this.state.engine.currentTime(),
        duration: this.state.engine.duration(),
        buffered: this.state.engine.buffered()
      })
    }, this.state.engine.POLL_FREQUENCY)
  }


  /*
   * Stop polling the engine for state updates
   */

  _stopPollingEngine() {
    clearInterval(this.pollInterval)
  }


  /*
   * Toggle casting
   */

  toggleCasting(id) {
    if (this.state.casting) {
      this.setEngine(this.ENGINE_HTML5VIDEO)
    } else {
      this.setEngine(this.ENGINE_CHROMECAST)
      this.setState({
        casting: id
      })
    }
  }


  /*
   * Set the engine to use
   */

  setEngine(type) {
    if (this.state.engine) { this.state.engine.disable() }

    let engine
    if (type === this.ENGINE_CHROMECAST) {
      engine = this._chromecastEngine
    } else if (type === this.ENGINE_HTML5VIDEO) {
      engine = this._htmlEngine
    }

    engine.enable()

    this.setState({
      casting: null,
      engine
    })
  }


  /*
   * Set the video element on the HTML engine
   */

  setVideoElement(el) {
    this._htmlEngine.setElement(el)
  }

  /*
   * Get a file from the playlist
   */

  getFile(uri) {
    const { playlist } = this.state
    return playlist[playlist.find(uri, f => f.uri === uri)]
  }

}

module.exports = new Controller()
