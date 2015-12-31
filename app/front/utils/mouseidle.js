import debounce from 'lodash.debounce'

module.exports = (elem, timeout, className) => {
  const hide = debounce(() => {
    elem.classList.add(className)
  }, timeout)

  const show = () => {
    elem.classList.remove(className)
  }

  const listener = (e) => {
    hide.cancel()
    show()
    if (!elem.contains(e.target)) {
      hide()
    }
  }

  const mouseout = () => {
    hide()
  }

  document.addEventListener('mousemove', listener)
  document.addEventListener('mousedown', listener)
  document.addEventListener('mouseup', listener)
  document.addEventListener('mouseout', mouseout)
}
