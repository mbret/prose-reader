const webpack = require('webpack')
const config = require(`../webpack.config.build`)
const util = require('util');
const path = require('path');
const exec = util.promisify(require('child_process').exec);

exports.build = async () => {
    const IS_PROD = process.env.NODE_ENV !== 'development'
    const modulePath = process.cwd()

    webpack(config(IS_PROD), (err, stats) => {
        console.log(stats.toString({ preset: `normal`, colors: true }))
    })

    const { stdout, stderr } = await exec(`tsc --declaration --noEmit false --emitDeclarationOnly --outDir ${path.resolve(modulePath, `dist`)}`)
    console.log(stdout);
    console.log(stderr);
}