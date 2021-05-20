const path = require('path');

module.exports = {
  entry: './src/index.ts',
  watch: true,
  mode: 'development',
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