/*
  Preview server for local testing of unified public build with SPA rewrites and backend proxy.
  - Serves /admin, /kitchen, /menu as separate SPAs from public subfolders
  - Fallbacks to each app's index.html for deep links
  - Proxies /v1/* and /public/* to BACKEND_PUBLIC_URL (defaults to http://localhost:3000)
*/

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 8080;
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3000';
const publicDir = path.join(__dirname, '..', 'backend', 'public');

// Proxies to backend for API and public assets
app.use('/v1', createProxyMiddleware({ target: BACKEND_PUBLIC_URL, changeOrigin: true }));
app.use('/public', createProxyMiddleware({ target: BACKEND_PUBLIC_URL, changeOrigin: true }));

// Serve static assets for each app
app.use('/admin', express.static(path.join(publicDir, 'admin')));
app.use('/kitchen', express.static(path.join(publicDir, 'kitchen')));
app.use('/menu', express.static(path.join(publicDir, 'menu')));

// Serve static root (for index.html redirect and any shared assets)
app.use(express.static(publicDir));

// SPA fallbacks for deep links using regex patterns compatible with path-to-regexp v6
app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'index.html'));
});
app.get(/^\/kitchen(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(publicDir, 'kitchen', 'index.html'));
});
app.get(/^\/menu(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(publicDir, 'menu', 'index.html'));
});

// Root fallback: serve top-level index.html (redirects to /menu/)
app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Preview server running at http://localhost:${port}/`);
  console.log(`Backend proxy target: ${BACKEND_PUBLIC_URL}`);
});