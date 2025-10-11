import puppeteer from 'puppeteer';

(async () => {
  const baseUrl = 'http://localhost:5174';
  const email = process.env.DEMO_EMAIL || 'demo@site.test';
  const password = process.env.DEMO_PASSWORD || 'demo123';

  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 900 } });
  const page = await browser.newPage();

  // Log console from the page for debugging
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  try {
    console.log(`Testing login with demo user: ${email}`);
    
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

    // Verify user role is 'model'
    const userRole = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.user?.role;
      } catch { return null; }
    });

    if (userRole !== 'model') {
      throw new Error(`Expected user role 'model', but got: ${userRole}`);
    }

    console.log('SUCCESS: Demo user login successful. User role is: model');

    // Navigate to model dashboard/area reservada
    await page.goto(`${baseUrl}/reservada`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForSelector('h1', { timeout: 20000 });
    const h1Text = await page.$eval('h1', el => el.textContent.trim());
    if (!h1Text.toLowerCase().includes('área reservada')) {
      throw new Error(`Did not find 'Área Reservada' in h1. Found: ${h1Text}`);
    }

    // Verify demo user has model-specific access (not admin)
    const canAccessAdmin = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.canAccessAdmin === true || data?.user?.canAccessAdmin === true;
      } catch { return false; }
    });

    if (canAccessAdmin) {
      throw new Error('Demo user should not have admin access');
    }

    console.log('SUCCESS: Demo user has correct permissions (model role, no admin access)');

    // Take screenshot for verification
    await page.screenshot({ path: 'tests/e2e/demo_user_login.png' });

    console.log('SUCCESS: Demo user login and permissions validated successfully.');
  } catch (err) {
    console.error('FAIL:', err?.message || err);
    try { await page.screenshot({ path: 'tests/e2e/demo_user_failure.png' }); } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();