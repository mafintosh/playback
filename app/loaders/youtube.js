import ytdl from 'ytdl-core'
import request from 'request'
import duplex from 'duplexify'

module.exports = {
  test(uri) {
    return /youtube\.com\/watch/i.test(uri)
  },

  load(uri) {
    return new Promise((resolve, reject) => {
      const file = { uri }
      const url = /https?:/.test(uri) ? uri : 'https:' + uri

      this._getYoutubeData(url).then(data => {
        const fmt = data.fmt
        const vidUrl = fmt.url
        const info = data.info
        request({ method: 'HEAD', url: vidUrl }, (err, resp) => {
          if (err) return reject(err)

          const len = resp.headers['content-length']
          if (!len) return reject(new Error('no content-length on response'))
          file.length = +len
          file.name = info.title

          file.createReadStream = (opts = {}) => {
            const stream = duplex()
            this._getYoutubeData(url).then(data2 => {
              let vidUrl2 = data2.fmt.url
              if (opts.start || opts.end) vidUrl2 += '&range=' + ([opts.start || 0, opts.end || len].join('-'))
              stream.setReadable(request(vidUrl2))
            }).catch(err2 => reject(err2))
            return stream
          }
          resolve(file)
        })
      })
    })
  },

  _getYoutubeData(url) {
    return new Promise((resolve, reject) => {
      ytdl.getInfo(url, (err, info) => {
        if (err) return reject(err)

        const formats = info.formats

        formats.sort((a, b) => {
          return +b.itag - +a.itag
        })

        let vidFmt
        formats.some(function (fmt) {
          ['46', '45', '44', '43', '38', '37', '22', '18'].some(itag => {
            if (fmt.itag === itag) {
              vidFmt = fmt
              return
            }
          })
        })

        if (!vidFmt) return reject(new Error('No suitable video format found'))

        return resolve({ info, fmt: vidFmt })
      })
    })
  }
}
