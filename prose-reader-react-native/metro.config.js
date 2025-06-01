const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

/**
 * This allow the web build .html to be loaded
 */
config.resolver.assetExts.push('html');

/**
 * Shim required for now to be able to import @prose-reader/streamer
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'string_decoder') {
    // Logic to resolve the module name to a file path...
    // NOTE: Throw an error if there is no resolution.
    return {
      filePath: 'string_decoder.js',
      type: 'sourceFile',
    };
  }

  // Optionally, chain to the standard Metro resolver.
  return context.resolveRequest(context, moduleName, platform);
};

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
