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
    files: ['**/__tests__/**'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.jest,
      },
    },
  },
];

export default eslintConfig;
