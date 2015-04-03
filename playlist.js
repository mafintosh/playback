var torrents = require('torrent-stream')
var request = require('request')
var events = require('events')
var path = require('path')
var fs = require('fs')

var noop = function () {}

module.exports = function () {
  var that = new events.EventEmitter()

  that.entries = []

  var onmagnet = function (link, cb) {
    console.log('torrent ' + link)

    var engine = torrents(link)

    engine.swarm.add('127.0.0.1:51413') // me!

    engine.on('ready', function () {
      engine.files.forEach(function (f) {
        f.select()
      })

      that.entries.push.apply(that.entries, engine.files)
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

  var onfile = function (link, cb) {
    var file = {}

    fs.stat(link, function (err, st) {
      if (err) return cb(err)

      file.length = st.size
      file.name = path.basename(link)
      file.createReadStream = function (opts) {
        return fs.createReadStream(link, opts)
      }

      that.entries.push(file)
      that.emit('update')
      cb()
    })
  }

  that.add = function (link, cb) {
    if (!cb) cb = noop
    if (/magnet:/.test(link)) return onmagnet(link, cb)
    if (/\.torrent$/i.test(link)) return ontorrent(link, cb)
    onfile(link, cb)
  }

  return that
}