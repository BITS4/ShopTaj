/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.service.ts',
    'src/auth/guards/*.guard.ts',
    '!src/prisma/prisma.service.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 44,
      functions: 60,
      lines: 65,
      statements: 65,
    },
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/src'],
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};
