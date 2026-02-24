module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@toth/database$': '<rootDir>/../../packages/database/src',
    '^@toth/shared$': '<rootDir>/../../packages/shared/src',
  },
};
