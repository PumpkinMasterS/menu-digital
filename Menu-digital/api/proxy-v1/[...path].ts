export default async function handler(req: any, res: any) {
  try {
    const backend = process.env.BACKEND_PUBLIC_URL;
    if (!backend) {
      res.status(500).json({ error: 'Missing BACKEND_PUBLIC_URL environment variable' });
      return;
    }

    const pathParam = Array.isArray(req.query.path)
      ? req.query.path.join('/')
      : (req.query.path || '').toString();

    const url = new URL(`${backend.replace(/\/$/, '')}/v1/${pathParam}`);

    // Append query string
    const query = req.query || {};
    for (const [key, value] of Object.entries(query)) {
      if (key === 'path') continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, String(v));
      } else if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }

    // Prepare headers: forward most headers except host and connection
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (!value) continue;
      const lower = key.toLowerCase();
      if (['host', 'connection', 'content-length'].includes(lower)) continue;
      headers[lower] = Array.isArray(value) ? value.join(',') : String(value);
    }

    const init: RequestInit = {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    } as any;

    const response = await fetch(url.toString(), init);

    // Forward status and headers
    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      // Avoid setting multiple cookies incorrectly; cookies should pass through
      if (key.toLowerCase() === 'set-cookie') {
        const cookieValues = response.headers.get('set-cookie');
        if (cookieValues) {
          res.setHeader('Set-Cookie', cookieValues);
        }
        continue;
      }
      res.setHeader(key, value);
    }

    // Stream body to client
    if (!response.body) {
      const buf = await response.arrayBuffer();
      res.send(Buffer.from(buf));
      return;
    }

    const reader = response.body.getReader();
    res.flushHeaders?.();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: 'Proxy error', details: err?.message || String(err) });
  }
}