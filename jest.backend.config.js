module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/backend/**/*.test.ts'],
  cacheDirectory: '<rootDir>/.jest-cache-backend',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {tsconfig: {rootDir: '.'}}],
  },
};
