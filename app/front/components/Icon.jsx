import React from 'react'

class Icon extends React.Component {

  static propTypes = {
    icon: React.PropTypes.string.isRequired,
    size: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ]),
    style: React.PropTypes.object
  }

  static defaultProps = {
    size: 24
  }

  _mergeStyles(...args) {
    return Object.assign({}, ...args)
  }

  _renderGraphic() {
    switch (this.props.icon) {
      case 'play':
        return (
          <g><path d="M8 5v14l11-7z"></path></g>
        )
      case 'pause':
        return (
          <g><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></g>
        )
      case 'playlist':
        return (
          <g><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"></path></g>
        )
      case 'cast':
        return (
          <g><path d="M21 3h-18c-1.1 0-2 .9-2 2v3h2v-3h18v14h-7v2h7c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2zm-20 15v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"></path></g>
        )
      case 'cast-connected':
        return (
          <g><path d="M21 3h-18c-1.1 0-2 .9-2 2v3h2v-3h18v14h-7v2h7c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2zm-20 15v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"></path></g>
        )
      case 'fullscreen':
        return (
          <g><path d="M7 14h-2v5h5v-2h-3v-3zm-2-4h2v-3h3v-2h-5v5zm12 7h-3v2h5v-5h-2v3zm-3-12v2h3v3h2v-5h-5z"></path></g>
        )
      case 'volume-up':
        return (
          <g><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></g>
        )
      case 'volume-mute':
        return (
          <g><path d="M7 9v6h4l5 5V4l-5 5H7z"></path></g>
        )
      case 'volume-down':
        return (
          <g><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"></path></g>
        )
      default:
        return
    }
  }

  render() {
    const styles = {
      fill: 'currentcolor',
      verticalAlign: 'middle',
      width: this.props.size, // CSS instead of the width attr to support non-pixel units
      height: this.props.size // Prevents scaling issue in IE
    }

    return (
      <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fit style={this._mergeStyles(styles, this.props.style)}>
        {this._renderGraphic()}
      </svg>
    )
  }
}

module.exports = Icon
