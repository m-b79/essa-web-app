import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const root = process.cwd();
const apiBase = 'https://api-dofa.fff.fr';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function serveStatic(req, res) {
  const rawPath = req.url || '/';
  if (/(?:^|\/)(?:\.\.|%2e%2e)(?:\/|$)/i.test(rawPath)) {
    return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  const url = new URL(rawPath, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = resolve(root, `.${pathname}`);

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  try {
    const data = await readFile(filePath);
    send(res, 200, data, {
      'Content-Type': contentTypes.get(extname(filePath)) || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
  } catch {
    const html = await readFile(join(root, 'index.html'));
    send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8' });
  }
}

async function proxyApi(req, res) {
  const upstream = `${apiBase}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!['host', 'connection', 'content-length'].includes(key) && typeof value === 'string') {
      headers.set(key, value);
    }
  }
  headers.set('accept', headers.get('accept') || 'application/ld+json, application/json;q=0.9, */*;q=0.8');
  const response = await fetch(upstream, { method: req.method, headers });
  const body = Buffer.from(await response.arrayBuffer());
  const responseHeaders = {};
  response.headers.forEach((value, key) => {
    if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key)) responseHeaders[key] = value;
  });
  responseHeaders['access-control-allow-origin'] = '*';
  send(res, response.status, body, responseHeaders);
}

http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith('/api/')) return await proxyApi(req, res);
    if (req.url === '/health') return send(res, 200, 'ok', { 'Content-Type': 'text/plain; charset=utf-8' });
    return await serveStatic(req, res);
  } catch (error) {
    send(res, 500, JSON.stringify({ error: String(error) }), { 'Content-Type': 'application/json; charset=utf-8' });
  }
}).listen(port, host, () => {
  console.log(`ESSA app running on http://${host}:${port}`);
});
