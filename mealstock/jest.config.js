module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/api/**/*.test.ts'],
  globalSetup: '<rootDir>/tests/helpers/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/helpers/globalTeardown.ts',
  testTimeout: 15000,
  transform: { '^.+\\.tsx?$': 'babel-jest' },
};
