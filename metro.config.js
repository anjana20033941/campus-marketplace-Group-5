const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Support .cjs files used by Firebase SDKs
config.resolver.sourceExts.push('cjs');

// Disable package exports to ensure proper module resolution with Metro
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
