import { build } from 'esbuild';
import { writeFileSync, readFileSync, copyFileSync, existsSync, mkdirSync, chmodSync, readdirSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import url from 'url';
import mime from 'mime-types';

function getPublicAssets(dir, baseDir = dir) {
  const assets = {};
  if (!existsSync(dir)) return assets;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(assets, getPublicAssets(fullPath, baseDir));
    } else {
      const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const content = readFileSync(fullPath);
      const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
      assets[relPath] = {
        mime: mimeType,
        b64: content.toString('base64')
      };
    }
  }
  return assets;
}

async function run() {
  console.log('Starting standalone binary build...');
  
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  console.log('1. Bundling Nuxt Nitro server with esbuild...');
  await build({
    entryPoints: ['.output/server/index.mjs'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: 'dist/server.cjs',
    banner: {
      js: 'const importMetaUrl = require("url").pathToFileURL(__filename || process.execPath).href;'
    },
    define: {
      'import.meta.url': 'importMetaUrl',
      'process.env.NODE_ENV': '"production"'
    },
    logLevel: 'info'
  });

  console.log('2. Inlining public static assets into server bundle...');
  const publicAssets = getPublicAssets('.output/public');
  const assetCount = Object.keys(publicAssets).length;
  console.log(`Found ${assetCount} static assets in .output/public`);

  const assetMiddleware = `
const http = require('http');
const embeddedAssets = ${JSON.stringify(publicAssets)};

const originalEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, req, res) {
  if (event === 'request' && req && res) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      let pathname = parsed.pathname || '/';
      if (pathname === '/') pathname = '/index.html';
      const asset = embeddedAssets[pathname] || embeddedAssets[decodeURIComponent(pathname)];
      if (asset) {
        const buf = Buffer.from(asset.b64, 'base64');
        res.writeHead(200, {
          'Content-Type': asset.mime,
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=31536000, immutable'
        });
        res.end(buf);
        return true;
      }
    } catch (e) {
      // Fallback to normal handler
    }
  }
  return originalEmit.apply(this, arguments);
};
`;

  let code = readFileSync('dist/server.cjs', 'utf8');
  const validUrl = url.pathToFileURL(process.cwd() + '/index.js').href;
  code = code.replaceAll('file:///_entry.js', validUrl);
  
  // Inject asset middleware at top
  code = assetMiddleware + '\n' + code;
  writeFileSync('dist/server.cjs', code);

  console.log('3. Preparing Node SEA config...');
  const seaConfig = {
    main: 'dist/server.cjs',
    output: 'dist/sea-prep.blob',
    disableExperimentalSEAWarning: true
  };
  writeFileSync('dist/sea-config.json', JSON.stringify(seaConfig, null, 2));

  console.log('4. Generating SEA blob...');
  execSync('node --experimental-sea-config dist/sea-config.json', { stdio: 'inherit' });

  console.log('5. Preparing host Node binary executable...');
  const nodeBinaryPath = process.execPath;
  const isWin = process.platform === 'win32';
  const targetExe = isWin ? 'dist/mailium.exe' : 'dist/mailium';

  if (existsSync(targetExe)) {
    try { unlinkSync(targetExe); } catch (e) {}
  }
  copyFileSync(nodeBinaryPath, targetExe);

  console.log('6. Injecting blob into executable using postject...');
  const postjectCmd = isWin
    ? `npx postject ${targetExe} NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --overwrite`
    : `npx postject ${targetExe} NODE_SEA_BLOB dist/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`;

  execSync(postjectCmd, { stdio: 'inherit' });

  if (!isWin) {
    console.log('7. Setting executable permissions (+x)...');
    chmodSync(targetExe, 0o755);
  }

  console.log(`✨ Successfully generated standalone binary at ${targetExe}!`);
}

run().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
