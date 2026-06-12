/**
 * Jest configuration for an Expo (SDK 54) + React Native project.
 * Uses the official `jest-expo` preset so that Expo modules, the
 * React Native runtime and the new architecture are transformed correctly.
 */
module.exports = {
  preset: 'jest-expo',

  // Global mocks / matchers run once before each test file.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Two separate test roots:
  //   __tests__/    -> unit tests (pure logic / storage modules)
  //   integration/  -> integration tests (screens rendered with RNTL)
  testMatch: [
    '<rootDir>/__tests__/**/*.test.{js,jsx}',
    '<rootDir>/integration/**/*.test.{js,jsx}',
  ],

  // `jest-expo` already ignores most node_modules. We provide the standard
  // Expo allow-list (anything starting with `react-native`, `expo*`, …) so the
  // ESM sources of native packages get transpiled instead of failing on
  // `import`. Note: no trailing slash — these are prefix matches.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?'
      + '|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*'
      + '|@react-native-async-storage/.*|@react-navigation/.*'
      + '|react-native-maps|react-native-svg'
      + '|react-native-safe-area-context|react-native-screens'
      + '|react-native-reanimated|unimodules|@unimodules/.*|sentry-expo))',
  ],

  // Coverage is collected from the app source only.
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.styles.{js,jsx}',
    '!src/mocks/**',
    '!**/node_modules/**',
  ],
  coverageDirectory: '<rootDir>/coverage',

  // Helps RNTL clean up between tests and gives clearer async errors.
  clearMocks: true,
}
