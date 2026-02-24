module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@toth/shared$': '<rootDir>/../../packages/shared/src',
    '^@toth/database$': '<rootDir>/../../packages/database/src',
  },
};
