'use strict'

const debounce = require('lodash.debounce')

module.exports = (elem, timeout, className) => {
  const hide = debounce(() => {
    elem.classList.add(className)
    document.body.classList.add(className)
  }, timeout)

  const show = () => {
    elem.classList.remove(className)
    document.body.classList.remove(className)
  }

  const listener = (e) => {
    hide.cancel()
    show()
    if (!elem.contains(e.target)) {
      hide()
    }
  }

  document.addEventListener('mousemove', listener)
  document.addEventListener('mousedown', listener)
  document.addEventListener('mouseup', listener)
  document.addEventListener('mouseout', hide)
}
