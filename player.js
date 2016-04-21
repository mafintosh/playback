var events = require('events')
var network = require('network-address')

module.exports = function ($video) {
  var that = new events.EventEmitter()
  var atEnd = false
  var lastUrl = null

  that.setMaxListeners(0)

  that.width = 0
  that.height = 0
  that.element = $video

  var chromecast = null
  var chromecastTime = 0
  var chromecastOffset = 0
  var chromecastSubtitles = 1
  var interval = null

  var onerror = function () {
    if (chromecast) chromecast.removeListener('error', onerror)
    that.chromecast(null)
  }

  var onmetadata = function (err, status) {
    if (err) return onerror(err)
    if (chromecastTime) chromecastOffset = 0
    chromecastTime = status.currentTime
    chromecastSubtitles = 1
    that.duration = status.media.duration
    that.emit('metadata')

    clearInterval(interval)
    interval = setInterval(function () {
      chromecast.status(function (err, status) {
        if (err) return onerror(err)

        if (!status) {
          chromecastOffset = 0
          clearInterval(interval)
          atEnd = true
          that.playing = false
          that.emit('pause')
          that.emit('end')
          return
        }

        if (chromecastTime) chromecastOffset = 0
        chromecastTime = status.currentTime
      })
    }, 1000)
  }

  that.casting = false
  that.chromecast = function (player) {
    chromecastOffset = chromecast ? 0 : $video.currentTime
    clearInterval(interval)
    if (chromecast && that.playing) chromecast.stop()
    chromecast = player
    that.casting = player
    if (chromecast) chromecast.on('error', onerror)
    if (!that.playing) return
    media.play(lastUrl, that.casting ? chromecastOffset : chromecastTime)
  }

  $video.addEventListener('seeked', function () {
    if (chromecast) return
    that.emit('seek')
  }, false)

  $video.addEventListener('ended', function () {
    if (chromecast) return
    atEnd = true
    that.playing = false
    that.emit('pause')
    that.emit('end')
  }, false)

  $video.addEventListener('loadedmetadata', function () {
    if (chromecast) return
    that.width = $video.videoWidth
    that.height =  $video.videoHeight
    that.ratio = that.width / that.height
    that.duration = $video.duration
    that.emit('metadata')
  }, false)

  that.time = function (time) {
    atEnd = false
    if (chromecast) {
      if (arguments.length) {
        chromecastOffset = 0
        chromecast.seek(time)
      }
      return chromecastOffset || chromecastTime
    }
    if (arguments.length) $video.currentTime = time
    return $video.currentTime
  }

  that.playing = false

  that.play = function (url, time) {
    if (!url && !lastUrl) return
    var changed = url && lastUrl !== url
    if (changed) subs = null
    if (chromecast) {
      $video.innerHTML = '' // clear
      $video.pause()
      $video.load()
      if (url) lastUrl = url
      else url = lastUrl
      atEnd = false
      if (url) {
        var mediaUrl = url.replace('127.0.0.1', network())
        var subsUrl = mediaUrl.replace(/(:\/\/.+)\/.*/, '$1/subtitles')
        var subsList = []
        for (var i = 0; i < 100; i++) subsList.push(subsUrl)
        chromecast.play(mediaUrl, {title: 'Playback', seek: time || 0, subtitles: subsList, autoSubtitles: !!subs }, onmetadata)
      } else {
        chromecast.resume()
      }
    } else {
      if (atEnd && url === lastUrl) that.time(0)
      if (!url) {
        $video.play()
      } else {
        lastUrl = url
        atEnd = false
        $video.innerHTML = '' // clear
        var $src = document.createElement('source')
        $src.setAttribute('src', url)
        $src.setAttribute('type', 'video/mp4')
        $video.appendChild($src)
        if (changed) $video.load()
        $video.play()
        if (time) $video.currentTime = time
      }
    }
    that.playing = true
    that.emit('play')
  }

  that.pause = function () {
    if (chromecast) chromecast.pause()
    else $video.pause()
    that.playing = false
    that.emit('pause')
  }

  var subs = null
  that.subtitles = function (buf) {
    if (!arguments.length) return subs
    subs = buf

    if (chromecast) {
      if (!buf) chromecast.subtitles(false)
      else chromecast.subtitles(++chromecastSubtitles)
      return
    }

    if ($video.querySelector('track')) $video.removeChild($video.querySelector('track'))
    if (!buf) return null
    var $track = document.createElement('track')
    $track.setAttribute('default', 'default')
    $track.setAttribute('src', 'data:text/vtt;base64,'+buf.toString('base64'))
    $track.setAttribute('label', 'Subtitles')
    $track.setAttribute('kind', 'subtitles')
    $video.appendChild($track)
    that.emit('subtitles', buf)
    return buf
  }

  that.volume = function (value) {
    $video.volume = value
  }

  that.playbackRate = function (value) {
    $video.playbackRate = value
  }

  return that
}
