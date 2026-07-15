import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import globals from 'globals';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  ...compat.config({
    settings: {
      react: {
        version: 'detect',
      },
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
      'prettier',
    ],
    rules: {
      'no-console': [
        'error',
        {
          allow: ['error'],
        },
      ],
      'react/react-in-jsx-scope': 'off',
    },
  }),
  {
    files: ['src/**'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['**/__tests__/**'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  {
    files: ['scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
];

export default eslintConfig;
