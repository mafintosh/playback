module.exports = {
  test(uri) {
    return /youtube\.com\/watch/i.test(uri)
  },

  load(uri) {
    var file = {}
    var url = /https?:/.test(uri) ? uri : 'https:' + uri

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
}
