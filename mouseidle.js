var on = function (el, name, fn) {
  el.addEventListener(name, fn, false)
}

var $ = document.querySelector.bind(document)

module.exports = function (elem, timeout, className) {
  var max = (timeout / 250) | 0
  var overMovie = false
  var hiding = false
  var moving = 0
  var tick = 0
  var mousedown = false

  var update = function () {
    if (hiding) {
      $('body').className = ''
      hiding = false
    }
  }

  on(elem, 'mouseover', function () {
    overMovie = true
    update()
  })

  on(elem, 'mouseout', function () {
    overMovie = false
  })

  on(elem, 'mousedown', function (e) {
    mousedown = true
    moving = tick
    update()
  })

  on(elem, 'mouseup', function (e) {
    mousedown = false
    moving = tick
  })

  on(window, 'mousemove', function (e) {
    moving = tick
    update()
  })

  setInterval(function () {
    tick++
    if (!overMovie) return
    if (tick - moving < max || mousedown) return
    hiding = true
    $('body').className = className
  }, 250)
}
