/* eslint-disable */
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const path = require('path');

module.exports = (env) => {
  const config = {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
      open: true,
      headers: {
        // These two headers are requried for cross origin isolation.
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      },
      https: true,
      host: '0.0.0.0',
      port: 8091,
      historyApiFallback: {
        disableDotRule: true,
      },
      watchFiles: ['src/**/*'],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      clean: true,
    },
    resolve: {
      extensions: ['.js'],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: 'index.html',
        chunks: ['example'],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {from: 'node_modules/yoha/models/', to: './'},
        ]
      })
    ],
    entry: {
      example: {
        import: './src/entry.js',
        filename: 'example.js',
      },
    }
  };

  return [config];
}
