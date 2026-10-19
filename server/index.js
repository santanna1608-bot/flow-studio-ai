import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createApiMiddleware } from './api.js';

const root = resolve('dist');
const api = createApiMiddleware();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
createServer((req, res) => api(req, res, async () => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    const target = extname(path) ? path : resolve(root, 'index.html');
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Arquivo não encontrado. Execute npm run build.'); }
})).listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Flow Studio: http://127.0.0.1:' + (process.env.PORT || 3000)));
