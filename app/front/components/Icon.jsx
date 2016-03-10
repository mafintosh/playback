'use strict'

const React = require('react')

module.exports = React.createClass({

  propTypes: {
    icon: React.PropTypes.string.isRequired,
    size: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.number
    ]),
    style: React.PropTypes.object
  },

  getDefaultProps () {
    return {
      size: 24
    }
  },

  _renderGraphic () {
    switch (this.props.icon) {
      case 'play':
        return (
          <g><path d='M8 5v14l11-7z'></path></g>
        )
      case 'pause':
        return (
          <g><path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z'></path></g>
        )
      case 'playlist-empty':
        return (
          <g><path d='M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z'></path></g>
        )
      case 'playlist':
        return (
          <g><path d='M3 18h18v-2h-18v2zm0-5h18v-2h-18v2zm0-7v2h18v-2h-18z'></path></g>
        )
      case 'cast':
        return (
          <g><path d='M21 3h-18c-1.1 0-2 .9-2 2v3h2v-3h18v14h-7v2h7c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2zm-20 15v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z'></path></g>
        )
      case 'cast-connected':
        return (
          <g><path d='M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7h-14v1.63c3.96 1.28 7.09 4.41 8.37 8.37h5.63v-10zm-18 3v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7h-18c-1.1 0-2 .9-2 2v3h2v-3h18v14h-7v2h7c1.1 0 2-.9 2-2v-14c0-1.1-.9-2-2-2z'></path></g>
        )
      case 'fullscreen':
        return (
          <g><path d='M7 14h-2v5h5v-2h-3v-3zm-2-4h2v-3h3v-2h-5v5zm12 7h-3v2h5v-5h-2v3zm-3-12v2h3v3h2v-5h-5z'></path></g>
        )
      case 'fullscreen-exit':
        return (
          <g><path d='M5 16h3v3h2v-5h-5v2zm3-8h-3v2h5v-5h-2v3zm6 11h2v-3h3v-2h-5v5zm2-11v-3h-2v5h5v-2h-3z'></path></g>
        )
      case 'volume-up':
        return (
          <g><path d='M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z'></path></g>
        )
      case 'volume-mute':
        return (
          <g><path d='M7 9v6h4l5 5V4l-5 5H7z'></path></g>
        )
      case 'volume-down':
        return (
          <g><path d='M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z'></path></g>
        )
      case 'volume-off':
        return (
          <g><path d='M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'></path></g>
        )
      case 'file-download':
        return (
          <g><path d='M19 9h-4v-6h-6v6h-4l7 7 7-7zm-14 9v2h14v-2h-14z'></path></g>
        )
      case 'closed-caption':
        return (
          <g><path d='M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z'></path></g>
        )
      case 'highlight-remove':
        return (
          <g><path d='M14.59 8l-2.59 2.59-2.59-2.59-1.41 1.41 2.59 2.59-2.59 2.59 1.41 1.41 2.59-2.59 2.59 2.59 1.41-1.41-2.59-2.59 2.59-2.59-1.41-1.41zm-2.59-6c-5.53 0-10 4.47-10 10s4.47 10 10 10 10-4.47 10-10-4.47-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'></path></g>
        )
      case 'airplay':
        return (
          <g><path d='M6 22h12l-6-6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v-2H3V5h18v12h-4v2h4c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z'></path></g>
        )
      default:
        return
    }
  },

  render () {
    const styles = {
      fill: 'currentcolor',
      verticalAlign: 'middle',
      width: this.props.size, // CSS instead of the width attr to support non-pixel units
      height: this.props.size // Prevents scaling issue in IE
    }

    return (
      <svg viewBox='0 0 24 24' preserveAspectRatio='xMidYMid meet' fit style={styles}>
        {this._renderGraphic()}
      </svg>
    )
  }
})
