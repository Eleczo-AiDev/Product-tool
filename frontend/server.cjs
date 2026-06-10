/* Dependency-free static file server + API reverse proxy.
   Uses only Node built-ins, so the web image needs NO npm install at runtime
   and NO base image other than the (already cached) node:20-slim. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const API = process.env.API_URL || 'http://api:3000';
const PORT = process.env.PORT || 8080;
const dist = path.join(__dirname, 'dist');
const apiUrl = new URL(API);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
};

function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let filePath = path.join(dist, pathname);
  if (!filePath.startsWith(dist)) filePath = dist; // block path traversal
  fs.stat(filePath, (err, st) => {
    if (!err && st.isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' }); // SPA fallback
      fs.createReadStream(path.join(dist, 'index.html')).pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    const opts = {
      hostname: apiUrl.hostname,
      port: apiUrl.port || 80,
      path: req.url,                 // preserve the full /api/... path exactly once
      method: req.method,
      headers: { ...req.headers, host: apiUrl.host },
    };
    const proxy = http.request(opts, (pr) => {
      res.writeHead(pr.statusCode || 502, pr.headers);
      pr.pipe(res);
    });
    proxy.on('error', (e) => { res.writeHead(502, { 'Content-Type': 'text/plain' }); res.end('Proxy error: ' + e.message); });
    req.pipe(proxy);
  } else {
    serveStatic(req, res);
  }
});
server.listen(PORT, () => console.log(`web listening on ${PORT}, proxying /api -> ${API}`));
