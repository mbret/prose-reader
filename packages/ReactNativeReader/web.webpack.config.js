const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    'bundle': './web/src/index.tsx',
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
          },
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
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    port: 8082,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './web/public',
        },
      ],
    }),
  ],
};
