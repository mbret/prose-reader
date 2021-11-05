const path = require('path');

const modulePath = process.cwd()

module.exports = (production) => ({
  entry: path.resolve(modulePath, `src/index.ts`),
  mode: production ? 'production' : 'development',
  ...!production && {
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
              declaration: false,
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
    path: path.resolve(modulePath, 'dist'),
    library: {
      type: 'commonjs'
    },
    clean: true
  },
});