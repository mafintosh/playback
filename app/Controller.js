import { EventEmitter } from 'events'
import { ipcRenderer as ipc } from 'electron'
import update from 'react-addons-update'
import chromecasts from 'chromecasts'

import fileLoader from './loaders/file'
import youtubeLoader from './loaders/youtube'

import ChromecastPlayer from './players/Chromecast'
import HTML5VideoPlayer from './players/HTML5Video'

import Server from './Server'

const loaders = [youtubeLoader, fileLoader]

class Controller extends EventEmitter {

  get STATUS_STOPPED() { return 'stopped' }
  get STATUS_PAUSED() { return 'paused' }
  get STATUS_PLAYING() { return 'playing' }
  get PLAYER_HTML5VIDEO() { return 'html5video '}
  get PLAYER_CHROMECAST() { return 'chromecast '}

  constructor() {
    super()
    this.server = new Server(this, () => { this.emit('ready') })
    this._initChromecasts()
    this._initPlayers()

    ipc.on('load-files', this._handleLoadFilesEvent.bind(this))

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
      player: null
    })
  }

  _initChromecasts() {
    this.chromecasts = chromecasts()
    this.chromecasts.on('update', this._onChromecastsUpdate.bind(this))
  }

  _initPlayers() {
    this._chromecastPlayer = new ChromecastPlayer(this)
    this._htmlPlayer = new HTML5VideoPlayer(this)
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
    this.emit('update', this.state)
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
      this.load(file)
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
      this.load(files[0], true)
    })
  }


  /*
   * Load a file
   */

  load(file, autoPlay = false, currentTime = 0) {
    const stream = this.server.getPath() + '/' + encodeURIComponent(file.uri)
    this.setState({
      status: autoPlay ? this.STATUS_PLAYING : this.STATUS_PAUSED,
      currentFile: file,
      currentTime,
      stream
    })
    this.state.player.load(file, stream, autoPlay, currentTime)
    if (autoPlay) {
      this._startPollingPlayer()
    }
  }


  /*
   * Resume playing a file
   */

  resume() {
    this.setState({
      status: this.STATUS_PLAYING
    })
    this.state.player.resume()
    this._startPollingPlayer()
  }


  /*
   * Pause playback
   */

  pause() {
    this.setState({
      status: this.STATUS_PAUSED
    })
    this.state.player.pause()
    this._stopPollingPlayer()
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
    this.state.player.stop()
    this._stopPollingPlayer()
  }


  /*
   * Seek to a particular second
   */

  seekToSecond(second) {
    this.state.player.seekToSecond(second)
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
    this.load(nextFile, true)
  }


  /*
   * Play the previous item in the playlist, if possible
   */

  previous() {
    const { currentFile, playlist } = this.state
    const currentIndex = playlist.indexOf(currentFile)
    const prevFile = playlist[currentIndex - 1]
    if (!prevFile) { return }
    this.load(prevFile, true)
  }


  /*
   * Start polling the player for state updates
   */

  _startPollingPlayer() {
    this._stopPollingPlayer()
    this.pollInterval = setInterval(() => {
      console.log('polling!')
      this.setState({
        currentTime: this.state.player.currentTime(),
        duration: this.state.player.duration(),
        buffered: this.state.player.buffered()
      })
    }, this.state.player.POLL_FREQUENCY)
  }


  /*
   * Stop polling the player for state updates
   */

  _stopPollingPlayer() {
    clearInterval(this.pollInterval)
  }


  /*
   * Toggle casting
   */

  toggleCasting(deviceId) {
    if (this.state.casting) {
      this.setPlayer(this.PLAYER_HTML5VIDEO, { casting: null })
    } else {
      this.setPlayer(this.PLAYER_CHROMECAST, { casting: deviceId })
    }
  }


  /*
   * Set the player to use.
   *
   * Disables the current player
   * Enables the new player
   * Continue where we left off
   */

  setPlayer(type, additionalState = {}) {
    const currentFile = this.state.currentFile
    const currentTime = this.state.currentTime
    const autoPlay = this.state.status === this.STATUS_PLAYING

    if (this.state.status !== this.STATUS_STOPPED) {
      this.stop()
    }

    if (this.state.player) { this.state.player.disable() }

    let player
    if (type === this.PLAYER_CHROMECAST) {
      player = this._chromecastPlayer
    } else if (type === this.PLAYER_HTML5VIDEO) {
      player = this._htmlPlayer
    }

    player.enable()

    this.setState(Object.assign({ player }, additionalState))

    if (currentFile) {
      this.load(currentFile, autoPlay, currentTime)
    }
  }


  /*
   * Set the video element on the HTML player
   */

  setVideoElement(el) {
    this._htmlPlayer.setElement(el)
  }


  /*
   * Get a file from the playlist
   */

  getFile(uri) {
    const { playlist } = this.state
    return playlist[playlist.find(uri, f => f.uri === uri)]
  }


  /*
   * Open file dialog
   */

  openFileDialog() {
    ipc.send('open-file-dialog')
  }


  /*
   * Load files requested by ipc event
   */

  _handleLoadFilesEvent(sender, files) {
    this.addAll(files)
  }

}

module.exports = new Controller()
