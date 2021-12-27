const fs = require('fs')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('inline-chunk-html-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HTMLInlineCSSWebpackPlugin = require("html-inline-css-webpack-plugin").default;
const HtmlWebpackTagsPlugin = require('html-webpack-tags-plugin');

const webpack = require('webpack');

const ENV = process.env['NODE_ENV']
const production = ENV === 'production'

let plugins = [
  new webpack.DefinePlugin({
    'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
  }),
  new HtmlWebpackPlugin({
    inject: true,
    template: 'index.html',
  }),
  new MiniCssExtractPlugin({
    filename: "[name].css",
    chunkFilename: "[id].css",
  }),
]
if (production) {
  const data = fs.readFileSync('assets/favicon.ico')
  let buff = new Buffer(data);
  let base64data = buff.toString('base64');

  plugins = plugins.concat([
    new HtmlWebpackTagsPlugin({ links: [
        {
          path: `data:image/x-icon;base64,${base64data}`,
          attributes: { rel: 'icon', type: 'image/x-icon', }
        }
      ],
      append: false,
    }),
    new HTMLInlineCSSWebpackPlugin(),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/bundle/]),
  ])
} else {
  plugins.push(
      new HtmlWebpackTagsPlugin({ links: [
          {
            path: '../assets/favicon.ico',
            attributes: { rel: 'icon', }
          }
        ],
        append: false,
      }),
  )
}

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
    extensions: [".tsx", ".ts", ".js", ".css", ],
    alias: {
      "styled-components": path.resolve(__dirname, "node_modules", "styled-components"),
    }
  },
  optimization: {
    usedExports: true,
  },
  output: {
    filename: "bundle.js",
  },
  devServer: {
    publicPath: "/dist",
  },
  plugins
};
