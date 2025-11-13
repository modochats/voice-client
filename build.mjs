import * as esbuild from 'esbuild';
import { copyFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ESM build for browsers (bundled)
await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/esm/index.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: false,
  treeShaking: true,
  logLevel: 'info',
});

console.log('✅ ESM build complete (bundled for browsers)');

// CommonJS build for Node.js (bundled)
await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/cjs/index.js',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'es2020',
  sourcemap: true,
  minify: false,
  logLevel: 'info',
});

console.log('✅ CommonJS build complete (bundled for Node.js)');

// Copy audio-processor.js to dist/esm
const audioProcessorSrc = join(__dirname, '../client/audio-processor.js');
const audioProcessorDest = join(__dirname, 'dist/esm/audio-processor.js');

try {
  await copyFile(audioProcessorSrc, audioProcessorDest);
  console.log('✅ Copied audio-processor.js to dist/esm');
} catch (error) {
  console.warn('⚠️  Could not copy audio-processor.js:', error.message);
}

