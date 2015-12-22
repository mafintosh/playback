import torrents from 'webtorrent'
import concat from 'concat-stream'
import vtt from 'srt-to-vtt'

module.exports = {
  test(uri) {
    return /magnet:/i.test(uri)
  },

  load(uriOrBuffer) {
    return new Promise((resolve) => {
      console.log(uriOrBuffer)
      const engine = torrents()
      const subtitles = {}

      engine.on('error', err => {
        console.error(err)
      })

      engine.add(uriOrBuffer, torrent => {
        torrent.files.forEach(f => {
          if (/\.(vtt|srt)$/i.test(f.name)) {
            subtitles[f.name] = f
          }
        })

        // TODO: resolve with array of files?
        torrent.files.some(f => {
          f.downloadSpeed = torrent.downloadSpeed()
          if (/\.(mp4|mkv|mp3|mov)$/i.test(f.name)) {
            f.select()
            f.uri = torrent.magnetURI
            const basename = f.name.substr(0, f.name.lastIndexOf('.'))
            const subtitle = subtitles[basename + '.srt'] || subtitles[basename + '.vtt']
            if (subtitle) {
              this._loadSubtitles(subtitle).then(data => {
                f.subtitles = data
                resolve(f)
              })
            } else {
              resolve(f)
            }
            return true
          }
        })

        torrent.on('download', (chunkSize) => {
          console.log('chunk size: ' + chunkSize)
          console.log('total downloaded: ' + torrent.downloaded)
          console.log('download speed: ' + torrent.downloadSpeed())
          console.log('progress: ' + torrent.progress)
          console.log('======')
        })

        torrent.on('done', () => {
          console.log('torrent finished downloading')
        })
      })
    })
  },

  _loadSubtitles(subtitle) {
    return new Promise((resolve) => {
      subtitle.createReadStream().pipe(vtt()).pipe(concat(data => resolve(data)))
    })
  }
}
