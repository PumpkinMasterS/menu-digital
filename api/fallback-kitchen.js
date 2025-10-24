module.exports = async (req, res) => {
  try {
    const url = 'https://backend-production-348d.up.railway.app/public/kitchen/index.html';
    const r = await fetch(url);
    if (!r.ok) {
      res.status(r.status).json({ error: 'Upstream error', status: r.status });
      return;
    }
    const html = await r.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (e) {
    res.status(502).json({ error: 'Failed to fetch kitchen index', detail: String(e) });
  }
};