import puppeteer from 'puppeteer';

(async () => {
  const baseUrl = 'http://localhost:5174';
  const email = 'demo@site.test';
  const password = 'model123';

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

    await page.screenshot({ path: 'tests/e2e/non_admin_reservada.png' });

    // Ensure user role is NOT admin (should be model)
    const isModel = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.role === 'model';
      } catch { return false; }
    });
    if (!isModel) {
      // Retry once after a brief delay, in case user was not yet loaded
      await delay(1000);
      const retryModel = await page.evaluate(async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) return false;
          const data = await res.json();
          return data?.role === 'model';
        } catch { return false; }
      });
      if (!retryModel) throw new Error('Authenticated user is not model or /api/auth/me failed');
    }

    // Navigate to /admin and verify access is denied
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait until the access denied text appears (from RequireAdmin or AdminDashboard fallback)
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('Acesso restrito ao administrador.') || text.includes('Acesso Restrito');
    }, { timeout: 30000 });

    const adminText = await page.evaluate(() => document.body.innerText);
    if (adminText.includes('Painel de Administração') || adminText.includes('Dashboard Administrativo')) {
      throw new Error('Non-admin user should not see admin dashboard headings');
    }

    await page.screenshot({ path: 'tests/e2e/non_admin_admin_denied.png' });

    console.log('SUCCESS: Non-admin login flow validated. /reservada accessible, /admin blocked.');
  } catch (err) {
    console.error('FAIL:', err?.message || err);
    try { await page.screenshot({ path: 'tests/e2e/non_admin_failure.png' }); } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();