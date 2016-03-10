'use strict'

const fs = require('fs')
const magnet = require('./magnet')

module.exports = {
  test (uri) {
    return /\.torrent$/i.test(uri)
  },

  load (uri) {
    return new Promise((resolve, reject) => {
      fs.readFile(uri, function (err, link) {
        if (err) return reject(err)
        magnet.load(link).then(resolve).catch(reject)
      })
    })
  }
}
