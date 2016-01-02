import { ipcRenderer as ipc } from 'electron'

import handleDrop from 'drag-and-drop-files'
import React from 'react'
import { render, findDOMNode } from 'react-dom'
import Slider from 'react-slider'
import CSSTG from 'react-addons-css-transition-group'

import Icon from './components/icon'
import Titlebar from './components/titlebar'
import handleIdle from './utils/mouseidle.js'

const App = React.createClass({

  propTypes: {
    controller: React.PropTypes.object.isRequired
  },

  getInitialState() {
    return this.props.controller.getState()
  },

  componentDidMount() {
    this.props.controller.on('update', () => {
      this.setState(this.props.controller.getState())
    })

    const el = findDOMNode(this)
    const videoElement = document.getElementById('video')

    handleDrop(el, files => {
      this._handleLoadFilesEvent(null, files.map(f => f.path))
    })

    handleIdle(el, 2500, 'hide')

    videoElement.addEventListener('click', () => {
      this.setState({ uiDialog: null })
    })

    document.addEventListener('keydown', e => {
      if (e.keyCode === 27 && this.state.fullscreen) return this._handleFullscreenClick()
      if (e.keyCode === 13 && e.metaKey) return this._handleFullscreenClick()
      if (e.keyCode === 13 && e.shiftKey) return this._handleFullscreenClick()
      if (e.keyCode === 32) return this._handleTogglePlayClick()
    })

    videoElement.addEventListener('dblclick', () => {
      this._handleFullscreenClick()
    })

    document.addEventListener('paste', e => {
      this._handleLoadFilesEvent(null, e.clipboardData.getData('text').split('\n'))
    })

    ipc.on('load-files', this._handleLoadFilesEvent)
    ipc.on('fullscreen-change', (sender, fullscreen) => { this.setState({ fullscreen }) })
  },

  componentWillUpdate(nextProps, nextState) {
    if (nextState.videoWidth && this.state.videoWidth !== nextState.videoWidth) {
      ipc.send('resize', {
        width: nextState.videoWidth,
        height: nextState.videoHeight
      })
    }
  },

  _handleTogglePlayClick() {
    this.props.controller.togglePlay()
  },

  _handlePlaylistClick() {
    this.setState({ uiDialog: this.state.uiDialog === 'playlist' ? null : 'playlist' })
  },

  _handleCastClick() {
    this.props.controller.updateChromecasts()
    this.setState({ uiDialog: this.state.uiDialog === 'chromecasts' ? null : 'chromecasts' })
  },

  _handleRefreshChromecastsClick() {
    this.props.controller.updateChromecasts()
  },

  _handleCastItemClick(device, deviceId) {
    this.setState({ uiDialog: null })
    if (this.state.casting === deviceId) {
      this.props.controller.setPlayer(this.props.controller.PLAYER_HTML, { element: this.state.videoElement })
    } else {
      this.props.controller.setPlayer(this.props.controller.PLAYER_CHROMECAST, { device, deviceId })
    }
  },

  _handlePlaylistItemClick(file) {
    this.setState({ uiDialog: null })
    this.props.controller.load(file, true)
  },

  _handleRemoveItemClick(file, index, e) {
    e.stopPropagation()
    this.props.controller.remove(index)
  },

  _handleSeek(e) {
    const percentage = e.clientX / window.innerWidth
    const time = this.state.duration * percentage
    this.props.controller.seekToSecond(time)
  },

  _handleVolumeIconClick() {
    this.props.controller.setMuted(!this.state.muted)
  },

  _handleVolumeChange(val) {
    this.props.controller.setVolume(val / 100)
  },

  _handleFullscreenClick() {
    ipc.send('toggle-fullscreen')
  },

  _handleMaximizeClick() {
    ipc.send('maximize')
  },

  _handleMinimizeClick() {
    ipc.send('minimize')
  },

  _handleCloseClick() {
    ipc.send('close')
  },

  _handleAddMediaClick() {
    ipc.send('open-file-dialog')
  },

  _handleSubtitlesClick() {
    this.props.controller.toggleSubtitles()
  },

  _handleLoadFilesEvent(sender, files) {
    this.setState({ uiDialog: null })

    const autoPlay = !this.state.playlist.length
    if (autoPlay) {
      this.props.controller.addAndPlay(files)
    } else {
      this.props.controller.add(files)
    }
  },

  _handleTimelineMouseMove(e) {
    this.setState({ uiTimelineTooltipPosition: e.clientX })
  },

  _formatTime(totalSeconds) {
    const hours = (totalSeconds / 3600) | 0
    let mins = ((totalSeconds - hours * 3600) / 60) | 0
    let secs = (totalSeconds - (3600 * hours + 60 * mins)) | 0
    if (mins < 10) mins = '0' + mins
    if (secs < 10) secs = '0' + secs
    return (hours ? hours + ':' : '') + mins + ':' + secs
  },

  _renderPlaylist() {
    let items = this.state.playlist.map((file, i) => {
      const active = file === this.state.currentFile ? 'active' : ''
      let icon
      if (active) {
        icon = <Icon icon="play"/>
      } else {
        icon = i + 1
      }

      return (
        <li key={i} onClick={this._handlePlaylistItemClick.bind(this, file)} className={active}>
          <div className="playlist__item-icon">{icon}</div>
          <div className="playlist__item-title">{file.name}</div>
          <div className="playlist__item-action" onClick={this._handleRemoveItemClick.bind(this, file, i)}><Icon icon="highlight-remove"/></div>
        </li>
      )
    })

    if (!items.length) {
      items = <li><div className="playlist__item-title">Play queue empty</div></li>
    }

    return (
      <div key={'playlist'} className="dialog playlist">
        <ul>{items}</ul>
        <div>
          <button className="btn" onClick={this._handleAddMediaClick}>Add media</button>
        </div>
      </div>
    )
  },

  _renderChromecastDialog() {
    let items = this.state.chromecasts.map((cast, i) => {
      const active = cast.host + cast.name === this.state.casting ? 'active' : ''
      return <li key={i} onClick={this._handleCastItemClick.bind(this, cast, cast.host + cast.name)} className={active}>{cast.name}</li>
    })

    if (!items.length) {
      items = [<li key={-1} onClick={this._handleRefreshChromecastsClick}>No chromecasts found. Click to refresh.</li>]
    }

    return (
      <div key={'chromecasts'} className="dialog chromecasts">
        <ul>{items}</ul>
      </div>
    )
  },

  render() {
    const playing = this.state.status === this.props.controller.STATUS_PLAYING
    const playIcon = playing ? 'pause' : 'play'
    const title = this.state.currentFile ? this.state.currentFile.name : 'No file'
    const { currentTime, duration } = this.state
    const updateSpeed = playing ? this.state.player.POLL_FREQUENCY : 0
    const progressTime = playing ? currentTime : currentTime
    const progressStyle = {
      transition: `width ${updateSpeed}ms linear`,
      width: duration ? progressTime / duration * 100 + '%' : '0'
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
          <button onClick={this._handleAddMediaClick} className="btn empty-state__button">Add media</button>
        </div>
      )
    }

    let timelineTooltip
    if (this.state.uiTimelineTooltipPosition) {
      const minLeft = 25
      const maxRight = window.innerWidth - 25
      const value = this._formatTime(this.state.uiTimelineTooltipPosition / window.innerWidth * duration)
      timelineTooltip = (
        <div className="controls__timeline__tooltip" style={{ left: Math.min(maxRight, Math.max(minLeft, this.state.uiTimelineTooltipPosition)) + 'px' }}>{value}</div>
      )
    }

    const hasSubtitles = this.state.currentFile && this.state.currentFile.subtitles
    const showingSubtitles = this.state.subtitles

    let volumeIcon
    if (this.state.volume === 0 || this.state.muted) {
      volumeIcon = 'volume-off'
    } else if (this.state.volume > 0.5) {
      volumeIcon = 'volume-up'
    } else if (this.state.volume > 0) {
      volumeIcon = 'volume-down'
    }

    let loading
    if (this.state.loading) {
      loading = (
        <div className="toast">Loading...</div>
      )
    }

    const app = (
      <div className={'ui ' + (this.state.status === this.props.controller.STATUS_STOPPED ? 'stopped' : '')}>
        {loading}
        {emptyState}
        <Titlebar onFullscreen={this._handleFullscreenClick} onClose={this._handleCloseClick} onMaximize={this._handleMaximizeClick} onMinimize={this._handleMinimizeClick} isFullscreen={this.state.fullscreen}/>
        <CSSTG transitionName="fade-up" transitionEnterTimeout={125} transitionLeaveTimeout={125}>
          {dialog}
        </CSSTG>
        <div className="controls">
          <div className="controls__timeline" onMouseMove={this._handleTimelineMouseMove} onClick={this._handleSeek} ref="timeline">
            {timelineTooltip}
            {bufferedBars}
            <div className="controls__timeline__progress" style={progressStyle}></div>
          </div>
          <div className="controls__toolbar">
            <button disabled={!this.state.currentFile} onClick={this._handleTogglePlayClick}>
              <Icon icon={playIcon}/>
            </button>
            <div className="controls__toolbar__volume">
              <button onClick={this._handleVolumeIconClick}>
                <Icon icon={volumeIcon}/>
              </button>
              <div className="controls__toolbar__volume__slider">
               <Slider value={this.state.volume * 100} onChange={this._handleVolumeChange} withBars />
              </div>
            </div>
            <div className="controls__title">{title}</div>
            <div className="controls__metadata">
              {this._formatTime(currentTime)} / {this._formatTime(duration)}
            </div>
            <button disabled={!hasSubtitles} className={(hasSubtitles ? '' : 'muted') + (showingSubtitles ? 'on' : '')} onClick={this._handleSubtitlesClick}>
              <Icon icon="closed-caption"/>
            </button>
            <button className={this.state.chromecasts.length ? '' : 'muted'} onClick={this._handleCastClick}>
              <Icon icon={this.state.casting ? 'cast-connected' : 'cast'}/>
            </button>
            <button onClick={this._handlePlaylistClick}>
              <Icon icon="playlist-empty"/>
            </button>
            <button onClick={this._handleFullscreenClick}>
              <Icon icon={this.state.fullscreen ? 'fullscreen-exit' : 'fullscreen'}/>
            </button>
          </div>
        </div>
      </div>
    )
    return app
  }
})

module.exports = {
  init: (controller, cb) => {
    render(<App controller={controller}/>, document.getElementById('react-root'), cb)
  }
}
