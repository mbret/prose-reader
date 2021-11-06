const webpack = require(`webpack`)
const config = require(`../webpack.config.build`)
const util = require(`util`)
const exec = util.promisify(require(`child_process`).exec)
const path = require(`path`)

exports.start = async () => {
  const modulePath = process.cwd()
  const production = false
  let firstBuild = true

  webpack(config(production))
    .watch({}, async (_, stats) => {
      console.log(stats.toString({ preset: `normal`, colors: true }))

      if (firstBuild) {
        firstBuild = false
        const { stdout, stderr } = await exec(`tsc -w --declaration --noEmit false --emitDeclarationOnly --outDir ${path.resolve(modulePath, `dist`)}`)
        console.log(stdout)
        console.log(stderr)
      }
    })
}
