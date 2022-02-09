const path = require('path')

module.exports = {
  entry: [
    './src/index.tsx'
  ],
  output: {
    path: path.join(__dirname, '/../static'),
    filename: 'bundle.js'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json']
  },
    module: {
	rules: [
	    { test: /\.css$/, loader: "style-loader!css-loader" },
	    {
		test: /\.js?$/,
		loader: 'babel-loader',
		query: { presets: ['@babel/preset-env', '@babel/preset-react'] },
		exclude: /node_modules/
	    },
            { test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/ }
	]
    }
}
