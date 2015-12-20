import UI from './UI.jsx'
import minimist from 'minimist'

import controller from '../Controller'

const argv = minimist(JSON.parse(window.location.toString().split('#')[1]), {
  alias: { follow: 'f' },
  boolean: ['follow']
})

const uris = argv._

controller.on('ready', () => {
  controller.setVideoElement(document.getElementById('video'))
  UI.init(controller, () => {
    controller.setPlayer(controller.PLAYER_HTML5VIDEO)
    if (uris.length) {
      controller.addAllAndPlay(uris)
    }
  })
})
