import React from 'react'

const KEYCODE_ALT = 18

export default React.createClass({
  propTypes: {
    isFullscreen: React.PropTypes.bool,
    onClose: React.PropTypes.func,
    onMaximize: React.PropTypes.func,
    onMinimize: React.PropTypes.func,
    onFullscreen: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      isFullscreen: false,
      onClose: () => { },
      onMaximize: () => { },
      onMinimize: () => { },
      onFullscreen: () => { }
    }
  },

  getInitialState() {
    return {
      altDown: false
    }
  },

  componentDidMount() {
    document.addEventListener('keydown', this._handleKeyDown)
    document.addEventListener('keyup', this._handleKeyUp)
  },

  componentWillUnMount() {
    document.removeEventListener('keydown', this._handleKeyDown)
    document.removeEventListener('keyup', this._handleKeyUp)
  },

  _handleKeyDown(e) {
    if (e.keyCode === KEYCODE_ALT) {
      this.setState({ altDown: true })
    }
  },

  _handleKeyUp(e) {
    if (e.keyCode === KEYCODE_ALT) {
      this.setState({ altDown: false })
    }
  },

  _handleMaximize() {
    this.props.onMaximize()
  },

  _handleClose() {
    this.props.onClose()
  },

  _handleMinimize() {
    this.props.onMinimize()
  },

  _handleMaximizeOrFullscreen(e) {
    if (e.altKey) {
      this.props.onMaximize()
    } else {
      this.props.onFullscreen()
    }
  },

  render() {
    let maxOrFullIcon
    if (this.state.altDown) {
      maxOrFullIcon = (
        <svg className="titlebar__maximize-svg" x="0px" y="0px" viewBox="0 0 7.9 7.9">
          <polygon points="7.9,4.5 7.9,3.4 4.5,3.4 4.5,0 3.4,0 3.4,3.4 0,3.4 0,4.5 3.4,4.5 3.4,7.9 4.5,7.9 4.5,4.5"></polygon>
        </svg>
      )
    } else {
      maxOrFullIcon = (
        <svg className="titlebar__fullscreen-svg" x="0px" y="0px" viewBox="0 0 6 5.9">
          <path d="M5.4,0h-4L6,4.5V0.6C5.7,0.6,5.3,0.3,5.4,0z"></path>
          <path d="M0.6,5.9h4L0,1.4l0,3.9C0.3,5.3,0.6,5.6,0.6,5.9z"></path>
        </svg>
      )
    }

    return (
      <div className="titlebar">
        <div className="titlebar__stoplight">
          <div className="titlebar__stoplight__close" onClick={this._handleClose}>
            <svg className="titlebar__close-svg" x="0px" y="0px" viewBox="0 0 6.4 6.4">
              <polygon points="6.4,0.8 5.6,0 3.2,2.4 0.8,0 0,0.8 2.4,3.2 0,5.6 0.8,6.4 3.2,4 5.6,6.4 6.4,5.6 4,3.2"></polygon>
            </svg>
          </div>
          <div className="titlebar__stoplight__minimize" onClick={this._handleMinimize}>
            <svg className="titlebar__minimize-svg" x="0px" y="0px" viewBox="0 0 8 1.1">
              <rect width="8" height="1.1"></rect>
            </svg>
          </div>
          <div className="titlebar__stoplight__fullscreen" onClick={this._handleMaximizeOrFullscreen}>
            {maxOrFullIcon}
          </div>
        </div>
      </div>
    )
  }
})
