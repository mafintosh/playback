import debounce from 'lodash.debounce'

module.exports = (elem, timeout, className) => {
  const hide = debounce(() => {
    elem.classList.add(className)
  }, timeout)

  const show = () => {
    elem.classList.remove(className)
  }

  const listener = () => {
    show()
    hide()
  }

  window.addEventListener('mousemove', listener)
  window.addEventListener('mousedown', listener)
  window.addEventListener('mouseup', listener)
}
