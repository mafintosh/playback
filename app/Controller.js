import { EventEmitter } from 'events'
import update from 'react-addons-update'
import chromecasts from 'chromecasts'

import fileLoader from './loaders/file'
import youtubeLoader from './loaders/youtube'
import magnetLoader from './loaders/magnet'
import torrentLoader from './loaders/torrent'
import httpLoader from './loaders/http'
import ipfsLoader from './loaders/ipfs'

import ChromecastPlayer from './players/Chromecast'
import HTML5VideoPlayer from './players/HTML5Video'

import { ipcRenderer as ipc } from 'electron'

import Server from './Server'

const loaders = [youtubeLoader, magnetLoader, torrentLoader, httpLoader, ipfsLoader, fileLoader]

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

    this.setState({
      status: this.STATUS_STOPPED,
      volume: 100,
      muted: false,
      subtitles: false,
      casting: null,
      currentFile: null,
      currentTime: 0,
      duration: 0,
      playlist: [],
      chromecasts: [],
      player: null
    })
  }

  _initChromecasts() {
    this.chromecasts = chromecasts()
    this.chromecasts.on('update', () => {
      this.setState({ chromecasts: this.chromecasts.players })
    })
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


  /*
   * Refresh chromecasts list
   */

  updateChromecasts() {
    this.chromecasts.update()
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
    if (this.state.status !== this.STATUS_PLAYING) {
      this.resume()
    } else {
      this.pause()
    }
  }

  toggleSubtitles() {
    const show = !this.state.subtitles
    if (show) {
      this.state.player.showSubtitles(this.state.currentFile)
    } else {
      this.state.player.hideSubtitles()
    }
    this.setState({ subtitles: show })
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
    if (this.state.status !== this.STATUS_STOPPED) { this.stop() }

    this.setState({
      status: autoPlay ? this.STATUS_PLAYING : this.STATUS_PAUSED,
      currentFile: file,
      duration: 0,
      currentTime
    })
    this.state.player.load(file, autoPlay, currentTime, showSubtitles)

    if (autoPlay) {
      ipc.send('prevent-sleep')
    }
  }


  /*
   * Resume playing a file
   */

  resume() {
    this.setState({ status: this.STATUS_PLAYING })
    this.state.player.resume()
    ipc.send('prevent-sleep')
  }


  /*
   * Pause playback
   */

  pause() {
    this.setState({ status: this.STATUS_PAUSED })
    this.state.player.pause()
    ipc.send('allow-sleep')
  }


  /*
   * Stop playback
   */

  stop() {
    this.setState({
      status: this.STATUS_STOPPED,
      currentTime: 0,
      duration: 0,
      currentFile: null
    })
    this.state.player.stop()
    ipc.send('allow-sleep')
  }


  /*
   * Seek to a particular second
   */

  seekToSecond(second) {
    this.state.player.seekToSecond(second)
    this.setState({ currentTime: second })
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
    if (this.getNext()) {
      this.next()
    } else {
      this.stop()
    }
  }


  /*
   * Return the next item in the playlist, if it exists
   */

  getNext() {
    const { currentFile, playlist } = this.state
    const currentIndex = playlist.indexOf(currentFile)
    if (currentIndex > -1) {
      const nextFile = playlist[currentIndex + 1]
      return nextFile
    }
  }


  /*
   * Return the previous item in the playlist, if it exists
   */

  getPrevious() {
    const { currentFile, playlist } = this.state
    const currentIndex = playlist.indexOf(currentFile)
    if (currentIndex > -1) {
      const prevFile = playlist[currentIndex - 1]
      return prevFile
    }
  }


  /*
   * Load the next item in the playlist. Autoplay if we're already playing
   */

  next() {
    const nextFile = this.getNext()
    if (!nextFile) return
    this.load(nextFile, this.state.status === this.STATUS_PLAYING)
  }


  /*
   * Load the previous item in the playlist. Autoplay if we're already playing
   */

  previous() {
    const prevFile = this.getPrevious()
    if (!prevFile) return
    this.load(prevFile, this.state.status === this.STATUS_PLAYING)
  }


  /*
   * Remove an item from the playlist by index. If it's the currently playing file, play the next
   */

  remove(index) {
    const file = this.state.playlist[index]
    if (file) {
      const { currentFile } = this.state
      if (file === currentFile) {
        if (this.getNext()) {
          this.next()
        } else {
          this.stop()
        }
      }
      this.setState(update(this.state, { playlist: { $splice: [[index, 1]] } }))
    }
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
      const autoPlay = this.state.status === this.STATUS_PLAYING
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


}

module.exports = new Controller()
