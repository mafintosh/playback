import request from 'request'

module.exports = {
  test(uri) {
    return /^https?:\/\//i.test(uri)
  },

  load(uri) {
    return new Promise((resolve, reject) => {
      const file = { uri }

      file.name = uri.lastIndexOf('/') > -1 ? uri.split('/').pop() : uri

      file.createReadStream = (opts = {}) => {
        if (opts.start || opts.end) {
          const rs = 'bytes=' + (opts.start || 0) + '-' + (opts.end || file.length || '')
          return request(uri, { headers: { Range: rs } })
        }
        return request(uri)
      }

      // first, get the head for the content length.
      // IMPORTANT: servers without HEAD will not work.
      request.head(uri, (err, response) => {
        if (err) return reject(err)
        if (!/2\d\d/.test(response.statusCode)) return reject(new Error('request failed'))

        file.length = Number(response.headers['content-length'])
        resolve(file)
      })
    })
  }
}
