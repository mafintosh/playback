import { EventEmitter } from 'events'
import update from 'react-addons-update'
import uuid from 'node-uuid'
import chromecasts from 'chromecasts'

import ChromecastPlayer from './players/Chromecast'
import Server from './Server'

import fileLoader from './loaders/file'
import youtubeLoader from './loaders/youtube'
import magnetLoader from './loaders/magnet'
import torrentLoader from './loaders/torrent'
import httpLoader from './loaders/http'
import ipfsLoader from './loaders/ipfs'

const loaders = [youtubeLoader, magnetLoader, torrentLoader, httpLoader, ipfsLoader, fileLoader]

class Controller extends EventEmitter {

  STATUS_STOPPED = 'stopped';
  STATUS_PAUSED = 'paused';
  STATUS_PLAYING = 'playing';
  PLAYER_WEBCHIMERA = 'webchimera';
  PLAYER_HTML = 'html';
  PLAYER_CHROMECAST = 'chromecast';

  REMOTE_RECEIVE = ['togglePlay', 'start', 'remove', 'seek', 'setMuted', 'setVolume', 'toggleSubtitles', 'addAndStart', 'add', 'addSubtitles', 'updateChromecasts', 'setPlayer', 'loadFiles', 'openFileDialog', 'playerMetadata', 'playerEnd', 'playerStatus'];
  REMOTE_SEND = ['update', 'setMuted', 'setVolume', 'start', 'resume', 'pause', 'stop', 'seek', 'hideSubtitles', 'showSubtitles', 'disablePlayer', 'enablePlayer'];

  constructor() {
    super()

    // Create server
    this.server = new Server(this, (serverPath) => this.emit('ready', serverPath))

    // Initial state
    this.setState({
      status: this.STATUS_STOPPED,
      volume: 1,
      muted: false,
      subtitles: false,
      casting: null,
      currentFile: null,
      currentTime: 0,
      duration: 0,
      videoWidth: 0,
      videoHeight: 0,
      playlist: [],
      chromecasts: [],
      player: null
    })

    // Setup chromecasts and update listener
    this.chromecasts = chromecasts()
    this.chromecasts.on('update', () => {
      this.setState({
        chromecasts: this.chromecasts.players.map(d => {
          return {
            host: d.host,
            name: d.name,
            id: d.host + d.name
          }
        })
      })
    })

    // Create the chromecast player
    this._chromecastPlayer = new ChromecastPlayer(this, this.chromecasts)
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
    this.emit('update', this.state)
  }


  /*
   * Get state
   */

  getState() {
    return this.state
  }


  /*
   * Load files (media or subtitles)
   */

  loadFiles(files) {
    const subtitles = files.some(f => {
      if (f.match(/\.(srt|vtt)$/i)) {
        this.addSubtitles(f)
        return true
      }
    })

    if (!subtitles) {
      const autoPlay = !this.state.playlist.length
      if (autoPlay) {
        this.addAndStart(files)
      } else {
        this.add(files)
      }
    }
  }


  /*
   * Add subtitles to currentFile
   */

  addSubtitles(path) {
    if (this.state.currentFile) {
      this.setState({ loading: true })
      fileLoader.loadSubtitle(path).then(data => {
        this.state.currentFile.subtitles = data
        if (this.state.showSubtitles) {
          this.emit('showSubtitles')
        }
        this.setState({ loading: false })
      })
    }
  }


  /*
   * Add URI(s) to the playlist. This loads them and returns a promise that resolves when all files are loaded
   */

  add(uris) {
    this.setState({ loading: true })

    let list = uris
    if (!uris.slice) list = [uris]

    const proms = []
    list.forEach(uri => {
      loaders.some(loader => {
        if (loader.test(uri)) {
          proms.push(loader.load(uri).then(file => {
            file.id = uuid.v4()
            file.streamUrl = this.server.getPath() + '/' + file.id
            file.subtitlesUrl = file.streamUrl + '/subtitles'
            this.setState(update(this.state, { playlist: { $push: [file] } }))
            return file
          }))
          return true
        }
      })
    })

    return Promise.all(proms).then(files => {
      this.setState({ loading: false })
      return files
    }).catch(e => {
      this.setState({ loading: false })
      console.log(e)
    })
  }


  /*
   * Add URI(s) to the playlist and start
   */

  addAndStart(uris) {
    return this.add(uris).then(files => {
      this.start(files[0], true)
      return files
    })
  }


  /*
   * Play a file
   */

  start(file, autoPlay = false, currentTime = 0, showSubtitles = false) {
    if (this.state.status !== this.STATUS_STOPPED) { this.stop() }

    this.setState({
      status: autoPlay ? this.STATUS_PLAYING : this.STATUS_PAUSED,
      currentFile: file,
      duration: 0,
      currentTime
    })

    if (autoPlay) {
      this.emit('preventSleep')
    }

    this.emit('start', file, autoPlay, currentTime, showSubtitles, this.state.volume)
  }


  /*
   * Resume playing current file
   */

  resume() {
    this.setState({ status: this.STATUS_PLAYING })
    this.emit('preventSleep')
    this.emit('resume')
  }


  /*
   * Pause playback
   */

  pause() {
    this.setState({ status: this.STATUS_PAUSED })
    this.emit('allowSleep')
    this.emit('pause')
  }


  /*
   * Stop playback
   */

  stop() {
    this.setState({
      status: this.STATUS_STOPPED,
      currentTime: 0,
      duration: 0,
      currentFile: null,
      buffered: null,
      videoWidth: 0,
      videoHeight: 0
    })
    this.emit('allowSleep')
    this.emit('stop')
  }


  /*
   * Toggle playing
   */

  togglePlay() {
    if (this.state.status !== this.STATUS_PLAYING) {
      this.resume()
    } else {
      this.pause()
    }
  }


  /*
   * Toggle showing subtitles
   */

  toggleSubtitles() {
    const show = !this.state.showSubtitles
    this.setState({ showSubtitles: show })
    if (show) {
      this.emit('showSubtitles')
    } else {
      this.emit('hideSubtitles')
    }
  }


  /*
   * Seek to a particular second
   */

  seek(second) {
    this.setState({ currentTime: second })
    this.emit('seek', second)
  }


  /*
   * Handle when the player emits a status. Set currentTime and buffered list
   */

  playerStatus(status) {
    this.setState({
      currentTime: status.currentTime,
      buffered: status.buffered
    })
  }


  /*
   * Handle when the player emits metadata. Set the video duration, width, and height if available.
   */

  playerMetadata(metadata) {
    console.log('controller got metadata', metadata)
    this.setState({
      duration: metadata.duration,
      videoWidth: metadata.width,
      videoHeight: metadata.height
    })
  }


  /*
   * Handle when the player has ended the current file. Start next in the playlist.
   */

  playerEnd() {
    this.next()
  }


  /*
   * Return the next item in the playlist, if it exists
   */

  getNext() {
    const { currentFile, playlist } = this.state
    const currentIndex = playlist.findIndex(f => currentFile.id === f.id)
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
    const currentIndex = playlist.findIndex(f => currentFile.id === f.id)
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
    if (!nextFile) return this.stop()
    this.start(nextFile, this.state.status === this.STATUS_PLAYING)
  }


  /*
   * Go to the previous track, or the beginning of the current track if the currentTime is > 10
   */

  previous() {
    const prevFile = this.getPrevious()
    if (this.state.currentTime > 10) {
      this.seek(0)
    } else if (!prevFile) {
      this.stop()
    } else {
      this.start(prevFile, this.state.status === this.STATUS_PLAYING)
    }
  }


  /*
   * Remove an item from the playlist by index. If it's the currently playing file, go next()
   */

  remove(index) {
    const file = this.state.playlist[index]
    if (file) {
      if (file.id === this.state.currentFile.id) {
        this.next()
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
    const autoPlay = this.state.status === this.STATUS_PLAYING

    console.log('setplayer', type, playerOpts)

    if (this.state.status !== this.STATUS_STOPPED) {
      this.stop()
    }

    this.emit('disablePlayer')

    if (type === this.PLAYER_CHROMECAST) {
      this.setState({ player: type, casting: playerOpts.deviceId })
      this.emit('enablePlayer', playerOpts.deviceId)
    } else if (type === this.PLAYER_HTML) {
      this.setState({ player: type, casting: null })
      this.emit('enablePlayer')
    } else if (type === this.PLAYER_WEBCHIMERA) {
      this.setState({ player: type, casting: null })
      this.emit('enablePlayer')
    }

    if (currentFile) {
      this.start(currentFile, autoPlay, currentTime)
    }
  }


  /*
   * Set the volume (0-1)
   */

  setVolume(volume) {
    this.setState({ volume })
    this.emit('setVolume', volume)
  }


  /*
   * Set muted
   */

  setMuted(muted) {
    this.setState({ muted })
    this.emit('setMuted', muted)
  }


  /*
   * Get a file from the playlist by id
   */

  getFile(id) {
    const { playlist } = this.state
    return playlist[playlist.findIndex(f => f.id === id)]
  }


  /*
   * Open the file dialog
   */

  openFileDialog() {
    this.emit('openFileDialog')
  }

}

export default Controller
