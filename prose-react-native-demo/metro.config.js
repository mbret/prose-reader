const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)

/**
 * The `@prose-reader/*` dependencies are `file:` links to `../packages/*`, so
 * every one of them resolves to a real path outside this directory. Metro only
 * reads files under the project root and whatever else it is told to watch, so
 * without this it refuses a package it can see in `node_modules`:
 *
 *   Unable to resolve module @prose-reader/react-native ... could not be found
 *   within the project or in these directories: node_modules, ../node_modules
 *
 * Watching the repository root is what lets Metro read those sources. Where it
 * resolves from is a separate decision, made below.
 */
const repositoryRoot = path.resolve(__dirname, "..")

config.watchFolders = [repositoryRoot]

/**
 * Resolve every module from this app's `node_modules` and nowhere else.
 *
 * Metro's default is to walk up from the file doing the importing, and a linked
 * library lives at `../packages/*`, so its own `react-native` resolves to the
 * repository's copy — a different major (0.86 there, 0.79 here) whose source
 * Metro cannot even parse. Two copies of react-native in one bundle is the
 * failure this avoids; it also makes the app resolve the way a published
 * consumer does, which is what this demo is for.
 *
 * The cost is that everything the libraries import at runtime has to be a
 * dependency of this app, peer dependencies included. That is the same contract
 * a real consumer has.
 */
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")]
config.resolver.disableHierarchicalLookup = true

/**
 * This allow the web build .html to be loaded
 */
config.resolver.assetExts.push("html")

module.exports = config
