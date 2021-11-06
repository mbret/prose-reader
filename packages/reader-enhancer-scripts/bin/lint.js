const path = require(`path`)
const spawn = require(`child_process`).spawn

exports.lint = async ({ argv }, b, c) => {
  const options = [
        `**/*.{js,ts,tsx}`,
        `-c`, `${path.resolve(__dirname, `../.eslintrc.js`)}`,
        `--ignore-path`, `${path.resolve(__dirname, `../.eslintignore`)}`
  ]

  if (argv.fix) {
    options.push(`--fix`)
  }

  spawn(`eslint`, options, {
    //  stay in parent module context
    cwd: process.cwd(),
    stdio: `inherit`,
    detached: false
  })
}
