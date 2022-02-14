const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const PRODUCTION = !!process.env.PRODUCTION;

const DEMOS = ['tfjs_webgl', 'tfjs_wasm'];

module.exports = (env) => {
  const config = {
    mode: PRODUCTION ? 'production' : 'development',
    devtool: 'inline-source-map',
    devServer: {
      headers: {
        // These two headers are requried for cross origin isolation.
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp'
      },
      https: true,
      host: '0.0.0.0',
      port: 8090,
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
      extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
      ...DEMOS.map((d) => new HtmlWebpackPlugin({
        template: 'src/demos/draw/index.html',
        filename: `${d}_draw.html`,
        chunks: [`${d}_draw`],
      })),
      new CopyWebpackPlugin({
        patterns: [
          // FIXME these wildcards will load some unnecessary stuff right now
          {from: 'node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm'},
          {from: 'models/lan', to: 'lan/'},
          {from: 'models/box', to: 'box/'},
        ]
      })
    ],
    optimization: {
      minimizer: [new TerserPlugin({
        extractComments: false,
        exclude: /\.min\./,
      })],
    },
    module: {
      rules: [
        {
          test: /\.wasm$/i,
          type: 'javascript/auto',
          use: [
            {
              loader: 'file-loader',
            },
          ],
        },
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    entry: {
      ...DEMOS.map((d) => {
        const chunkName = `${d}_draw`;
        return {
          [chunkName]: {
            import: `./src/demos/draw/${d}_entry.ts`,
            filename: `${d}_draw.js`,
          }
        }
      }).reduce((cur, prev, index) => {return {...prev, ...cur};}, {})
    }
  };

  return [config];
}
