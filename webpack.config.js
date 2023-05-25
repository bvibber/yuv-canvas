/* eslint-env node */

const path = require('path');

const config = {
    mode: 'development',
    entry: "./public/demo.js",
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'demo-bundled.js'
    },
    module: {
        rules: [
            /*
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: path.resolve(__dirname, "node_modules")
            }
            */
        ]
    }
}

module.exports = config;