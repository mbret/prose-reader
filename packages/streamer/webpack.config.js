const path = require('path');

const IS_PROD = process.env.NODE_ENV !== 'development'

module.exports = {
  entry: './src/index.ts',
  mode: IS_PROD ? 'production' : 'development',
  devtool: 'source-map',
  externals: [
    '@oboku/reader',
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            compilerOptions: {
              declaration: true
            }
          }
        }],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      // https://github.com/lddubeau/saxes
      stream: path.resolve(__dirname, `src/streamShim.js`)
    }
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs'
    }
  },
};