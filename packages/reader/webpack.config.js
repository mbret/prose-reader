const path = require(`path`)
const TerserPlugin = require(`terser-webpack-plugin`)
const BundleAnalyzerPlugin = require(`webpack-bundle-analyzer`).BundleAnalyzerPlugin

const IS_PROD = process.env.NODE_ENV !== `development`

module.exports = {
  entry: {
    index: `./src/index.ts`
  },
  mode: IS_PROD ? `production` : `development`,
  ...(!IS_PROD && {
    devtool: `eval-source-map`
  }),
  ...(IS_PROD && {
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin()]
    }
  }),
  externals: [`rxjs`, `rxjs/operators`],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: `ts-loader`,
            options: {
              compilerOptions: {
                noEmit: false,
                ...(IS_PROD && {
                  declaration: true
                })
              }
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [`.tsx`, `.ts`, `.js`]
  },
  output: {
    filename: `[name].js`,
    path: path.resolve(__dirname, `dist`),
    library: {
      type: `commonjs`
    },
    clean: IS_PROD
  },
  plugins: [
    // new BundleAnalyzerPlugin()
  ]
}
