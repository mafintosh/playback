import fs from 'fs'
import magnet from './magnet'

module.exports = {
  test(uri) {
    return /\.torrent$/i.test(uri)
  },

  load(uri) {
    return new Promise((resolve, reject) => {
      fs.readFile(uri, function (err, link) {
        if (err) return reject(err)
        magnet.load(link).then(resolve).catch(reject)
      })
    })
  }
}
