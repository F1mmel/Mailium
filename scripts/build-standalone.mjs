import { build } from 'esbuild';
import { writeFileSync, readFileSync, copyFileSync, existsSync, mkdirSync, chmodSync, readdirSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import url from 'url';
import mime from 'mime-types';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const appVersion = `v${pkg.version || '2.0.0'}`;

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
  console.log(`Starting standalone binary build for ${appVersion}...`);
  
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

  console.log('2. Inlining public static assets & auto-updater module...');
  const publicAssets = getPublicAssets('.output/public');
  const assetCount = Object.keys(publicAssets).length;
  console.log(`Found ${assetCount} static assets in .output/public`);

  const updaterAndAssetMiddleware = `
(async function() {
  const fs = require('fs');
  const path = require('path');
  const child_process = require('child_process');

  // Clean up any old executable leftovers from previous Windows update
  try {
    const oldPath = process.execPath + '.old';
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  } catch (e) {}

  const args = process.argv.slice(2);
  let customPort = null;
  let skipUpdate = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--port=')) {
      customPort = arg.split('=')[1];
    } else if (arg === '--port' || arg === '-p') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        customPort = args[i + 1];
      }
    } else if (arg === '--no-update' || arg === '--skip-update') {
      skipUpdate = true;
    }
  }

  if (customPort) {
    const p = parseInt(customPort, 10);
    if (!isNaN(p) && p > 0) {
      process.env.NITRO_PORT = String(p);
      process.env.PORT = String(p);
    }
  }

  if (!skipUpdate) {
    try {
      console.log('[Auto-Update] Checking GitHub Releases for updates...');
      const res = await fetch('https://api.github.com/repos/F1mmel/Mailium/releases/latest', {
        headers: { 'User-Agent': 'Mailium-AutoUpdater' }
      });
      if (res.ok) {
        const release = await res.json();
        const latestTag = release.tag_name;
        const currentTag = ${JSON.stringify(appVersion)};
        
        if (latestTag && latestTag !== currentTag) {
          console.log('[Auto-Update] 🚀 New version found: ' + latestTag + ' (current: ' + currentTag + ')');
          const isWin = process.platform === 'win32';
          const targetAssetName = isWin ? 'mailium.exe' : 'mailium';
          const asset = release.assets && release.assets.find(a => a.name === targetAssetName);

          if (asset && asset.browser_download_url) {
            console.log('[Auto-Update] Downloading ' + asset.name + ' from ' + asset.browser_download_url + '...');
            const downloadRes = await fetch(asset.browser_download_url, {
              headers: { 'User-Agent': 'Mailium-AutoUpdater' }
            });
            if (downloadRes.ok) {
              const execPath = process.execPath;
              const tmpPath = execPath + '.tmp';
              const oldPath = execPath + '.old';
              const arrayBuffer = await downloadRes.arrayBuffer();
              fs.writeFileSync(tmpPath, Buffer.from(arrayBuffer));

              if (!isWin) {
                fs.chmodSync(tmpPath, 0o755);
              }

              console.log('[Auto-Update] Applying update...');
              if (isWin) {
                if (fs.existsSync(oldPath)) {
                  try { fs.unlinkSync(oldPath); } catch (e) {}
                }
                fs.renameSync(execPath, oldPath);
                fs.copyFileSync(tmpPath, execPath);
                try { fs.unlinkSync(tmpPath); } catch (e) {}
              } else {
                fs.renameSync(tmpPath, execPath);
              }

              console.log('[Auto-Update] ✨ Successfully updated to ' + latestTag + '! Restarting application...');
              const child = child_process.spawn(execPath, process.argv.slice(1), {
                detached: true,
                stdio: 'inherit'
              });
              child.unref();
              process.exit(0);
            }
          }
        } else {
          console.log('[Auto-Update] Mailium is up to date.');
        }
      }
    } catch (err) {
      console.log('[Auto-Update] Update check skipped/failed:', err.message);
    }
  }
})();

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
  
  // Inject auto-updater & asset middleware at top
  code = updaterAndAssetMiddleware + '\n' + code;
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
