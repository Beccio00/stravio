// Root metro.config.js — delegates to apps/mobile
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve modules from the monorepo
config.watchFolders = [projectRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(projectRoot, "apps/mobile/node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
