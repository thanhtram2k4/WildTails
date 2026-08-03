import nextConfig from 'eslint-config-next';
import baseConfig from '@wildtails/config/eslint/base.js';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [...nextConfig, ...baseConfig];

export default eslintConfig;
