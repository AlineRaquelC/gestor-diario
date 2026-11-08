const base = require('../../jest.config.js');

module.exports = {
  ...base,
  rootDir: '../..',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/backend/',
    '<rootDir>/__tests__/App\\.test\\.tsx$',
  ],
};
