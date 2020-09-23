module.exports = [
  require('./client/rollup.config.js'),
  ...require('./server/rollup.config.js'),
  require('./vti/rollup.config.js')
];
