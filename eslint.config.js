// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'client/src/routeTree.gen.ts',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['client/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat['jsx-runtime'].rules,
    },
    settings: {
      react: { version: 'detect' },
    },
    languageOptions: {
      globals: globals.browser,
    },
  },

  {
    files: ['client/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.flat.recommended.rules,
  },

  {
    files: ['server/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  eslintConfigPrettier
);
