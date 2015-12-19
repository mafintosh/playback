import React from 'react'
import { render } from 'react-dom'

import Controller from '../Controller'
import HTML5Video from '../engines/HTML5Video'
import Icon from './components/icon'

const htmlEngine = new HTML5Video(Controller)

class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = Controller.getState()
  }

  componentDidMount() {
    Controller.setState({
      engine: htmlEngine
    })
    Controller.on('update', () => {
      this.setState(Controller.getState())
    })
    htmlEngine.setElement(this.refs.video)
  }

  _handleTogglePlayClick() {
    Controller.togglePlay()
  }

  _handlePlaylistClick() {
    Controller.addAndStart('https://www.youtube.com/watch?v=ct47O2EIpWE').catch(err => {
      console.error(err, err.stack)
    })
  }

  _handleCastClick() {

  }

  _handleFullscreenClick() {

  }

  _handleSeek(e) {
    const percentage = e.clientX / window.innerWidth
    const time = this.state.duration * percentage
    Controller.seekToSecond(time)
  }

  _handleVolumeClick() {

  }

  _formatTime(totalSeconds) {
    const hours = (totalSeconds / 3600) | 0
    let mins = ((totalSeconds - hours * 3600) / 60) | 0
    let secs = (totalSeconds - (3600 * hours + 60 * mins)) | 0
    if (mins < 10) mins = '0' + mins
    if (secs < 10) secs = '0' + secs
    return (hours ? hours + ':' : '') + mins + ':' + secs
  }

  render() {
    const playIcon = this.state.status === Controller.STATUS_PLAYING ? 'pause' : 'play'
    const title = this.state.currentFile ? this.state.currentFile.name : 'No file'
    const { currentTime, duration } = this.state
    const progressStyle = {
      transition: `width ${htmlEngine.POLL_FREQUENCY}ms linear`,
      width: currentTime / duration * 100 + '%'
    }

    const bufferedBars = []
    const buffered = this.state.buffered
    if (buffered && buffered.length) {
      for (let i = 0; i < buffered.length; i++) {
        const left = buffered.start(i) / duration * 100
        const width = (buffered.end(i) - buffered.start(i)) / duration * 100
        bufferedBars.push(
          <div key={i} className="controls__timeline__buffered" style={{ transition: progressStyle.transition, left: left + '%', width: width + '%' }}></div>
        )
      }
    }

    const app = (
      <div>
        <video src={this.state.stream} ref="video"/>
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
            <button onClick={this._handlePlaylistClick.bind(this)}>
              <Icon icon="playlist"/>
            </button>
            <button onClick={this._handleCastClick.bind(this)}>
              <Icon icon="cast"/>
            </button>
            <button onClick={this._handleFullscreenClick.bind(this)}>
              <Icon icon="fullscreen"/>
            </button>
          </div>
        </div>
      </div>
    )
    return app
  }
}

render(<App/>, document.getElementById('react-root'))
