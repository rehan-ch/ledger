const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = [
  // Main process
  {
    mode: isDev ? 'development' : 'production',
    entry: './src/main/index.ts',
    target: 'electron-main',
    module: {
      rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
    },
    resolve: { extensions: ['.ts', '.js'] },
    output: { path: path.resolve(__dirname, 'dist'), filename: 'main.js' },
    externals: { 'better-sqlite3': 'commonjs better-sqlite3', 'crypto': 'commonjs crypto' },
    plugins: [
      new webpack.DefinePlugin({ 'process.env.IS_DEV': JSON.stringify(isDev) }),
    ],
  },
  // Preload
  {
    mode: isDev ? 'development' : 'production',
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
    },
    resolve: { extensions: ['.ts', '.js'] },
    output: { path: path.resolve(__dirname, 'dist'), filename: 'preload.js' },
  },
  // Renderer process
  {
    mode: isDev ? 'development' : 'production',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    module: {
      rules: [
        { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ],
    },
    resolve: { extensions: ['.tsx', '.ts', '.js'] },
    output: { path: path.resolve(__dirname, 'dist'), filename: 'renderer.js' },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
      }),
      new webpack.DefinePlugin({ 'process.env.IS_DEV': JSON.stringify(isDev) }),
    ],
  },
];
