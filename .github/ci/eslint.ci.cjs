module.exports = {
  extends: ['../../.eslintrc.js'],
  overrides: [{
    files: ['**/*.mjs', '**/*.cjs'],
    env: { node: true, es2022: true },
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  }],
};
