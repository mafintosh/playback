'use strict'

const EventEmitter = require('events').EventEmitter
const update = require('react-addons-update')
const uuid = require('node-uuid')
const chromecasts = require('chromecasts')

const ChromecastPlayer = require('./players/Chromecast')
const Server = require('./Server')

const fileLoader = require('./loaders/file')
const youtubeLoader = require('./loaders/youtube')
const magnetLoader = require('./loaders/magnet')
const torrentLoader = require('./loaders/torrent')
const httpLoader = require('./loaders/http')
const ipfsLoader = require('./loaders/ipfs')

const playerEvents = require('./players/playerEvents')

const loaders = [youtubeLoader, magnetLoader, torrentLoader, httpLoader, ipfsLoader, fileLoader]

function Controller (follow) {
  this.STATUS_STOPPED = 'stopped'
  this.STATUS_PAUSED = 'paused'
  this.STATUS_PLAYING = 'playing'
  this.PLAYER_HTML = 'html'
  this.PLAYER_CHROMECAST = 'chromecast'

  this.REMOTE_RECEIVE = ['togglePlay', 'start', 'remove', 'seek', 'setMuted', 'setVolume', 'toggleSubtitles', 'addAndStart', 'add', 'addSubtitles', 'updateChromecasts', 'setPlayer', 'loadFiles', 'openFileDialog', 'playerMetadata', 'playerEnd', 'playerStatus']
  this.REMOTE_SEND = ['update'].concat(playerEvents)

  // Create server
  this.server = new Server(this, follow, (serverPath) => this.emit('ready', serverPath))

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
      chromecasts: this.chromecasts.players.map((d) => {
        return {
          host: d.host,
          name: d.name,
          id: d.host + d.name
        }
      })
    })
  })

  this.fileStreams = []
  this._chromecastPlayer = new ChromecastPlayer(this, this.chromecasts)
}

Object.assign(Controller.prototype, EventEmitter.prototype, {

  /*
   * Refresh chromecasts list
   */

  updateChromecasts () {
    this.chromecasts.update()
  },

  /*
   * Update state
   */

  setState (state) {
    this.state = Object.assign({}, this.state || {}, state)
    this.emit('update', this.state)
  },

  /*
   * Get state
   */

  getState () {
    return this.state
  },

  /*
   * Load files (media or subtitles)
   */

  loadFiles (files) {
    const subtitles = files.some((f) => {
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
  },

  /*
   * Add subtitles to currentFile
   */

  addSubtitles (path) {
    if (this.state.currentFile) {
      this.setState({ loading: true })
      fileLoader.loadSubtitle(path).then((data) => {
        this.getFile(this.state.currentFile.id).subtitles = data
        this.state.currentFile.subtitles = true
        if (this.state.showSubtitles) {
          this.emit('showSubtitles')
        }
        this.setState({ loading: false })
      })
    }
  },

  /*
   * Add URI(s) to the playlist. This loads them and returns a promise that resolves when all files are loaded
   */

  add (uris) {
    this.setState({ loading: true })

    let list = uris
    if (!uris.slice) list = [uris]

    const proms = []
    list.forEach((uri) => {
      loaders.some((loader) => {
        if (loader.test(uri)) {
          proms.push(loader.load(uri).then((file) => {
            file.id = uuid.v4()
            file.streamUrl = this.server.getPath() + '/' + file.id
            file.subtitlesUrl = file.streamUrl + '/subtitles'
            this.fileStreams.push(file)
            this.setState(update(this.state, {
              playlist: {
                $push: [{
                  id: file.id,
                  streamUrl: file.streamUrl,
                  subtitlesUrl: file.subtitlesUrl,
                  name: file.name
                }]
              }
            }))
            return file
          }))
          return true
        }
      })
    })

    return Promise.all(proms).then((files) => {
      this.setState({ loading: false })
      return files
    }).catch((e) => {
      this.setState({ loading: false })
      console.error(e)
    })
  },

  /*
   * Add URI(s) to the playlist and start
   */

  addAndStart (uris) {
    return this.add(uris).then((files) => {
      this.start(files[0], true)
      return files
    })
  },

  /*
   * Play a file
   */

  start (file, autoPlay, currentTime, showSubtitles) {
    currentTime = currentTime || 0
    showSubtitles = showSubtitles || false

    if (this.state.status !== this.STATUS_STOPPED) { this.stop() }

    this.setState({
      status: autoPlay ? this.STATUS_PLAYING : this.STATUS_PAUSED,
      currentFile: Object.assign({}, file),
      duration: 0,
      currentTime
    })

    if (autoPlay) {
      this.emit('preventSleep')
    }

    this.emit('start', file, autoPlay, currentTime, showSubtitles, this.state.volume, this.state.muted)
  },

  /*
   * Resume playing current file
   */

  resume () {
    this.setState({ status: this.STATUS_PLAYING })
    this.emit('preventSleep')
    this.emit('resume')
  },

  /*
   * Pause playback
   */

  pause () {
    this.setState({ status: this.STATUS_PAUSED })
    this.emit('allowSleep')
    this.emit('pause')
  },

  /*
   * Stop playback
   */

  stop () {
    this.setState({
      status: this.STATUS_STOPPED,
      currentTime: 0,
      duration: 0,
      currentFile: null,
      buffering: false,
      buffered: null,
      videoWidth: 0,
      videoHeight: 0
    })
    this.emit('allowSleep')
    this.emit('stop')
  },

  /*
   * Toggle playing
   */

  togglePlay () {
    if (this.state.status === this.STATUS_PAUSED) {
      this.resume()
    } else if (this.state.status === this.STATUS_PLAYING) {
      this.pause()
    }
  },

  /*
   * Toggle showing subtitles
   */

  toggleSubtitles () {
    const show = !this.state.showSubtitles
    this.setState({ showSubtitles: show })
    if (show) {
      this.emit('showSubtitles', this.state.currentFile.subtitlesUrl)
    } else {
      this.emit('hideSubtitles')
    }
  },

  /*
   * Seek to a particular second
   */

  seek (second) {
    this.setState({ currentTime: second })
    this.emit('seek', second)
  },

  /*
   * Handle when the player emits a status. Set currentTime and buffered list
   */

  playerStatus (status) {
    this.setState({
      currentTime: status.currentTime || this.state.currentTime,
      buffering: status.buffering,
      buffered: status.buffered
    })
  },

  /*
   * Handle when the player emits metadata. Set the video duration, width, and height if available.
   */

  playerMetadata (metadata) {
    this.setState({
      duration: metadata.duration,
      videoWidth: metadata.width,
      videoHeight: metadata.height
    })
  },

  /*
   * Handle when the player has ended the current file. Start next in the playlist.
   */

  playerEnd () {
    this.next()
  },

  /*
   * Return the next item in the playlist, if it exists
   */

  getNext () {
    const currentFile = this.state.currentFile
    const playlist = this.state.playlist
    if (!currentFile) return
    const currentIndex = playlist.findIndex((f) => currentFile.id === f.id)
    if (currentIndex > -1) {
      const nextFile = playlist[currentIndex + 1]
      return nextFile
    }
  },

  /*
   * Return the previous item in the playlist, if it exists
   */

  getPrevious () {
    const currentFile = this.state.currentFile
    const playlist = this.state.playlist
    if (!currentFile) return
    const currentIndex = playlist.findIndex((f) => currentFile.id === f.id)
    if (currentIndex > -1) {
      const prevFile = playlist[currentIndex - 1]
      return prevFile
    }
  },

  /*
   * Load the next item in the playlist. Autoplay if we're already playing
   */

  next () {
    const nextFile = this.getNext()
    if (!nextFile) return this.stop()
    this.start(nextFile, this.state.status === this.STATUS_PLAYING)
  },

  /*
   * Go to the previous track, or the beginning of the current track if the currentTime is > 10
   */

  previous () {
    const prevFile = this.getPrevious()
    if (this.state.currentTime > 10) {
      this.seek(0)
    } else if (!prevFile) {
      this.stop()
    } else {
      this.start(prevFile, this.state.status === this.STATUS_PLAYING)
    }
  },

  /*
   * Remove an item from the playlist by index. If it's the currently playing file, go next()
   */

  remove (index) {
    const file = this.state.playlist[index]
    if (file) {
      if (this.state.currentFile && file.id === this.state.currentFile.id) {
        this.next()
      }
      this.fileStreams.splice(index, 1)
      this.setState(update(this.state, { playlist: { $splice: [[index, 1]] } }))
    }
  },

  /*
   * Set the player to use.
   *
   * Disables the current player
   * Enables the new player
   * Continue where we left off
   */

  setPlayer (type, playerOpts) {
    const currentFile = this.state.currentFile
    const currentTime = this.state.currentTime

    const autoPlay = this.state.status === this.STATUS_PLAYING

    if (this.state.status !== this.STATUS_STOPPED) {
      this.stop()
    }

    this.emit('disablePlayer')

    if (type === this.PLAYER_CHROMECAST) {
      this.setState({ player: type, casting: playerOpts.deviceId, buffering: false, buffered: null })
      this.emit('enablePlayer', playerOpts.deviceId)
    } else if (type === this.PLAYER_HTML) {
      this.setState({ player: type, casting: null, buffering: false, buffered: null })
      this.emit('enablePlayer')
    }

    if (currentFile) {
      this.start(currentFile, autoPlay, currentTime)
    }
  },

  /*
   * Set the volume (0-1)
   */

  setVolume (volume) {
    this.setState({ volume })
    this.emit('setVolume', volume)
  },

  /*
   * Set muted
   */

  setMuted (muted) {
    this.setState({ muted })
    this.emit('setMuted', muted)
  },

  /*
   * Get a file stream by id
   */

  getFile (id) {
    return this.fileStreams[this.fileStreams.findIndex((f) => f.id === id)]
  },

  /*
   * Open the file dialog
   */

  openFileDialog () {
    this.emit('openFileDialog')
  }
})

module.exports = Controller
