/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'boundaries'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: [
          './tsconfig.base.json',
          './packages/*/tsconfig.json',
          './apps/*/tsconfig.json',
        ],
        alwaysTryTypes: true,
      },
      node: true,
    },
    'boundaries/elements': [
      { type: 'engine', pattern: 'packages/engine/**' },
      { type: 'shared', pattern: 'packages/shared/**' },
      { type: 'api', pattern: 'apps/api/**' },
      { type: 'web', pattern: 'apps/web/**' },
    ],
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'import/no-unresolved': 'error',
    'boundaries/element-types': [
      'error',
      {
        default: 'allow',
        rules: [
          {
            from: 'engine',
            disallow: ['api', 'web'],
            message:
              'engine is a pure domain package and must not import from api or web.',
          },
        ],
      },
    ],
  },
  ignorePatterns: [
    'dist',
    'build',
    'coverage',
    'node_modules',
    '*.cjs',
    '*.js',
    'apps/web/dev-dist',
  ],
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      env: { browser: true },
    },
    {
      // The roulette is a self-contained island: it must never reach into poker
      // code, so it can be lifted out to another project untouched. Enforced, not
      // just documented.
      files: ['apps/*/src/roulette/**/*.{ts,tsx}', 'packages/roulette/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              '@poker/*',
              '**/features/*',
              '**/domain/*',
              '**/ws/*',
              '**/cards/*',
              '**/chips/*',
              '**/juice/*',
              '**/probability/*',
            ],
          },
        ],
      },
    },
  ],
};
