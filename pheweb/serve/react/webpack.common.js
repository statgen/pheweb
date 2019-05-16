var webpack = require('webpack')

module.exports = {
    entry: [
        "./js/app.js"
    ],
    output: {
        path: __dirname + '/../static',
        filename: "bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.js?$/,
                loader: 'babel-loader',
                query: {
                    presets: ['@babel/preset-env', '@babel/preset-react']
                },
                exclude: /node_modules/
            }
        ]
    },
    plugins: [
    ]
}
