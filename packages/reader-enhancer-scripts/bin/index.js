#!/usr/bin/env node

'use strict'

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers');
const { build } = require('./build');
const { start } = require('./start');
const { lint } = require('./lint');

const argv = yargs(hideBin(process.argv))
    .command(`build`, ``, build)
    .command(`start`, ``, start)
    .command(`lint`, ``, lint)
    .parse()

console.log(argv.build);