var events = require('events')

module.exports = function ($video) {
  var that = new events.EventEmitter()
  var atEnd = false
  var lastUrl = null

  that.setMaxListeners(0)

  that.width = 0
  that.height = 0
  that.element = $video

  $video.addEventListener('seeked', function () {
    that.emit('seek')
  }, false)

  $video.addEventListener('ended', function () {
    atEnd = true
    that.playing = false
    that.emit('pause')
    that.emit('end')
  }, false)

  $video.addEventListener('loadedmetadata', function () {
    that.width = $video.videoWidth
    that.height =  $video.videoHeight
    that.ratio = that.width / that.height
    that.duration = $video.duration
    that.emit('metadata')
  }, false)

  that.time = function (time) {
    atEnd = false
    if (time) $video.currentTime = time
    return $video.currentTime
  }

  that.playing = false

  that.play = function (url) {
    if (atEnd && url === lastUrl) $video.time(0)
    var changed = url && lastUrl !== url
    lastUrl = url
    atEnd = false
    $video.innerHTML = '' // clear
    var $src = document.createElement('source')
    $src.setAttribute('src', url)
    $src.setAttribute('type', 'video/mp4')
    $video.appendChild($src)
    if (changed) $video.load()
    $video.play()
    that.playing = true
    that.emit('play')
  }

  that.pause = function () {
    $video.pause()
    that.playing = false
    that.emit('pause')
  }

  that.subtitles = function (buf) {
    if ($video.querySelector('track')) $video.removeChild($video.querySelector('track'))
    var $track = document.createElement('track')
    $track.setAttribute('default', 'default')
    $track.setAttribute('src', 'data:text/vtt;base64,'+buf.toString('base64'))
    $track.setAttribute('label', 'Subtitles')
    $track.setAttribute('kind', 'subtitles')
    $video.appendChild($track)
    that.emit('subtitles', buf)
  }

  return that
}
