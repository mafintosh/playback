'use strict'

const http = require('http')
const util = require('util')
const rangeParser = require('range-parser')
const pump = require('pump')
const network = require('network-address')
const EventEmitter = require('events').EventEmitter
const playerEvents = require('./players/playerEvents')
const multicastdns = require('multicast-dns')
const request = require('request')
const JSONStream = require('JSONStream')
const eos = require('end-of-stream')

const mdns = multicastdns()

function Server (controller, follow, cb) {
  this.controller = controller

  this.server = http.createServer(this.route.bind(this)).listen(0, () => {
    const path = this.getPath()
    console.log('Playback server running at: ' + path)
    cb(path)
  })

  if (follow) {
    this._startMDNSFollow()
  } else {
    this._startMDNSListen()
  }
}

Object.assign(Server.prototype, {

  route (req, res) {
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    if (req.url === '/follow') return this.handleFollow(req, res)
    if (req.url.endsWith('/subtitles')) return this.handleSubtitles(req, res)
    return this.handleFile(req, res)
  },

  handleSubtitles (req, res) {
    const fileId = decodeURIComponent(req.url.split('/')[1])
    const file = this.controller.getFile(fileId)

    if (!file) {
      res.statusCode = 404
      res.end()
      return
    }

    const buf = file.subtitles

    if (buf) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
      res.setHeader('Content-Length', buf.length)
      res.end(buf)
    } else {
      res.statusCode = 404
      res.end()
    }
  },

  handleFollow (req, res) {
    const stringify = JSONStream.stringify()
    const state = this.controller.getState()

    stringify.pipe(res)

    stringify.write({ type: 'update', arguments: [state] })

    // Initial sync
    const currentFile = state.currentFile
    const status = state.status
    const currentTime = state.currentTime

    if (status !== this.controller.STATUS_STOPPED) {
      stringify.write({ type: 'start', arguments: [currentFile, status === this.controller.STATUS_PLAYING, currentTime] })
    }

    const listeners = {}

    // Add listeners
    playerEvents.forEach((f) => {
      const l = function () {
        stringify.write({ type: f, arguments: Array.prototype.slice.call(arguments) })
      }
      listeners[f] = l
      this.controller.on(f, l)
    })

    // Remove listeners on eos
    eos(res, () => {
      playerEvents.forEach((f) => {
        this.controller.removeListener(f, listeners[f])
      })
    })
  },

  handleFile (req, res) {
    const fileId = decodeURIComponent(req.url.split('/')[1])
    const file = this.controller.getFile(fileId)

    if (!file) {
      res.statusCode = 404
      res.end()
      return
    }

    const range = req.headers.range && rangeParser(file.length, req.headers.range)[0]

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
  },

  getPath () {
    return `http://${network()}:${this.server.address().port}`
  },

  _startMDNSListen () {
    mdns.on('query', (query) => {
      const valid = query.questions.some(function (q) {
        return q.name === 'playback'
      })

      if (!valid) return

      mdns.respond({
        answers: [{
          type: 'SRV',
          ttl: 5,
          name: 'playback',
          data: { port: this.server.address().port, target: network() }
        }]
      })
    })
  },

  _startMDNSFollow () {
    // query for playback server
    const query = () => {
      mdns.query({
        questions: [{
          name: 'playback',
          type: 'SRV'
        }]
      })
    }

    // query every 5 seconds
    const interval = setInterval(query, 5000)
    query()

    // check if a response is from playback, then stream /follow
    const self = this
    mdns.on('response', function onresponse (response) {
      response.answers.forEach((a) => {
        if (a.name !== 'playback') return
        clearInterval(interval)
        mdns.removeListener('response', onresponse)

        request('http://' + a.data.target + ':' + a.data.port + '/follow').pipe(JSONStream.parse('*')).on('data', (data) => {
          if (playerEvents.indexOf(data.type) > -1) {
            self.controller[data.type].apply(self.controller, data.arguments)
          } else if (data.type === 'update') {
            self.controller.setState(data.arguments[0])
          }
        })
      })
    })
  }
})

util.inherits(Server, EventEmitter)

module.exports = Server
