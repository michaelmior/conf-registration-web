const webpack = require('webpack');
const path = require('path');
const concat = require('lodash/concat');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer')
  .BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackExcludeAssetsPlugin = require('html-webpack-exclude-assets-plugin');
const WebpackInlineManifestPlugin = require('webpack-inline-manifest-plugin');
const WebappWebpackPlugin = require('webapp-webpack-plugin');
const SriPlugin = require('webpack-subresource-integrity');

const isBuild = (process.env.npm_lifecycle_event || '').startsWith('build');
const ci = process.env.CI === 'true';
const prod = process.env.TRAVIS_BRANCH === 'master';

const htmlMinDefaults = {
  removeComments: true,
  removeCommentsFromCDATA: true,
  removeCDATASectionsFromCDATA: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeAttributeQuotes: true,
  useShortDoctype: true,
  keepClosingSlash: true,
  minifyJS: true,
  minifyCSS: true,
  removeScriptTypeAttributes: true,
  removeStyleTypeAttributes: true,
};

module.exports = (env = {}) => {
  const isTest = env.test;
  return {
    mode: isBuild ? 'production' : 'development',
    entry: {
      app: 'scripts/main.js',
    },
    output: {
      filename: '[name].[chunkhash].js',
      path: path.resolve(__dirname, 'dist'),
      devtoolModuleFilenameTemplate: info =>
        info.resourcePath.replace(/^\.\//, ''),
      crossOriginLoading: 'anonymous',
    },
    optimization: {
      splitChunks: {
        cacheGroups: {
          commons: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'initial',
          },
        },
      },
    },
    plugins: concat(
      [
        new webpack.EnvironmentPlugin({
          ROLLBAR_ACCESS_TOKEN:
            JSON.stringify(process.env.ROLLBAR_ACCESS_TOKEN) ||
            'development-token',
        }),
        new webpack.ProvidePlugin({
          $: 'jquery',
          jQuery: 'jquery',
          'window.jQuery': 'jquery',
        }),
        new MiniCssExtractPlugin({
          filename: '[name].[contenthash].css',
        }),
      ],
      !isTest
        ? [
            new HtmlWebpackPlugin({
              template: 'app/index.ejs',
              prod: prod,
              minify: htmlMinDefaults,
            }),
          ]
        : [],
      isBuild
        ? [
            new webpack.NamedModulesPlugin(),
            new HtmlWebpackPlugin({
              template: 'app/browserUnsupported.ejs',
              filename: 'browserUnsupported.html',
              excludeAssets: /.*\.js/, // Only import CSS
              minify: htmlMinDefaults,
            }),
            new HtmlWebpackPlugin({
              template: 'app/maintenanceMode.ejs',
              filename: 'maintenanceMode.html',
              excludeAssets: /.*\.js/, // Only import CSS
              minify: htmlMinDefaults,
            }),
            new HtmlWebpackExcludeAssetsPlugin(),
            new WebpackInlineManifestPlugin({
              name: 'webpackManifest',
            }),
            new WebappWebpackPlugin('./app/img/favicon.png'),
            new SriPlugin({
              hashFuncNames: ['sha512'],
            }),
          ]
        : [],
      env.analyze ? [new BundleAnalyzerPlugin()] : [],
    ),
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  [
                    'env',
                    {
                      modules: false,
                      exclude: ['transform-es2015-function-name'],
                    },
                  ],
                ], // transform-es2015-function-name is renaming function params in eventRegistrations that are needed for Angular DI
                plugins: concat(
                  ['transform-runtime'],
                  !isTest ? ['angularjs-annotate'] : [],
                ),
              },
            },
          ],
        },
        {
          test: /\.html$/,
          use: [
            'ngtemplate-loader?relativeTo=' +
              path.resolve(__dirname, './app') +
              '/',
            'html-loader',
          ],
        },
        {
          test: /\.js$/,
          exclude: /(app\/components|node_modules)/,
          loader: 'eslint-loader',
          enforce: 'pre',
          options: {
            // Show errors as warnings during development to prevent start/test commands from exiting
            failOnError: isBuild || ci,
            emitWarning: !isBuild && !ci,
          },
        },
        {
          test: /\.(scss|css)$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                precision: 8, // fixes line height issue with bootstrap button addons | See Link for more detail:  https://github.com/twbs/bootstrap-sass#sass-number-precision
              },
            },
          ],
        },
        {
          test: /\.(woff|ttf|eot|ico)/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[hash].[ext]',
              },
            },
          ],
        },

        {
          test: /\.(svg|png|jpe?g|gif)/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[hash].[ext]',
              },
            },
            {
              loader: 'image-webpack-loader',
              options: {},
            },
          ],
        },
        {
          test: /pickadate/,
          parser: { amd: false },
        },
      ],
    },
    resolve: {
      modules: [path.resolve(__dirname, 'app'), 'node_modules'],
    },
    devtool: 'source-map',
    devServer: {
      historyApiFallback: true,
      port: 9000,
    },
  };
};
