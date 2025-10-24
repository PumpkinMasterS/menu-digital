import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE = process.env.BACKEND_PUBLIC_URL || 'https://backend-production-348d.up.railway.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const segs = (req.query.path as string[]) || [];
    const suffix = Array.isArray(segs) ? segs.join('/') : String(segs || '');
    const url = `${BASE}/public/${suffix}`;

    const method = req.method || 'GET';
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k] = v;
    }
    delete headers['host'];

    let body: any = undefined;
    if (req.body) {
      if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
        if (!headers['content-type']) headers['content-type'] = 'application/json';
      }
    }

    const r = await fetch(url, { method, headers, body });
    const buf = Buffer.from(await r.arrayBuffer());

    res.status(r.status);
    const passthrough = ['content-type', 'cache-control', 'etag'];
    r.headers.forEach((value, key) => {
      if (passthrough.includes(key)) res.setHeader(key, value);
    });
    res.send(buf);
  } catch (err: any) {
    res.status(502).json({ error: 'Bad Gateway', message: err?.message || 'proxy error' });
  }
}
