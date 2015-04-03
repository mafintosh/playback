var events = require('events')

module.exports = function ($video) {
  var that = new events.EventEmitter()

  that.width = 0
  that.height = 0
  that.element = $video

  $video.addEventListener('loadedmetadata', function () {
    that.width = $video.videoWidth
    that.height =  $video.videoHeight
    that.ratio = that.width / that.height
    that.emit('metadata')
  }, false)

  that.time = function (time) {
    if (time) $video.currentTime = time
    return $video.currentTime
  }

  that.play = function (url) {
    $video.innerHTML = '' // clear
    var $src = document.createElement('source')
    $src.setAttribute('src', url)
    $src.setAttribute('type', 'video/mp4')
    $video.appendChild($src)
    $video.play()
  }

  that.subtitles = function (buf) {
    if ($video.querySelector('track')) $video.removeChild($video.querySelector('track'))
    var $track = document.createElement('track')
    $track.setAttribute('default', 'default')
    $track.setAttribute('src', 'data:text/vtt;base64,'+buf.toString('base64'))
    $track.setAttribute('label', 'Subtitles')
    $track.setAttribute('kind', 'subtitles')
    $video.appendChild($track)
  }

  return that
}
