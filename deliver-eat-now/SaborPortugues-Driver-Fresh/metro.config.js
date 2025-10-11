const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Resolver problemas comuns do Android
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configurações para melhor compatibilidade
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;