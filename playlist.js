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
      that.emit('update')
      cb()
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
    if (!cb) cb = noop
    if (/magnet:/.test(link)) return onmagnet(link, cb)
    if (/\.torrent$/i.test(link)) return ontorrent(link, cb)
    onfile(link, cb)
  }

  return that
}