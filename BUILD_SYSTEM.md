# Build System

## Overview

The SDK uses **esbuild** for fast, clean bundling with proper ESM/CJS output.

## Build Output

```
dist/
├── esm/
│   ├── index.js          # Single bundled file (~45KB)
│   └── index.js.map      # Source map
├── cjs/
│   ├── index.js          # Single bundled file (~47KB)
│   └── index.js.map      # Source map
└── types/
    └── ...               # TypeScript declarations (.d.ts)
```

## Why esbuild?

### ✅ Benefits

1. **Fast**: Builds in ~10ms
2. **Clean**: Single bundled file per format
3. **No workarounds**: Native ESM/CJS support
4. **Tree-shaking**: Removes unused code
5. **Source maps**: Full debugging support

### ❌ Previous Issues (Fixed)

- ~~Manual `.js` extension addition~~
- ~~Complex post-build scripts~~
- ~~Multiple files with import resolution issues~~

## Build Commands

### Full Build

```bash
npm run build
```

Does:
1. Clean `dist/` folder
2. Bundle TypeScript with esbuild (ESM + CJS)
3. Generate type declarations with `tsc`

### Watch Mode

```bash
npm run build:watch
```

Auto-rebuilds on file changes.

### Clean

```bash
npm run clean
```

Removes `dist/` folder.

### Type Check

```bash
npm run type-check
```

Checks types without building.

## Configuration

### esbuild (build.mjs)

```javascript
// ESM for browsers
{
  entryPoints: ['src/index.ts'],
  outfile: 'dist/esm/index.js',
  bundle: true,          // Bundle all imports
  format: 'esm',         // ES Modules
  platform: 'browser',   // Browser optimizations
  target: 'es2020',      // Modern browsers
  sourcemap: true,
  minify: false,         // Keep readable
  treeShaking: true      // Remove unused code
}

// CJS for Node.js
{
  entryPoints: ['src/index.ts'],
  outfile: 'dist/cjs/index.js',
  bundle: true,
  format: 'cjs',         // CommonJS
  platform: 'node',      // Node.js optimizations
  target: 'es2020',
  sourcemap: true,
  minify: false
}
```

### TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "declaration": true,       // Generate .d.ts
    "declarationMap": true,    // Map to source
    "outDir": "./dist/types",  // Type output
    "strict": true
  }
}
```

## Package.json Exports

```json
{
  "main": "dist/cjs/index.js",     // Node.js (require)
  "module": "dist/esm/index.js",   // Bundlers (import)
  "types": "dist/types/index.d.ts", // TypeScript
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

This ensures:
- Node.js uses CJS by default
- Modern bundlers use ESM
- TypeScript gets proper types
- Conditional exports work correctly

## Browser Usage

The HTML file loads the single ESM bundle:

```html
<script type="module">
  import { ModoVoiceClient, EventType, LogLevel } 
    from '/client-sdk/dist/esm/index.js';
  
  // Everything is bundled in this one file!
  const client = new ModoVoiceClient({ ... });
</script>
```

**No more**:
- ❌ Multiple file loads
- ❌ Import resolution errors
- ❌ Missing `.js` extensions
- ❌ 404 errors

## Development Workflow

1. **Edit** TypeScript files in `src/`
2. **Build**: `npm run build`
3. **Test** in browser at `http://localhost:8000`
4. **Repeat**

Or use watch mode:

```bash
npm run build:watch
```

## File Sizes

| Format | Size | Gzipped | Use Case |
|--------|------|---------|----------|
| ESM | 45KB | ~12KB | Browsers |
| CJS | 47KB | ~13KB | Node.js |
| Types | ~20KB | - | TypeScript |

## Performance

```bash
Clean:     ~10ms
ESM build: ~10ms
CJS build: ~3ms
Types:     ~200ms
Total:     ~220ms ⚡️
```

## Comparison

### Before (TypeScript + Manual Fixes)

```bash
tsc                          # 1000ms
tsc -p tsconfig.esm.json     # 1000ms
node fix-imports.js          # 100ms
Total: ~2100ms
```

**Issues**:
- Multiple output files
- Manual import fixing
- Browser resolution errors

### After (esbuild)

```bash
node build.mjs               # 13ms
tsc --emitDeclarationOnly    # 200ms
Total: ~220ms ⚡️
```

**Benefits**:
- 10x faster
- Single bundled file
- No post-processing
- Clean exports

## Troubleshooting

### Build Fails

```bash
npm run clean
npm install
npm run build
```

### Types Not Updating

```bash
npm run build:types
```

### Bundle Too Large

Currently optimized for development. For production:

```javascript
// In build.mjs
minify: true,           // Enable minification
treeShaking: true,      // Already enabled
```

This reduces size by ~40%.

### Source Maps Missing

Check `sourcemap: true` in `build.mjs`.

## Future Optimizations

### Code Splitting

If bundle grows large, enable splitting:

```javascript
splitting: true,
format: 'esm'  // Only works with ESM
```

### Minification

For production builds:

```javascript
minify: true
```

### External Dependencies

To exclude dependencies from bundle:

```javascript
external: ['some-package']
```

## Why Not Webpack/Rollup?

| Tool | Speed | Config | Size | Winner |
|------|-------|--------|------|--------|
| esbuild | ⚡️⚡️⚡️ | ✅ Simple | ✅ Small | ✅ |
| Rollup | 🐌 Slow | ⚠️ Complex | ✅ Small | - |
| Webpack | 🐌 Very Slow | ❌ Very Complex | ⚠️ Large | - |

**esbuild** is the clear winner for our use case:
- Fast development builds
- Simple configuration
- Native ESM/CJS support
- No plugins needed

## Summary

✅ **Clean build system** with esbuild
✅ **Single bundled file** per format  
✅ **10x faster** than TypeScript compiler
✅ **No workarounds** or post-processing
✅ **Proper ESM/CJS** support
✅ **Type safety** with generated declarations

---

**Last Updated**: 2024-12-06  
**Build Tool**: esbuild 0.25.12  
**Build Time**: ~220ms

