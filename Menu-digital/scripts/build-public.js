#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function emptyDir(dir) {
  if (exists(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!exists(src)) {
    console.warn(`[skip] ${src} não existe`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(s);
      fs.symlinkSync(link, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function writeIndexHtml(destDir) {
  const html = `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=/menu/" />
    <title>Menu Digital</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body{font-family:system-ui,Segoe UI,Arial;padding:24px}</style>
  </head>
  <body>
    <p>Redirecionando para <a href="/menu/">/menu/</a>…</p>
  </body>
</html>`;
  fs.writeFileSync(path.join(destDir, 'index.html'), html, 'utf8');
}

(function main() {
  const root = process.cwd();
  const publicDir = path.join(root, 'backend', 'public');
  const adminDist = path.join(root, 'apps', 'admin', 'dist');
  const kitchenDist = path.join(root, 'apps', 'kitchen', 'dist');
  const menuDist = path.join(root, 'apps', 'menu', 'dist');

  console.log('[build-public] preparando diretório public');
  emptyDir(publicDir);

  console.log('[build-public] copiando admin/dist -> public/admin');
  copyDir(adminDist, path.join(publicDir, 'admin'));

  console.log('[build-public] copiando kitchen/dist -> public/kitchen');
  copyDir(kitchenDist, path.join(publicDir, 'kitchen'));

  console.log('[build-public] copiando menu/dist -> public/menu');
  copyDir(menuDist, path.join(publicDir, 'menu'));

  console.log('[build-public] escrevendo public/index.html');
  writeIndexHtml(publicDir);

  console.log('[build-public] concluído.');
})();