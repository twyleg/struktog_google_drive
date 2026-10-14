require("dotenv").config();

// const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WebpackShellPluginNext = require("webpack-shell-plugin-next");
const CopyPlugin = require("copy-webpack-plugin");
const { GenerateSW } = require("workbox-webpack-plugin");
const gameRoot = process.cwd();
const Webpack = require("webpack");
const packageVersion = require("./package.json").version;
const isEmbedBuild = process.env.STRUKTOG_EMBED_BUILD === "1";

const site = require("./site.config.json");
const requiredSiteFields = ["operatorName", "operatorAddress", "contactEmail", "siteUrl", "sourceUrl"];
const siteConfigured = requiredSiteFields.every(key => typeof site[key] === "string" && site[key].trim());
if (process.env.STRUKTOG_PUBLIC_BUILD === "1") {
  if (!site.siteUrl || !site.sourceUrl) throw new Error("Set the public site and source URLs in site.config.json before a public build.");
  for (const key of ["siteUrl", "sourceUrl", ...(site.projectUrl ? ["projectUrl"] : [])]) {
    if (new URL(site[key]).protocol !== "https:") throw new Error(key + " must use HTTPS for public deployment.");
  }
  if (site.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contactEmail)) throw new Error("Set a valid contactEmail in site.config.json.");
}

function resolveBuildIdentifier() {
  if (process.env.CI_COMMIT_TAG) {
    return process.env.CI_COMMIT_TAG;
  }

  const branchName =
    process.env.CI_COMMIT_BRANCH || process.env.CI_COMMIT_REF_NAME || "";
  const defaultBranch = process.env.CI_DEFAULT_BRANCH || "master";

  if (branchName !== "" && branchName === defaultBranch) {
    return `v${packageVersion}`;
  }

  if (process.env.CI_COMMIT_SHORT_SHA) {
    return process.env.CI_COMMIT_SHORT_SHA;
  }

  try {
    return require("child_process")
      .execSync("git describe --tags --always")
      .toString()
      .trim();
  } catch (error) {
    return "dev";
  }
}

const commitHash = resolveBuildIdentifier();

// the path(s) that should be cleaned
const pathsToClean = ["build"];

// the clean options to use
const cleanOptions = {
  verbose: true,
  dry: false,
};

const config = {
  // bundle javascript
  entry: `${gameRoot}/src/index.js`,
  output: {
    path: `${gameRoot}/build`,
    filename: "struktogramm.js",
  },
  resolve: { symlinks: false },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: ["/node_modules/", "/build_tools/"],
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {},
          },
          "sass-loader",
        ],
      },
      {
        test: /\.svg$/,
        use: {
          loader: "svg-url-loader",
          options: {},
        },
      },
    ],
  },
  plugins: [
    new Webpack.DefinePlugin({
      __GOOGLE_DRIVE_CONFIG__: JSON.stringify({
        clientId:
          process.env.STRUKTOG_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
        apiKey:
          process.env.STRUKTOG_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || "",
        appId:
          process.env.STRUKTOG_GOOGLE_APP_ID || process.env.GOOGLE_APP_ID || "",
      }),
      __SITE_CONFIG__: JSON.stringify(site),
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __EMBED_BUILD__: JSON.stringify(isEmbedBuild),
    }),
    new WebpackShellPluginNext({
      onBuildStart: {
        scripts: ["node ./build_tools/prepareSvg.js"],
        blocking: true,
        parallel: false,
      },
    }),
    new CleanWebpackPlugin({ pathsToClean, cleanOptions }),
    new MiniCssExtractPlugin({
      filename: "struktogramm.css",
      chunkFilename: "[name].css",
    }),
    new HtmlWebpackPlugin({
      title: "Struktog – Diagrammeditor",
      templateParameters: { site, siteConfigured },
      template: "./src/index.html",
      meta: {
        viewport: "width=device-width, initial-scale=1, user-scalable=no",
        "msapplication-TileColor": "#2d89ef",
        "theme-color": "#ffffff",
      },
    }),
    ...["privacy", "imprint", "terms"].map(page => new HtmlWebpackPlugin({
      filename: page + ".html",
      template: "./src/legal.html",
      inject: false,
      templateParameters: { site, siteConfigured, page },
    })),
    new CopyPlugin({
      patterns: ["./src/assets/examples/"],
      options: {
        concurrency: 100,
      },
    }),
  ],
  devServer: {
    port: 8081,
    contentBase: "./src",
    watchOptions: {
      poll: true,
    },
    open: false,
  },
};

module.exports = (env, argv) => {
  const isDev = argv && argv.mode === "development";
  // Mode setzen
  config.mode = isDev ? "development" : "production";

  if (isDev) {
    // Schnellere & detailreichere Source-Maps
    config.devtool = "eval-source-map";

    // Alle Optimierungen deaktivieren
    config.optimization = {
      minimize: false,
      splitChunks: false,
      runtimeChunk: false,
      moduleIds: "named",
      chunkIds: "named",
    };

    // SCSS-Regel anpassen: style-loader statt CSS-Extraktion
    const sassRule = config.module.rules.find((r) =>
      r.test.toString().includes("scss")
    );
    if (sassRule) {
      sassRule.use = ["style-loader", "css-loader", "sass-loader"];
    }

    // Plugins für Dev-Workflow filtern
    config.plugins = config.plugins.filter(
      (plugin) =>
        !(plugin instanceof MiniCssExtractPlugin) &&
        !(plugin instanceof CleanWebpackPlugin) &&
        !(plugin instanceof CopyPlugin)
    );
  } else {
    // Production-Sourcemaps (falls benötigt)
    config.devtool = "source-map";

    if (!isEmbedBuild) {
      config.plugins.push(
        new GenerateSW({
          swDest: "sw.js",
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          navigateFallback: "./index.html",
          runtimeCaching: [],
        })
      );
    }
  }

  return config;
};
