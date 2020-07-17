var webpack = require('webpack')

module.exports = {
    entry: [
        "./js/app.js"
    ],
    output: {
        path: __dirname + '/../static',
        filename: "bundle.js"
    },
    resolve: {
	extensions: [".tsx", ".ts", ".js", ".json"]
    },
    module: {
        rules: [
            { test: /\.js?$/,
              loader: 'babel-loader',
              query: { presets: ['@babel/preset-env', '@babel/preset-react'] },
              exclude: /node_modules/ },
	    { test: /\.tsx?$/, loader: "ts-loader", exclude: /node_modules/ }
        ]
    },
    plugins: [
    ]
}
