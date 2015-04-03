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
var minimist = require('minimist')
var network = require('network-address')
var player = require('./player')
var playlist = require('./playlist')

var argv = minimist(JSON.parse(window.location.toString().split('#')[1]), {
  alias: {follow: 'f'},
  boolean: ['follow']
})

var media = player(document.querySelector('#player'))
var list = playlist()

drop(document.querySelector('body'), function (files) {
  var onsubs = function (data) {
    media.subtitles(data)
  }

  filereader(files[0]).pipe(vtt()).pipe(concat(onsubs))
})

list.once('update', function () {
  media.play('http://127.0.0.1:' + server.address().port + '/0')
})

media.on('metadata', function () {
  ipc.send('metadata', {
    width: media.width,
    height: media.height,
    ratio: media.ratio
  })
})

var server = http.createServer(function (req, res) {
  console.log('request for ' + req.url + ' ' + req.headers.range)

  if (req.url === '/follow') { // TODO: do not hardcode /0
    res.end(JSON.stringify({url: 'http://' + network() + ':' + server.address().port + '/0', time: media.time() }))
    return
  }

  var id = Number(req.url.slice(1))
  var file = list.entries[id]

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

        request('http://' + host + '/follow', {json: true}, function (err, response) {
          if (err) return
          var body = response.body
          media.play(body.url)
          media.time(body.time)
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
