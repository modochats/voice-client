import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

const buildConfig = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  target: "es2020",
  sourcemap: true,
  minify: false,
  logLevel: "info"
};

const esmConfig = {
  ...buildConfig,
  outfile: "dist/esm/index.js",
  format: "esm",
  platform: "browser",
  treeShaking: true
};

const cjsConfig = {
  ...buildConfig,
  outfile: "dist/cjs/index.js",
  format: "cjs",
  platform: "node"
};

if (isWatch) {
  const esmContext = await esbuild.context(esmConfig);
  const cjsContext = await esbuild.context(cjsConfig);

  await esmContext.watch();
  await cjsContext.watch();

  console.log("👀 Watching for file changes...");
} else {
  // ESM build for browsers (bundled)
  await esbuild.build(esmConfig);
  console.log("✅ ESM build complete (bundled for browsers)");

  // CommonJS build for Node.js (bundled)
  await esbuild.build(cjsConfig);
  console.log("✅ CommonJS build complete (bundled for Node.js)");
}
