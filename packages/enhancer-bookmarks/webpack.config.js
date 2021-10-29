const path = require('path');

const IS_PROD = process.env.NODE_ENV !== 'development'

module.exports = {
  entry: './src/index.ts',
  mode: IS_PROD ? 'production' : 'development',
  ...!IS_PROD && {
    devtool: 'source-map',
  },
  externals: [
    '@oboku/reader',
    'rxjs',
    'rxjs/operators',
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              noEmit: false,
              declaration: true,
            }
          }
        }],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs'
    }
  },
};