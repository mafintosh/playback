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
