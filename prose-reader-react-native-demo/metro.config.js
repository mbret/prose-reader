const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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

module.exports = config;
