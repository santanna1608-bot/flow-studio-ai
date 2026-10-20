import { createCloudHandler } from '../server/cloud.js';

export const config = { maxDuration: 300 };
const handle = createCloudHandler();
export default async function handler(req, res) {
  const url = new URL(req.url, 'https://localhost');
  const route = url.searchParams.get('__flowPath');
  if (url.pathname === '/api/handler' && route) {
    url.pathname = '/api/' + route;
    url.searchParams.delete('__flowPath');
    req.url = url.pathname + url.search;
  }
  return handle(req, res);
}
