import httpLoader from './http'
import fileLoader from './file'

module.exports = {
  test(uri) {
    return /^\/*(ipfs|ipns)\//i.test(uri)
  },

  load(uri) {
    return new Promise((resolve, reject) => {
      let link = uri
      if (uri[0] !== '/') link = '/' + link // may be stripped in add

      const local = 'localhost:8080' // todo: make this configurable
      const gateway = 'gateway.ipfs.io'

      // first, try the local http gateway
      let u = 'http://' + local + link
      console.log('trying local ipfs gateway: ' + u)
      httpLoader.load(u).catch(() => {
        // error? ok try fuse... maybe the gateway's broken.
        console.log('trying mounted ipfs fs (just in case)')
        return fileLoader.load(link).catch(() => {
          // worst case, try global ipfs gateway.
          u = 'http://' + gateway + link
          console.log('trying local ipfs gateway: ' + u)
          return httpLoader.load(u)
        })
      }).then(resolve).catch(reject)
    })
  }
}
