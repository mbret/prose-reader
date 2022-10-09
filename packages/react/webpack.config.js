const path = require("path")

const IS_PROD = process.env.NODE_ENV !== "development"

module.exports = {
  entry: "./src/index.ts",
  mode: IS_PROD ? "production" : "development",
  ...(!IS_PROD && {
    devtool: "source-map"
  }),
  externals: ["react", "react-dom", "@prose-reader/core"],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "ts-loader",
            options: {
              compilerOptions: {
                noEmit: false
              }
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      type: "commonjs"
    },
    clean: IS_PROD
  }
}
