module.exports = {
  root: true,
  // Gradle JVM test reports include generated JS, never product source.
  ignorePatterns: ['android/**/build/**'],
  extends: '@react-native',
};
