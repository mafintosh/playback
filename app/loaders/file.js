'use strict'

const qfs = require('q-io/fs')
const fs = require('fs')
const vtt = require('srt-to-vtt')
const concat = require('concat-stream')
const path = require('path')

module.exports = {
  test () {
    return true
  },

  /*
   * Load the file and subtitles, if possible.
   */

  load (uri) {
    const filePath = uri.replace(/^file:\/\//i, '')
    const file = { uri, filePath }

    return qfs.stat(filePath)
      .then((stat) => {
        file.length = stat.size
        file.name = path.basename(filePath)
        file.createReadStream = (opts) => fs.createReadStream(filePath, opts)
        return this._getSubtitles(filePath)
      }).then((subtitles) => {
        file.subtitles = subtitles
        return file
      })
  },

  /*
   * Load a subtitle
   */

  loadSubtitle (subtitlePath) {
    return new Promise((resolve) => {
      qfs.exists(subtitlePath).then((exists) => {
        if (exists) {
          fs.createReadStream(subtitlePath).pipe(vtt()).pipe(concat((data) => resolve(data)))
        } else {
          resolve()
        }
      }).catch(resolve)
    })
  },

  /*
   * Attempt to get subtitles relative to the filePath
   */

  _getSubtitles (filePath) {
    const basename = filePath.substr(0, filePath.lastIndexOf('.'))
    const extensions = ['srt', 'vtt']
    const next = () => {
      const ext = extensions.shift()
      if (!ext) return Promise.resolve()

      return this.loadSubtitle(basename + '.' + ext).then((data) => {
        if (!data) { return next() }
        return Promise.resolve(data)
      })
    }
    return next()
  }
}
