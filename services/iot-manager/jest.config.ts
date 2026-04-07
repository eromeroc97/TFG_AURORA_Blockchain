import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/server.ts',
  ],
  coverageReporters: ['lcov', 'text'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
