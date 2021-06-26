const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

console.log(process.argv)

const isNativeBuild = process.argv.find(arg => arg === 'native')

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
    path: path.resolve(__dirname, 'android/app/src/main/assets'),
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    port: 8082,
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: !isNativeBuild,
      templateContent: ({ htmlWebpackPlugin }) => `
        <!doctype html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>ts-demo-webpack</title>
            <link rel="shortcut icon" href="data:image/x-icon;," type="image/x-icon"> 
            <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no">
            <style>
              body, html, #app {
                margin: 0;
                padding: 0;
                height: 100%;
              }
              * {
                box-sizing: border-box;
              }
            </style>
          </head>
          <body>
            <div id="app"></div>
          </body>
        </html>
      `,
    }),
  ],
};
