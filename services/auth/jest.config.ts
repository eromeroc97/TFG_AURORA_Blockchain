import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/main.ts',
    '!src/prisma/**',
    '!src/tests/**'
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/tests/jest.setup.ts'],
  testTimeout: 30000,
};

export default config;