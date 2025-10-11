import puppeteer from 'puppeteer';

(async () => {
  const baseUrl = 'http://localhost:5174';
  const email = 'admin@site.test';
  const password = 'admin123';

  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 900 } });
  const page = await browser.newPage();

  // Log console from the page for debugging
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  try {
    // Go to Login page
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Fill form
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
    // Clear any prefilled text and type
    await page.click('input[type="email"]', { clickCount: 3 });
    await page.type('input[type="email"]', email, { delay: 5 });
    await page.click('input[type="password"]', { clickCount: 3 });
    await page.type('input[type="password"]', password, { delay: 5 });

    // Submit (use submit button selector)
    await page.click('button[type="submit"], button.btn.btn-primary');

    // Wait for login XHR to complete successfully (best-effort)
    await page.waitForResponse((response) => {
      try {
        const url = response.url();
        return url.includes('/api/auth/login') && response.request().method() === 'POST' && response.status() === 200;
      } catch (_) {
        return false;
      }
    }, { timeout: 45000 }).catch(() => {});

    // Wait until token is set in localStorage by AuthContext
    await page.waitForFunction(() => !!localStorage.getItem('token'), { timeout: 45000 });

    // If URL didn't change automatically, navigate to /reservada explicitly
    if (!(await page.evaluate(() => location.pathname.includes('/reservada')))) {
      await page.goto(`${baseUrl}/reservada`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    await page.waitForSelector('h1', { timeout: 20000 });
    const h1Text = await page.$eval('h1', el => el.textContent.trim());
    if (!h1Text.toLowerCase().includes('área reservada')) {
      throw new Error(`Did not find 'Área Reservada' in h1. Found: ${h1Text}`);
    }

    await page.screenshot({ path: 'tests/e2e/login_reservada.png' });

    // Ensure user role is admin before visiting /admin
    const isAdmin = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return false;
        const data = await res.json();
        return (data?.user?.role === 'admin') || (data?.canAccessAdmin === true) || (data?.user?.canAccessAdmin === true);
      } catch { return false; }
    });
    if (!isAdmin) {
      // Retry once after a brief delay, in case user was not yet loaded
      await delay(1000);
      const retryAdmin = await page.evaluate(async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return false;
          const data = await res.json();
          return (data?.user?.role === 'admin') || (data?.canAccessAdmin === true) || (data?.user?.canAccessAdmin === true);
        } catch { return false; }
      });
      if (!retryAdmin) throw new Error('Authenticated user is not admin or /api/auth/me failed');
    }

    // Navigate to /admin and verify access
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait until either placeholder or full dashboard heading appears
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Painel de Administração') || text.includes('Dashboard Administrativo');
    }, { timeout: 30000 });

    const adminText = await page.evaluate(() => document.body.innerText);
    if (!adminText.includes('Painel de Administração') && !adminText.includes('Dashboard Administrativo')) {
      throw new Error('Admin page did not show expected headings');
    }

    await page.screenshot({ path: 'tests/e2e/admin_dashboard.png' });

    console.log('SUCCESS: Login UI flow validated. /reservada and /admin accessible.');
  } catch (err) {
    console.error('FAIL:', err?.message || err);
    try { await page.screenshot({ path: 'tests/e2e/failure.png' }); } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();