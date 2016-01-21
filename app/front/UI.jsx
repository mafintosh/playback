import handleDrop from 'drag-and-drop-files'
import React from 'react'
import { render, findDOMNode } from 'react-dom'
import Slider from 'react-slider'
import CSSTG from 'react-addons-css-transition-group'

import Icon from './components/icon.jsx'
import Titlebar from './components/titlebar.jsx'
import handleIdle from './utils/mouseidle.js'
import HTMLPlayer from '../players/HTML.js'
import WebChimera from '../players/WebChimera.js'

const UI = React.createClass({

  propTypes: {
    emitter: React.PropTypes.object.isRequired
  },

  getInitialState() {
    return {
      playlist: [],
      chromecasts: [],
      volume: 1
    }
  },

  componentDidMount() {
    const el = findDOMNode(this)

    handleIdle(el, 2500, 'hide')
    handleDrop(document.body, files => this._handleLoadFilesEvent(null, files.map(f => f.path)))

    document.addEventListener('dblclick', e => {
      if (el.contains(e.target)) return
      this._handleFullscreenClick()
    })

    document.addEventListener('click', e => {
      if (el.contains(e.target)) return
      this.setState({ uiDialog: null })
    })

    document.addEventListener('keydown', e => {
      if (el.contains(e.target)) return
      if (e.keyCode === 27 && this.state.uiFullscreen) return this._handleFullscreenClick(e)
      if (e.keyCode === 13 && e.metaKey) return this._handleFullscreenClick(e)
      if (e.keyCode === 13 && e.shiftKey) return this._handleFullscreenClick(e)
      if (e.keyCode === 32) return this._handleTogglePlayClick(e)
    })

    document.addEventListener('paste', e => {
      this._handleLoadFilesEvent(null, e.clipboardData.getData('text').split('\n'))
    })

    document.addEventListener('webkitfullscreenchange', () => {
      this.setState({ uiFullscreen: document.webkitIsFullScreen })
    })

    const emitter = this.props.emitter
    this.emitter = emitter

    this._htmlPlayer = new HTMLPlayer(document.getElementById('video'), emitter)
    this._chimeraPlayer = new WebChimera(document.getElementById('canvas'), emitter)

    emitter.on('update', (player, state) => {
      this.setState(state)
    })
  },

  componentWillUpdate(nextProps, nextState) {
    if (nextState.videoWidth && this.state.videoWidth !== nextState.videoWidth) {
      if (!document.webkitIsFullScreen) {
        window.resizeTo(window.innerWidth, nextState.videoHeight / nextState.videoWidth * window.innerWidth | 0)
      }
    }
  },

  _handleTogglePlayClick() {
    if (this.state.currentFile) {
      this.emitter.emit('togglePlay')
    }
  },

  _handlePlaylistIconClick() {
    this.setState({ uiDialog: this.state.uiDialog === 'playlist' ? null : 'playlist' })
  },

  _handleChromecastIconClick() {
    this.emitter.emit('updateChromecasts')
    this.setState({ uiDialog: this.state.uiDialog === 'chromecasts' ? null : 'chromecasts' })
  },

  _handleRefreshChromecastsClick() {
    this.emitter.emit('updateChromecasts')
  },

  _handleCastItemClick(device) {
    this.setState({ uiDialog: null })
    console.log('handle cast item click', device)
    this.emitter.emit('setPlayer', 'chromecast', { deviceId: device.id })
  },

  _handlePlayerClick(player) {
    this.setState({ uiDialog: null })
    this.emitter.emit('setPlayer', player)
  },

  _handlePlaylistItemClick(file) {
    this.setState({ uiDialog: null })
    this.emitter.emit('start', file, true)
  },

  _handlePlaylistRemoveItemClick(file, index, e) {
    e.stopPropagation()
    this.emitter.emit('remove', index)
  },

  _handleSeek(e) {
    const percentage = e.clientX / window.innerWidth
    const time = this.state.duration * percentage
    this.emitter.emit('seek', time)
  },

  _handleVolumeIconClick() {
    this.emitter.emit('setMuted', !this.state.muted)
  },

  _handleVolumeChange(val) {
    this.emitter.emit('setVolume', val / 100)
  },

  _handleFullscreenClick() {
    if (document.webkitIsFullScreen) {
      document.webkitExitFullscreen()
    } else {
      document.body.webkitRequestFullScreen()
    }
  },

  _handleMaximizeClick() {
    this.emitter.emit('maximize')
  },

  _handleMinimizeClick() {
    this.emitter.emit('minimize')
  },

  _handleCloseClick() {
    this.emitter.emit('close')
  },

  _handleAddMediaClick() {
    this.emitter.emit('openFileDialog')
  },

  _handleSubtitlesClick() {
    this.emitter.emit('toggleSubtitles')
  },

  _handleLoadFilesEvent(e, files) {
    this.setState({ uiDialog: null })
    this.emitter.emit('loadFiles', files)
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
          <div className="playlist__item-action" onClick={this._handlePlaylistRemoveItemClick.bind(this, file, i)}><Icon icon="highlight-remove"/></div>
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
    let items = this.state.chromecasts.map((d, i) => {
      const active = d.id === this.state.casting ? 'active' : ''
      return <li key={i} onClick={this._handleCastItemClick.bind(this, d)} className={active}>{d.name}</li>
    })

    if (!items.length) {
      items = [<li key={-1} onClick={this._handleRefreshChromecastsClick}>No chromecasts found. Click to refresh.</li>]
    }

    const players = (
      <ul>
        <li className={this.state.player === 'webchimera' ? 'active' : ''} onClick={this._handlePlayerClick.bind(this, 'webchimera')}>Play with WebChimera(libVLC)</li>
        <li className={this.state.player === 'html' ? 'active' : ''} onClick={this._handlePlayerClick.bind(this, 'html')}>Play with HTML</li>
      </ul>
    )

    return (
      <div key={'chromecasts'} className="dialog chromecasts">
        <ul>{items}</ul>
        {players}
      </div>
    )
  },

  _renderBuffers() {
    const bufferedBars = []
    const buffered = this.state.buffered
    if (buffered && buffered.length) {
      for (let i = 0; i < buffered.length; i++) {
        const left = buffered.start(i) / this.state.duration * 100
        const width = (buffered.end(i) - buffered.start(i)) / this.state.duration * 100
        bufferedBars.push(
          <div key={i} className="controls__timeline__buffered" style={{ transition: `width 250ms ease-in-out`, left: left + '%', width: width + '%' }}></div>
        )
      }
    }
    return bufferedBars
  },

  _renderDialogs() {
    let dialog
    if (this.state.uiDialog === 'playlist') {
      dialog = this._renderPlaylist()
    } else if (this.state.uiDialog === 'chromecasts') {
      dialog = this._renderChromecastDialog()
    }
    return dialog
  },

  _renderEmptyState() {
    let emptyState
    if (!this.state.playlist.length && !this.state.loading) {
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
    return emptyState
  },

  _renderTimelineTooltip() {
    let timelineTooltip
    if (this.state.uiTimelineTooltipPosition) {
      const minLeft = 25
      const maxRight = window.innerWidth - 25
      const value = this._formatTime(this.state.uiTimelineTooltipPosition / window.innerWidth * this.state.duration)
      timelineTooltip = (
        <div className="controls__timeline__tooltip" style={{ left: Math.min(maxRight, Math.max(minLeft, this.state.uiTimelineTooltipPosition)) + 'px' }}>{value}</div>
      )
    }
    return timelineTooltip
  },

  _renderLoadingToast() {
    let loading
    if (this.state.loading) {
      loading = (
        <div className="toast-container">
          <div className="toast">Loading...</div>
        </div>
      )
    }
    return loading
  },

  render() {
    const playing = this.state.status === 'playing'
    const playIcon = playing ? 'pause' : 'play'
    const title = this.state.currentFile ? this.state.currentFile.name : 'No file'
    const { currentTime, duration } = this.state
    const updateSpeed = playing ? 500 : 0
    const progressTime = playing ? currentTime : currentTime
    const progressStyle = {
      transition: `width ${updateSpeed}ms linear`,
      width: duration ? progressTime / duration * 100 + '%' : '0'
    }

    const bufferedBars = this._renderBuffers()
    const dialog = this._renderDialogs()
    const loading = this._renderLoadingToast()
    const emptyState = this._renderEmptyState()
    const timelineTooltip = this._renderTimelineTooltip()

    const hasSubtitles = this.state.currentFile && this.state.currentFile.subtitles
    const showingSubtitles = this.state.showSubtitles

    let volumeIcon
    if (this.state.volume === 0 || this.state.muted) {
      volumeIcon = 'volume-off'
    } else if (this.state.volume > 0.5) {
      volumeIcon = 'volume-up'
    } else if (this.state.volume > 0) {
      volumeIcon = 'volume-down'
    }

    const app = (
      <div className={'ui ' + (this.state.status === 'stopped' ? 'stopped' : '')}>
        {loading}
        {emptyState}
        <Titlebar onFullscreen={this._handleFullscreenClick} onClose={this._handleCloseClick} onMaximize={this._handleMaximizeClick} onMinimize={this._handleMinimizeClick} isFullscreen={this.state.uiFullscreen}/>
        <CSSTG transitionName="fade-in" transitionEnterTimeout={125} transitionLeaveTimeout={125}>
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
            <button className={this.state.chromecasts.length ? '' : 'muted'} onClick={this._handleChromecastIconClick}>
              <Icon icon={this.state.casting ? 'cast-connected' : 'cast'}/>
            </button>
            <button onClick={this._handlePlaylistIconClick}>
              <Icon icon="playlist-empty"/>
            </button>
            <button onClick={this._handleFullscreenClick}>
              <Icon icon={this.state.uiFullscreen ? 'fullscreen-exit' : 'fullscreen'}/>
            </button>
          </div>
        </div>
      </div>
    )
    return app
  }
})

export default {
  init: (emitter, cb) => {
    render(<UI emitter={emitter}/>, document.getElementById('react-root'), cb)
  }
}
