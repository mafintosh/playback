import { ipcRenderer as ipc } from 'electron'

import handleDrop from 'drag-and-drop-files'
import React from 'react'
import { render, findDOMNode } from 'react-dom'
import CSSTG from 'react-addons-css-transition-group'

import Icon from './components/icon'

class App extends React.Component {

  static propTypes = {
    controller: React.PropTypes.object.isRequired
  }

  constructor(props) {
    console.log('constructed UI')
    super(props)
    this.controller = this.props.controller
    this.state = this.controller.getState()
    this._initListeners()
  }


  componentDidMount() {
    this.controller.on('update', () => {
      this.setState(this.controller.getState())
    })

    handleDrop(findDOMNode(this), files => {
      this._handleLoadFilesEvent(null, files.map(f => f.path))
    })
  }

  _initListeners() {
    ipc.on('load-files', this._handleLoadFilesEvent.bind(this))
    ipc.on('fullscreen-change', (sender, fullscreen) => {
      this.setState({
        fullscreen
      })
    })
  }

  _handleTogglePlayClick() {
    this.controller.togglePlay()
  }

  _handlePlaylistClick() {
    this.setState({
      uiDialog: this.state.uiDialog === 'playlist' ? null : 'playlist'
    })
  }

  _handleCastClick() {
    this.setState({
      uiDialog: this.state.uiDialog === 'chromecasts' ? null : 'chromecasts'
    })
  }

  _handleCastItemClick(device, id) {
    this.setState({ uiDialog: null })
    if (this.state.casting === id) {
      this.controller.setPlayer(this.controller.PLAYER_HTML5VIDEO, { element: document.getElementById('video') })
    } else {
      this.controller.setPlayer(this.controller.PLAYER_CHROMECAST, { device, deviceId: id })
    }
  }

  _handlePlaylistItemClick(file) {
    this.setState({ uiDialog: null })
    this.controller.load(file, true)
  }

  _handleSeek(e) {
    const percentage = e.clientX / window.innerWidth
    const time = this.state.duration * percentage
    this.controller.seekToSecond(time)
  }

  _handleVolumeClick() {

  }

  _handleFullscreenClick() {
    ipc.send('toggle-fullscreen')
  }

  _handleAddMediaClick() {
    ipc.send('open-file-dialog')
  }

  _handleSubtitlesClick() {
    this.controller.toggleSubtitles()
  }

  _handleLoadFilesEvent(sender, files) {
    const autoPlay = !this.state.playlist.length
    if (autoPlay) {
      this.controller.addAndPlay(files)
    } else {
      this.controller.add(files)
    }
  }

  _formatTime(totalSeconds) {
    const hours = (totalSeconds / 3600) | 0
    let mins = ((totalSeconds - hours * 3600) / 60) | 0
    let secs = (totalSeconds - (3600 * hours + 60 * mins)) | 0
    if (mins < 10) mins = '0' + mins
    if (secs < 10) secs = '0' + secs
    return (hours ? hours + ':' : '') + mins + ':' + secs
  }

  _renderPlaylist() {
    const items = this.state.playlist.map((file, i) => {
      const active = file === this.state.currentFile ? 'active' : ''
      return (
        <li key={i} onClick={this._handlePlaylistItemClick.bind(this, file)} className={active}>
          <div className="playlist__item-icon">
            {active ? <Icon icon="volume-up"/> : i + 1}
          </div>
          <div className="playlist__item-title">
            {file.name}
          </div>
        </li>
      )
    })

    return (
      <div key={'playlist'} className="dialog playlist">
        <ul>
          {items}
        </ul>
        <div>
          <button onClick={this._handleAddMediaClick.bind(this)}>Add media</button>
        </div>
      </div>
    )
  }

  _renderChromecastDialog() {
    const items = this.state.chromecasts.map((cast, i) => {
      const active = cast.host + cast.name === this.state.casting ? 'active' : ''
      return <li key={i} onClick={this._handleCastItemClick.bind(this, cast, cast.host + cast.name)} className={active}>{cast.name}</li>
    })

    return (
      <div key={'chromecasts'} className="dialog chromecasts">
        <ul>
          {items}
        </ul>
      </div>
    )
  }

  render() {
    const playIcon = this.state.status === this.controller.STATUS_PLAYING ? 'pause' : 'play'
    const title = this.state.currentFile ? this.state.currentFile.name : 'No file'
    const { currentTime, duration } = this.state
    const updateSpeed = this.state.player ? this.state.player.POLL_FREQUENCY : 1000
    const progressStyle = {
      transition: `width ${updateSpeed}ms linear`,
      width: currentTime / duration * 100 + '%'
    }

    const bufferedBars = []
    const buffered = this.state.buffered
    if (buffered && buffered.length) {
      for (let i = 0; i < buffered.length; i++) {
        const left = buffered.start(i) / duration * 100
        const width = (buffered.end(i) - buffered.start(i)) / duration * 100
        bufferedBars.push(
          <div key={i} className="controls__timeline__buffered" style={{ transition: `width ${updateSpeed}ms ease-in-out`, left: left + '%', width: width + '%' }}></div>
        )
      }
    }

    let dialog
    if (this.state.uiDialog === 'playlist') {
      dialog = this._renderPlaylist()
    } else if (this.state.uiDialog === 'chromecasts') {
      dialog = this._renderChromecastDialog()
    }

    let emptyState
    if (!this.state.playlist.length) {
      emptyState = (
        <div className="empty-state">
          <div className="empty-state__heading">Drop media here</div>
          <div className="empty-state__icon">
            <Icon icon="file-download" size="48"/>
          </div>
          <button onClick={this._handleAddMediaClick.bind(this)} className="btn empty-state__button">Add media</button>
        </div>
      )
    }

    const hasSubtitles = this.state.currentFile && this.state.currentFile.subtitles
    const showingSubtitles = this.state.subtitles

    const app = (
      <div className={'ui ' + (this.state.status === this.controller.STATUS_PLAYING ? 'playing' : '')}>
        <CSSTG transitionName="fade-up" transitionEnterTimeout={125} transitionLeaveTimeout={125}>
          {dialog}
        </CSSTG>
        {emptyState}
        <div className="controls">
          <div className="controls__timeline" onClick={this._handleSeek.bind(this)}>
            {bufferedBars}
            <div className="controls__timeline__progress" style={progressStyle}></div>
          </div>
          <div className="controls__toolbar">
            <button disabled={!this.state.stream} onClick={this._handleTogglePlayClick.bind(this)}>
              <Icon icon={playIcon}/>
            </button>
            <button onClick={this._handleVolumeClick.bind(this)}>
              <Icon icon="volume-up"/>
            </button>
            <div className="controls__title">{title}</div>
            <div className="controls__metadata">
              {this._formatTime(currentTime)} / {this._formatTime(duration)}
            </div>
            <button className={(hasSubtitles ? '' : 'muted') + (showingSubtitles ? 'on' : '')} onClick={this._handleSubtitlesClick.bind(this)}>
              <Icon icon="closed-caption"/>
            </button>
            <button onClick={this._handleCastClick.bind(this)}>
              <Icon icon={this.state.casting ? 'cast-connected' : 'cast'}/>
            </button>
            <button onClick={this._handlePlaylistClick.bind(this)}>
              <Icon icon="playlist-empty"/>
            </button>
            <button onClick={this._handleFullscreenClick.bind(this)}>
              <Icon icon={this.state.fullscreen ? 'fullscreen-exit' : 'fullscreen'}/>
            </button>
          </div>
        </div>
      </div>
    )
    return app
  }
}

module.exports = {
  init: (controller, cb) => {
    render(<App controller={controller}/>, document.getElementById('react-root'), cb)
  }
}
