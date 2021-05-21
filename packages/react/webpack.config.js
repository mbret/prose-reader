const path = require('path');

const IS_PROD = process.env.NODE_ENV !== 'development'

module.exports = {
  entry: './src/index.ts',
  mode: IS_PROD ? 'production' : 'development',
  devtool: 'source-map',
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    '@oboku/reader': '@oboku/reader',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
        }],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs'
    }
  },
};