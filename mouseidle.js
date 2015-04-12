var $ = require('dombo')

module.exports = function (elem, timeout, className) {
  var max = (timeout / 250) | 0
  var overMovie = false
  var hiding = false
  var moving = 0
  var tick = 0
  var mousedown = false

  var update = function () {
    if (hiding) {
      $('body').removeClass(className)
      hiding = false
    }
  }

  $(elem).on('mouseover', function () {
    overMovie = true
    update()
  })

  $(elem).on('mouseout', function () {
    overMovie = false
  })

  $(elem).on('mousedown', function (e) {
    mousedown = true
    moving = tick
    update()
  })

  $(elem).on('mouseup', function (e) {
    mousedown = false
    moving = tick
  })

  $(window).on('mousemove', function (e) {
    moving = tick
    update()
  })

  setInterval(function () {
    tick++
    if (!overMovie) return
    if (tick - moving < max || mousedown) return
    hiding = true
    $('body').addClass(className)
  }, 250)
}
