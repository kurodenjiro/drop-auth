const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry:  './src/index.tsx',
  output: {
    filename:   'main.js',
    path:       path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html'),
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer:  ['buffer', 'Buffer']
    }),
    new webpack.EnvironmentPlugin({
      DEBUG:                                true,
      REACT_APP_BASE_PATH:                  '/',
      NETWORK_ID:                           'testnet',
      RELAYER_URL:                          'http://relayer.dropwallet.io/relay',
      FIREBASE_API_KEY:                     'AIzaSyCE8LwSrTuYor8vPVhgR5gh5ZiqFkrC0B0',
      FIREBASE_AUTH_DOMAIN:                 'dropauth-daa07.firebaseapp.com',
      FIREBASE_PROJECT_ID:                  'dropauth-daa07',
      FIREBASE_STORAGE_BUCKET:              'dropauth-daa07.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID:         '498853817569',
      FIREBASE_APP_ID:                      '1:498853817569:web:4aa1fb8aea83c7ade5dba0',
      FIREBASE_MEASUREMENT_ID:              'G-7CR6ZG5TGV',
      RELAYER_URL_TESTNET:                  'http://relayer.dropwallet.io/relay',
      FIREBASE_API_KEY_TESTNET:             'AIzaSyCE8LwSrTuYor8vPVhgR5gh5ZiqFkrC0B0',
      FIREBASE_AUTH_DOMAIN_TESTNET:         'dropauth-daa07.firebaseapp.com',
      FIREBASE_PROJECT_ID_TESTNET:          'dropauth-daa07',
      FIREBASE_STORAGE_BUCKET_TESTNET:      'dropauth-daa07.appspot.com',
      FIREBASE_MESSAGING_SENDER_ID_TESTNET: '498853817569',
      FIREBASE_APP_ID_TESTNET:              '1:498853817569:web:4aa1fb8aea83c7ade5dba0',
      FIREBASE_MEASUREMENT_ID_TESTNET:      'G-7CR6ZG5TGV',
      SENTRY_DSN:                           'https://6faeb47cd0a1678c0d9d52fc25c137bc@o4506281770876928.ingest.sentry.io/4506627149856768',
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3000,
  },
  devtool: 'eval-source-map',
  module:  {
    // exclude node_modules
    rules: [
      {
        test:    /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        use:     ['ts-loader'],
      },
      {
        test: /\.css$/i,
        use:  ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource',
      },
    ],
  },
  // pass all js files through Babel
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.css'],
    fallback:   {
      https:             require.resolve('https-browserify'),
      http:              require.resolve('stream-http'),
      // crypto:   require.resolve('crypto-browserify'),
      crypto:            false,
      stream:            require.resolve('stream-browserify'),
      process:           require.resolve('process/browser'),
      'process/browser': require.resolve('process/browser'),
      url:               require.resolve('url/')
    }
  }
};