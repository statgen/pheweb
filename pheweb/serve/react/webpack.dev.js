const merge = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
    mode: 'development' ,
    optimization: {
	namedModules: true,
	namedChunks: true,
	nodeEnv: 'development',
	removeAvailableModules: false,
	minimize: false
    }
})
