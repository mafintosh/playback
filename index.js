require('babel-register')({
  plugins: ['transform-es2015-modules-commonjs', 'transform-es2015-destructuring', 'transform-es2015-parameters', 'transform-class-properties']
})
require('./app/app.js')
