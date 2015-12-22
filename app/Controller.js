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
    const cp = this._chromecastPlayer = new ChromecastPlayer(this)
    const hp = this._htmlPlayer = new HTML5VideoPlayer(this)
    const list = [cp, hp]
    list.forEach(p => {
      p.on('end', this._handlePlayerEnd.bind(this))
      p.on('metadata', this._handlePlayerMetadata.bind(this))
      p.on('status', this._handlePlayerStatus.bind(this))
    })
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
   * Add URI(s) to the playlist
   */

  add(uris) {
    let list = uris
    if (!uris.slice) list = [uris]

    const proms = []
    list.forEach(uri => {
      loaders.some(loader => {
        if (loader.test(uri)) {
          proms.push(loader.load(uri).then(file => {
            file.streamUrl = this.server.getPath() + '/' + encodeURIComponent(file.uri)
            file.subtitlesUrl = file.streamUrl + '/subtitles'
            this.setState(update(this.state, { playlist: { $push: [file] } }))
            return file
          }))
          return true
        }
      })
    })

    return Promise.all(proms)
  }


  /*
   * Add URI(s) to the playlist and start
   */

  addAndPlay(uris) {
    return this.add(uris).then(files => {
      this.load(files[0], true)
      return files
    })
  }


  /*
   * Load a file
   */

  load(file, autoPlay = false, currentTime = 0, showSubtitles = true) {
    const stream = this.server.getPath() + '/' + encodeURIComponent(file.uri)
    this.setState({
      status: autoPlay ? this.STATUS_PLAYING : this.STATUS_PAUSED,
      currentFile: file,
      currentTime,
      stream
    })
    this.state.player.load(file, autoPlay, currentTime, showSubtitles)
  }


  /*
   * Resume playing a file
   */

  resume() {
    this.setState({
      status: this.STATUS_PLAYING
    })
    this.state.player.resume()
  }


  /*
   * Pause playback
   */

  pause() {
    this.setState({
      status: this.STATUS_PAUSED
    })
    this.state.player.pause()
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
   * Handle when the player emits a status. Set currentTime and buffered list
   */

  _handlePlayerStatus(status) {
    this.setState({
      currentTime: status.currentTime,
      buffered: status.buffered
    })
  }


  /*
   * Handle when the player emits metadata. Set the video duration, width, and height if available.
   */

  _handlePlayerMetadata(metadata) {
    this.setState({
      duration: metadata.duration,
      videoWidth: metadata.width,
      videoheight: metadata.height
    })
  }


  /*
   * Handle when the player has ended the current file. Start next in the playlist.
   */

  _handlePlayerEnd() {
    this.setState({ currentTime: this.state.duration })
    this.next()
  }


  /*
   * Play the next item in the playlist, if possible
   */

  next() {
    const { currentFile, playlist } = this.state
    const currentIndex = playlist.indexOf(currentFile)
    const nextFile = playlist[currentIndex + 1]
    this.stop()
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
    this.stop()
    if (!prevFile) { return }
    this.load(prevFile, true)
  }


  /*
   * Set the player to use.
   *
   * Disables the current player
   * Enables the new player
   * Continue where we left off
   */

  setPlayer(type, playerOpts) {
    const { currentFile, currentTime } = this.state
    const autoPlay = this.state.status === this.STATUS_PLAYING

    if (this.state.status !== this.STATUS_STOPPED) {
      this.stop()
    }

    if (this.state.player) {
      this.state.player.disable()
    }

    let player
    if (type === this.PLAYER_CHROMECAST) {
      player = this._chromecastPlayer
      player.enable(playerOpts)
      this.setState({ player, casting: playerOpts.deviceId })
    } else if (type === this.PLAYER_HTML5VIDEO) {
      player = this._htmlPlayer
      player.enable(playerOpts)
      this.setState({ player, casting: null })
    }

    if (currentFile) {
      this.load(currentFile, autoPlay, currentTime)
    }
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
    const autoPlay = !this.state.playlist.length
    if (autoPlay) {
      this.addAndPlay(files)
    } else {
      this.add(files)
    }
  }

}

module.exports = new Controller()
