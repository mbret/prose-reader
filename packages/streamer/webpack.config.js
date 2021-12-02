const path = require(`path`)

const IS_PROD = process.env.NODE_ENV !== `development`

module.exports = {
  entry: {
    index: `./src/index.ts`
  },
  mode: IS_PROD ? `production` : `development`,
  ...!IS_PROD && {
    devtool: `source-map`
  },
  externals: [
    `@prose-reader/core`
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: `ts-loader`,
          options: {
            compilerOptions: {
              declaration: true
            }
          }
        }]
      }
    ]
  },
  resolve: {
    extensions: [`.tsx`, `.ts`, `.js`],
    fallback: {
      // https://github.com/lddubeau/saxes
      stream: path.resolve(__dirname, `src/shims/streamShim.js`)
    }
  },
  output: {
    filename: `[name].js`,
    path: path.resolve(__dirname, `dist`),
    library: {
      type: `commonjs`
    },
    clean: IS_PROD
  }
}
