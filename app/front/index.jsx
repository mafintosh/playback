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

  _handleLoadClick() {
    Controller.addAndStart('https://www.youtube.com/watch?v=IYia8yiIKGQ')
  }

  _handleSeek(e) {
    const percentage = e.clientX / window.innerWidth
    const time = this.state.duration * percentage
    Controller.seekToSecond(time)
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
    const transitionSpeed = htmlEngine.POLL_FREQUENCY + 'ms'

    const app = (
      <div>
        <video src={this.state.stream} ref="video"/>
        <div className="controls">
          <div className="controls__timeline" onClick={this._handleSeek.bind(this)}>
            <div className="controls__timeline__progress" style={{ transition: 'width ' + transitionSpeed + ' linear', width: currentTime / duration * 100 + '%' }}></div>
          </div>
          <div className="controls__toolbar">
            <button onClick={this._handleTogglePlayClick.bind(this)}>
              <Icon icon={playIcon}/>
            </button>
            <button onClick={this._handleLoadClick.bind(this)}>
              <Icon icon="playlist"/>
            </button>
            <div className="controls__title">{title}</div>
            <div>
              {this._formatTime(currentTime)} / {this._formatTime(duration)}
            </div>
          </div>
        </div>
      </div>
    )
    return app
  }
}

render(<App/>, document.getElementById('react-root'))
