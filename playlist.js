var torrents = require('torrent-stream')
var request = require('request')
var duplex = require('duplexify')
var ytdl = require('ytdl-core')
var events = require('events')
var path = require('path')
var fs = require('fs')
var vtt = require('srt-to-vtt')
var concat = require('concat-stream')

var noop = function () {}

module.exports = function () {
  var that = new events.EventEmitter()

  that.entries = []

  var onmagnet = function (link, cb) {
    console.log('torrent ' + link)

    var engine = torrents(link)

    engine.swarm.add('127.0.0.1:51413') // me!

    engine.on('ready', function () {
      console.log('torrent ready')

      engine.files.forEach(function (f) {
        f.downloadSpeed = engine.swarm.downloadSpeed
        if (/\.(mp4|mkv|mp3)$/i.test(f.name)) {
          f.select()
          f.id = that.entries.push(f) - 1
        }
      })

      setInterval(function () {
        console.log(engine.swarm.downloadSpeed() + ' (' + engine.swarm.wires.length + ')')
      }, 1000)

      that.emit('update')
      cb()
    })
  }

  var ontorrent = function (link, cb) {
    fs.readFile(link, function (err, buf) {
      if (err) return cb(err)
      onmagnet(buf, cb)
    })
  }

  var onyoutube = function (link, cb) {
    var file = {}
    var url = link.split(':')[1]
    url = 'https:' + url

    getYoutubeData(function (err, data) {
      if (err) return cb(err)
      var fmt = data.fmt
      var info = data.info
      request({method: 'HEAD', url: fmt.url}, function (err, resp, body) {
        if (err) return cb(err)
        var len = resp.headers['content-length']
        if (!len) return cb(new Error('no content-length on response'))
        file.length = +len
        file.name = info.title

        file.createReadStream = function (opts) {
          if (!opts) opts = {}
          // fetch this for every range request
          // TODO try and avoid doing this call twice the first time
          getYoutubeData(function (err, data) {
            if (err) return cb(err)
            var vidUrl = data.fmt.url
            if (opts.start || opts.end) vidUrl += '&range=' + ([opts.start || 0, opts.end || len].join('-'))
            stream.setReadable(request(vidUrl))
          })

          var stream = duplex()
          return stream
        }
        file.id = that.entries.push(file) - 1
        that.emit('update')
        cb()
      })
    })

    function getYoutubeData (cb) {
      ytdl.getInfo(url, function (err, info) {
        if (err) return cb(err)

        var vidFmt
        var formats = info.formats

        formats.sort(function sort (a, b) {
          return +a.itag - +b.itag
        })

        var vidFmt
        formats.forEach(function (fmt) {
          // prefer webm
          if (fmt.itag === '46') return vidFmt = fmt
          if (fmt.itag === '45') return vidFmt = fmt
          if (fmt.itag === '44') return vidFmt = fmt
          if (fmt.itag === '43') return vidFmt = fmt

          // otherwise h264
          if (fmt.itag === '38') return vidFmt = fmt
          if (fmt.itag === '37') return vidFmt = fmt
          if (fmt.itag === '22') return vidFmt = fmt
          if (fmt.itag === '18') return vidFmt = fmt
        })

        if (!vidFmt) return cb (new Error('No suitable video format found'))

        cb(null, {info: info, fmt: vidFmt})
      })
    }
  }

  var onfile = function (link, cb) {
    var file = {}

    fs.stat(link, function (err, st) {
      if (err) return cb(err)

      file.length = st.size
      file.name = path.basename(link)
      file.createReadStream = function (opts) {
        return fs.createReadStream(link, opts)
      }

      file.id = that.entries.push(file) - 1

      var ondone = function () {
        that.emit('update')
        cb()
      }
      var basename = link.substr(0, link.lastIndexOf('.'))
      var extensions = ['srt', 'vtt']
      var next = function () {
        var ext = extensions.shift()
        if (!ext) return ondone()

        fs.exists(basename + '.' + ext, function(exists) {
          if (!exists) return next()
          fs.createReadStream(basename + '.' + ext).pipe(vtt()).pipe(concat(function(data) {
            file.subtitles = data
            ondone()
          }))
        })
      }
      next()
    })
  }

  var onhttplink = function (link, cb) {
    var file = {}

    file.name = link.lastIndexOf('/') > -1 ? link.split('/').pop() : link

    file.createReadStream = function (opts) {
      if (!opts) opts = {}

      if (opts && (opts.start || opts.end)) {
        var rs = 'bytes=' + (opts.start || 0) + '-' + (opts.end || file.length || '')
        return request(link, {headers: {Range: rs}})
      }

      return request(link)
    }

    // first, get the head for the content length.
    // IMPORTANT: servers without HEAD will not work.
    request.head(link, function (err, response) {
      if (err) return cb(err)
      if (!/2\d\d/.test(response.statusCode)) return cb(new Error('request failed'))

      file.length = Number(response.headers['content-length'])
      file.id = that.entries.push(file) - 1
      that.emit('update')
      cb()
    })
  }

  var onipfslink = function (link, cb) {
    var local = 'localhost:8080' // todo: make this configurable
    var gateway = 'gateway.ipfs.io'
    var file = {}

    // first, try the local http gateway
    console.log('trying local ipfs gateway at ' + local)
    var u = 'http://' + local + link
    onhttplink(u, function (err) {
      if (!err) return cb() // done.

      // error? ok try fuse... maybe the gateway's broken.
      console.log('trying mounted ipfs fs (just in case)')
      onfile(link, function (err) {
        if (!err) return cb() // done.

        // worst case, try global ipfs gateway.
        console.log('trying ipfs global gateway')
        var u = 'http://' + gateway + link
        onhttplink(u, cb)
      })
    })
  }

  that.selected = null

  that.deselect = function () {
    that.selected = null
    that.emit('deselect')
  }

  that.selectNext = function () {
    if (!that.entries.length) return null
    if (!that.selected) return that.select(0)
    if (that.selected.id === that.entries.length - 1) return null
    return that.select(that.selected.id + 1)
  }

  that.select = function (id) {
    that.selected = that.get(id)
    that.emit('select')
    return that.selected
  }

  that.get = function (id) {
    return that.entries[id]
  }

  that.add = function (link, cb) {
    var protoPrefix = "playback://"
    if (link.substr(0, protoPrefix.length) == protoPrefix)
      link = link.substr(protoPrefix.length)

    if (!cb) cb = noop
    if (/magnet:/.test(link)) return onmagnet(link, cb)
    if (/\.torrent$/i.test(link)) return ontorrent(link, cb)
    if (/youtube\.com\/watch/i.test(link)) return onyoutube(link, cb)
    if (/^\/*(ipfs|ipns)\//i.test(link)) return onipfslink(link, cb)
    if (/^\/https?:\/\//i.test(link)) return onhttplink(link, cb)
    onfile(link, cb)
  }

  return that
}