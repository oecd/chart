import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import json from '@rollup/plugin-json';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';
import * as dotenv from 'dotenv';

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
];
