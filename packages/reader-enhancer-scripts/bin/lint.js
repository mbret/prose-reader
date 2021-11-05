const config = require(`../webpack.config.build`)
const util = require('util');
const path = require('path');
const spawn = require('child_process').spawn;

exports.lint = async ({ argv }, b, c) => {
    // console.log(a.argv, b, c)
    const IS_PROD = process.env.NODE_ENV !== 'development'
    const modulePath = process.cwd()

    const options = [
        `**/*.{js,ts,tsx}`,
        `-c`, `${path.resolve(__dirname, `../.eslintrc.js`)}`,
        `--ignore-path`, `${path.resolve(__dirname, `../.eslintignore`)}`,
    ]

    if (argv.fix) {
        options.push(`--fix`)
    }

    const ls = spawn('eslint', options, {
        //  stay in parent module context
        cwd: process.cwd(),
        stdio: 'inherit',
        detached: false,
    });

    // ls.stdout.on('data', (data) => {
    //     console.log(`stdout: ${data}`);
    // });

    // ls.stderr.on('data', (data) => {
    //     console.error(`stderr: ${data}`);
    // });

    // ls.on('close', (code) => {
    //     console.log(`child process exited with code ${code}`);
    // });

    // const { stdout, stderr } = await exec(`eslint '**/*.{js,ts,tsx}' -c ${path.resolve(__dirname, `../.eslintrc.js`)}`, {
    //    
    //     cwd: process.cwd(),

    // })
    // console.log(stdout);
    // console.log(stderr);
}