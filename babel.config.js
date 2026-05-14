module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json', '.native.js'],
        alias: {
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@screens': './src/screens',
          '@utils': './src/utils',
          '@types': './src/types',
          '@constants': './src/constants',
          '@navigation': './src/navigation',
          '@store': './src/store',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
