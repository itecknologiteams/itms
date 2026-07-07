/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.base.json' }],
  },
  moduleNameMapper: {
    '^@itms/common$': '<rootDir>/libs/common/src/index.ts',
    '^@itms/common/(.*)$': '<rootDir>/libs/common/src/$1',
    '^@itms/events$': '<rootDir>/libs/events/src/index.ts',
    '^@itms/events/(.*)$': '<rootDir>/libs/events/src/$1',
    '^@itms/auth$': '<rootDir>/libs/auth/src/index.ts',
    '^@itms/auth/(.*)$': '<rootDir>/libs/auth/src/$1',
  },
  roots: ['<rootDir>/libs', '<rootDir>/services'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: ['**/src/**/*.ts', '!**/*.spec.ts', '!**/main.ts'],
  coverageDirectory: '<rootDir>/coverage',
  moduleFileExtensions: ['ts', 'js', 'json'],
};
