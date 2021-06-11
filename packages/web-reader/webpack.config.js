const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'bundle': './src/index.tsx',
    'service-worker': './src/serviceWorker/service-worker.ts',
  },
  mode: 'development',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            // This will speed up compilation enormously but disable type check
            // make sure to run `yarn tsc` before publishing
            transpileOnly: false,
          }
        }],
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      // https://github.com/lddubeau/saxes
      stream: path.resolve(__dirname, `src/streamer/streamShim.js`)
    }
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    historyApiFallback: true,
    port: 9000,
    proxy: {
      '/**': {  //catch all requests
        target: '/index.html',  //default target
        secure: false,
        bypass: function (req, res, opt) {
          //your custom code to check for any exceptions
          //console.log('bypass check', {req: req, res:res, opt: opt});
          if (req.path.indexOf('/img/') !== -1 || req.path.indexOf('/public/') !== -1) {
            return '/'
          }

          if (req.headers.accept.indexOf('html') !== -1) {
            return '/index.html';
          }
        }
      }
    }
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './public',
        }
      ]
    }),
  ],
};