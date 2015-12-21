import UI from './UI.jsx'
import minimist from 'minimist'

import controller from '../Controller'

const argv = minimist(JSON.parse(window.location.toString().split('#')[1]), {
  alias: { follow: 'f' },
  boolean: ['follow']
})

const uris = argv._

controller.on('ready', () => {
  UI.init(controller, () => {
    controller.setPlayer(controller.PLAYER_HTML5VIDEO, { element: document.getElementById('video') })
    if (uris.length) {
      controller.addAndPlay(uris)
    }
  })
})
