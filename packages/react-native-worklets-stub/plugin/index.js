/**
 * No-op Babel plugin stub for react-native-worklets/plugin.
 * 
 * NativeWind (via react-native-css-interop) requires this babel plugin,
 * but the real react-native-worklets package only supports RN 0.78+.
 * Since reanimated 3.16.x has its own built-in worklet handling,
 * this no-op plugin is sufficient for RN 0.76 / Expo SDK 52.
 */
module.exports = function () {
  return {
    name: "react-native-worklets-noop",
    visitor: {},
  };
};
