const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development', // Use 'production' for minified output
  devtool: 'cheap-module-source-map', // Good for development, helps with debugging
  entry: {
    popup: './popup.js',
    // If you had a background.js that needed bundling with imports:
    // background: './background.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js', // [name] will be 'popup' or 'background'
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './popup.html', to: 'popup.html' },
        { from: './popup.css', to: 'popup.css' },
        { from: './manifest.json', to: 'manifest.json' },
        { from: './icons', to: 'icons' }, // Copies the entire icons folder
        { from: './background.js', to: 'background.js' } // Copy background.js
      ],
    }),
  ],
  // No module/rules/Babel for now to keep it simple.
  // Webpack 5 can handle modern JavaScript syntax by default.
};
