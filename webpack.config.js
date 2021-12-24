const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('inline-chunk-html-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HTMLInlineCSSWebpackPlugin = require("html-inline-css-webpack-plugin").default;

const webpack = require('webpack');

const ENV = process.env['NODE_ENV']
//const production = ENV === 'production'
const production = true

module.exports = {
  entry: [ "./src/index.tsx", ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader"
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
  },
  devServer: {
    publicPath: "/dist",
    // contentBase: path.resolve(__dirname, './assets'),
    // contentBasePublicPath: '/assets'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: 'index.html',
    }),
    new HTMLInlineCSSWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/bundle/]),
  ]
};
