var request = require('request')
var drop = require('drag-and-drop-files')
var filereader = require('filereader-stream')
var mdns = require('multicast-dns')()
var concat = require('concat-stream')
var vtt = require('srt-to-vtt')
var ipc = require('ipc')
var http = require('http')
var rangeParser = require('range-parser')
var pump = require('pump')
var fs = require('fs')
var eos = require('end-of-stream')
var minimist = require('minimist')
var JSONStream = require('JSONStream')
var network = require('network-address')
var player = require('./player')
var playlist = require('./playlist')
var mouseidle = require('./mouseidle')

var argv = minimist(JSON.parse(window.location.toString().split('#')[1]), {
  alias: {follow: 'f'},
  boolean: ['follow']
})

var on = function (el, name, fn) {
  el.addEventListener(name, fn, false)
}

var $ = document.querySelector.bind(document)
var media = player($('#player'))
var list = playlist()

drop($('body'), function (files) {
  var onsubs = function (data) {
    media.subtitles(data)
  }

  filereader(files[0]).pipe(vtt()).pipe(concat(onsubs))
})

var isFullscreen = false

on($('#controls-fullscreen'), 'click', function (e) {
  var $icon = $('#controls-fullscreen .mega-octicon')
  if (isFullscreen) {
    isFullscreen = false
    $icon.className = 'mega-octicon octicon-screen-full'
    ipc.send('exit-full-screen')
  } else {
    isFullscreen = true
    $icon.className = 'mega-octicon octicon-screen-normal'
    ipc.send('enter-full-screen')
  }
})

on($('#controls-timeline'), 'click', function (e) {
  var time = e.pageX / $('#controls-timeline').offsetWidth * media.duration
  media.time(time)
})

mouseidle($('#drag'), 3000, 'hide-cursor')

list.on('select', function () {
  $('#controls-name').innerText = list.selected.name
  media.play('http://127.0.0.1:' + server.address().port + '/' + list.selected.id)
})

list.once('update', function () {
  list.select(list.entries.length - 1)
})

var formatTime = function (secs) {
  var hours = (secs / 3600) | 0
  var mins = ((secs - hours * 3600) / 60) | 0
  secs = (secs - (3600 * hours + 60 * mins)) | 0
  if (mins < 10) mins = '0' + mins
  if (secs < 10) secs = '0' + secs
  return (hours ? hours + ':' : '') + mins + ':' + secs
}

var updateInterval
media.on('metadata', function () {
  if (!isFullscreen) {
    ipc.send('resize', {
      width: media.width,
      height: media.height,
      ratio: media.ratio
    })
  }

  $('#controls-time-total').innerText = formatTime(media.duration)
  $('#controls-time-current').innerText = '00:00'

  clearInterval(updateInterval)
  updateInterval = setInterval(function () {
    $('#controls-timeline-position').style.width = (100 * (media.time() / media.duration)) + '%'
    $('#controls-time-current').innerText = formatTime(media.time())
  }, 250)
})

on($('#controls-play'), 'click', function () {
  if (media.playing) media.pause()
  else media.play()
})

media.on('play', function () {
  $('#controls-play .mega-octicon').className = 'mega-octicon octicon-playback-pause'
})

media.on('pause', function () {
  $('#controls-play .mega-octicon').className = 'mega-octicon octicon-playback-play'
})

var server = http.createServer(function (req, res) {
  console.log('request for ' + req.url + ' ' + req.headers.range)

  if (req.url === '/follow') { // TODO: do not hardcode /0
    if (!list.selected) return res.end()
    var stringify = JSONStream.stringify()

    var onseek = function () {
      stringify.write({type: 'seek', time: media.time() })
    }

    var onsubs = function (data) {
      stringify.write({type: 'subtitles', data: data.toString('base64')})
    }

    stringify.pipe(res)
    stringify.write({type: 'open', url: 'http://' + network() + ':' + server.address().port + '/' + list.selected.id, time: media.time() })

    media.on('subtitles', onsubs)
    media.on('seek', onseek)
    eos(res, function () {
      media.removeListener('subtitles', onsubs)
      media.removeListener('seek', onseek)
    })
    return
  }

  var id = Number(req.url.slice(1))
  var file = list.get(id)

  if (!file) {
    res.statusCode = 404
    res.end()
    return
  }

  var range = req.headers.range && rangeParser(file.length, req.headers.range)[0]

  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Content-Type', 'video/mp4')

  if (!range) {
    res.setHeader('Content-Length', file.length)
    if (req.method === 'HEAD') return res.end()
    pump(file.createReadStream(), res)
    return
  }

  res.statusCode = 206
  res.setHeader('Content-Length', range.end - range.start + 1)
  res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length)
  if (req.method === 'HEAD') return res.end()
  pump(file.createReadStream(range), res)
})

server.listen(0, function () { // 10000 in dev
  argv._.forEach(function (file) {
    if (file) list.add(file)
  })

  if (argv.follow) {
    mdns.on('response', function onresponse(response) {
      response.answers.forEach(function (a) {
        if (a.name !== 'playback') return
        clearInterval(interval)
        mdns.removeListener('response', onresponse)

        var host = a.data.target + ':' + a.data.port

        request('http://' + host + '/follow').pipe(JSONStream.parse('*')).on('data', function (data) {
          if (data.type === 'open') {
            media.play(data.url)
            media.time(data.time)
          }

          if (data.type === 'seek') {
            media.time(data.time)
          }

          if (data.type === 'subtitles') {
            media.subtitles(data.data)
          }
        })
      })
    })

    var query = function () {
      mdns.query({
        questions: [{
          name: 'playback',
          type: 'SRV'
        }]
      })
    }

    var interval = setInterval(query, 5000)
    query()
  } else {
    mdns.on('query', function (query) {
      var valid = query.questions.some(function (q) {
        return q.name === 'playback'
      })

      if (!valid) return

      mdns.respond({
        answers: [{
          type: 'SRV',
          ttl: 5,
          name: 'playback',
          data: {port: server.address().port, target: network()}
        }]
      })
    })
  }

  setTimeout(function () {
    ipc.send('ready')
  }, 10)
})
