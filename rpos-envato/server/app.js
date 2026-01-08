require('@babel/register')({
  extends: './.babelrc'
})
require('babel-polyfill')
require('./src')
