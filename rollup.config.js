import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import terser from '@rollup/plugin-terser';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import externalGlobals from 'rollup-plugin-external-globals';
import dotenv from 'dotenv';

dotenv.config();

const apiUrl = process.env.API_URL;
const env = process.env.NODE_ENV || 'production';

export default [
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
        'react/jsx-runtime': 'jsxRuntime',
      }),
      json(),
      postcss(),
      terser(),
    ],
  },
];
