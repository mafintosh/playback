# how to contribute?

playback is an video player build using [electron](https://github.com/atom/electron) (formerly known as atom-shell) and [io.js](https://iojs.org/en/index.html). first you should install latest node.js or io.js (which installs npm).
the easiest way to get started with development is to first clone this git repo and run

```
npm install
npm start video.mp4 # or some other .mp4 file you have laying around
```

this will open playback in development mode and it should start playing video.mp4.
the main entrypoint to the application is `app.js` which is executed by atom-shell.
this file spawns.js a webview that is run with `index.html` which includes `index.js`.

# i want to contribute but don't know where to start

dont worry! just go to the issue page and find an issue marked "help wanted".
these issues are normally well suited for people looking to help out in one way or the other
