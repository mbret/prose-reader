const path = require('path');

const IS_PROD = process.env.NODE_ENV !== 'development'

module.exports = {
  entry: {
    'index': './src/index.ts',
  },
  mode: IS_PROD ? 'production' : 'development',
  devtool: 'source-map',
  externals: [
    'react-dom',
    'react',
    'rxjs',
    'rxjs/operators',
  ],
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
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs'
    }
  },
};