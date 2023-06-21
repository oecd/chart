const replace = require('@rollup/plugin-replace');
const resolve = require('@rollup/plugin-node-resolve');
const babel = require('@rollup/plugin-babel');
const commonjs = require('@rollup/plugin-commonjs');
const external = require('rollup-plugin-peer-deps-external');
const json = require('@rollup/plugin-json');
const postcss = require('rollup-plugin-postcss');
const terser = require('@rollup/plugin-terser');
const nodePolyfills = require('rollup-plugin-polyfill-node');
const externalGlobals = require('rollup-plugin-external-globals');
const dotenv = require('dotenv');

dotenv.config();

const apiUrl = process.env.API_URL;
const env = process.env.NODE_ENV || 'production';

module.exports = [
  {
    input: './src/index.js',
    output: [
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
        presets: ['@babel/preset-env', '@babel/preset-react'],
        plugins: [['@babel/plugin-transform-runtime', { corejs: 3 }]],
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
    input: './src/index-util.js',
    output: [
      {
        dir: 'dist/esm',
        format: 'esm',
        sourcemap: true,
        entryFileNames: () => 'util.js',
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
        presets: ['@babel/preset-env', '@babel/preset-react'],
        plugins: [['@babel/plugin-transform-runtime', { corejs: 3 }]],
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
        dir: 'dist/browser',
        format: 'esm',
        sourcemap: true,
        entryFileNames: () => 'oecd-chart-latest.js',
      },
    ],
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(env),
        'process.env.API_URL': JSON.stringify(apiUrl),
        'process.env.NEXT_PUBLIC_CHART_LIB_API_URL': JSON.stringify(apiUrl),
        preventAssignment: true,
      }),
      external(),
      resolve(),
      babel({
        presets: ['@babel/preset-env', '@babel/preset-react'],
        exclude: [/node_modules/],
        babelHelpers: 'bundled',
      }),
      commonjs(),
      nodePolyfills(),
      externalGlobals({
        react: 'React',
        'react-dom/client': 'ReactDOM',
        'react-dom': 'ReactDOM',
      }),
      json(),
      postcss(),
      terser(),
    ],
  },
];
