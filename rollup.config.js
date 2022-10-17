import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import * as dotenv from 'dotenv';

const packageJson = require('./package.json');

dotenv.config();

const apiUrl = process.env.API_URL;
const env = process.env.NODE_ENV || 'production';

export default [
  {
    input: './src/index-with-css.js',
    output: [
      {
        dir: 'dist/cjs',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: () => 'index.js',
      },
      {
        dir: 'dist/esm',
        format: 'esm',
        sourcemap: true,
        entryFileNames: () => 'index.js',
      },
    ],
    external: [/@babel\/runtime/],
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(env),
        'process.env.API_URL': JSON.stringify(apiUrl),
        preventAssignment: true,
      }),
      external(),
      resolve(),
      babel({
        // babel presets and plugins are configured in .babelrc.json
        exclude: [/node_modules/],
        babelHelpers: 'runtime',
      }),
      commonjs(),
      json(),
      postcss(),
      terser(),
    ],
  },
  {
    input: './src/index-browser.js',
    output: [
      {
        file: `dist-browser/chart-builder-${packageJson.version}.js`,
        format: 'iife',
        name: 'ChartBuilder',
        inlineDynamicImports: true,
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    ],
    external: ['react', 'react-dom'],
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(env),
        'process.env.API_URL': JSON.stringify(apiUrl),
        'process.env.NEXT_PUBLIC_CHART_LIB_API_URL': JSON.stringify(apiUrl),
        preventAssignment: true,
      }),
      resolve(),
      babel({
        // babel presets and plugins are configured in .babelrc.json
        exclude: [/node_modules/],
        babelHelpers: 'runtime',
      }),
      commonjs(),
      nodePolyfills(),
      json(),
      postcss(),
      terser(),
    ],
  },
];
