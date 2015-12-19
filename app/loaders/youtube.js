import ytdl from 'ytdl-core'
import request from 'request'
import duplex from 'duplexify'

module.exports = {
  test(uri) {
    return /youtube\.com\/watch/i.test(uri)
  },

  _getYoutubeData(url) {
    return new Promise((resolve, reject) => {
      ytdl.getInfo(url, (err, info) => {
        if (err) return reject(err)

        let vidFmt
        const formats = info.formats

        formats.sort((a, b) => {
          return +a.itag - +b.itag
        })

        formats.forEach(function (fmt) {
          // prefer webm
          if (fmt.itag === '46') vidFmt = fmt
          if (fmt.itag === '45') vidFmt = fmt
          if (fmt.itag === '44') vidFmt = fmt
          if (fmt.itag === '43') vidFmt = fmt

          // otherwise h264
          if (fmt.itag === '38') vidFmt = fmt
          if (fmt.itag === '37') vidFmt = fmt
          if (fmt.itag === '22') vidFmt = fmt
          if (fmt.itag === '18') vidFmt = fmt
          return
        })

        if (!vidFmt) return reject(new Error('No suitable video format found'))

        return resolve({ info, fmt: vidFmt })
      })
    })
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
            })
            return stream
          }
          resolve(file)
        })
      })
    })
  }
}
