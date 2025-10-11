// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Adicionar polyfills para crypto e path
config.resolver.alias = {
  crypto: 'crypto-browserify',
  path: 'path-browserify',
  stream: 'stream-browserify',
};

module.exports = config;
