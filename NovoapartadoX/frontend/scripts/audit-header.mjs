import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Preferir 127.0.0.1 para evitar resolução ::1 em alguns ambientes Windows/Chromium
const START_URL = process.env.AUDIT_URL || 'http://localhost:5174/';
const PATHS = (process.env.AUDIT_PATHS || '').split(',').map(s => s.trim()).filter(Boolean);
const OUTPUT_DIR = path.resolve(process.cwd(), 'scripts', 'reports');
const viewports = [
  { width: 320, height: 800, label: 'iPhone SE (320)' },
  { width: 375, height: 812, label: 'iPhone 12/13 (375x812)' },
  { width: 414, height: 896, label: 'iPhone 11 Pro Max (414x896)' },
  { width: 768, height: 900, label: 'Tablet (768)' },
  { width: 1440, height: 900, label: 'Desktop (1440x900)' },
];

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}
function bufToSVG(buf, width, height) {
  const base64 = buf.toString('base64');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n  <image href="data:image/png;base64,${base64}" width="${width}" height="${height}"/>\n</svg>`;
}
function saveSVG(buf, width, height, filePath) {
  const svg = bufToSVG(buf, width, height);
  fs.writeFileSync(filePath, svg, 'utf8');
}

async function navigateToPath(page, baseUrl, spaPath) {
  const url = new URL(baseUrl);
  // Ir sempre à raiz primeiro
  await page.goto(url.origin + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (!spaPath || spaPath === '/' ) return '/';
  // Tentar clicar link interno pela âncora
  const selector = `a[href="${spaPath}"]`;
  const found = await page.$(selector);
  if (found) {
    await Promise.all([
      page.click(selector),
      page.waitForFunction(p => location.pathname === p, {}, spaPath),
    ]);
    return spaPath.replace(/^\//,'');
  }
  // Fallback: usar history.pushState via evaluate
  await page.evaluate((p) => {
    history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, spaPath);
  await page.waitForFunction(p => location.pathname === p, {}, spaPath);
  return spaPath.replace(/^\//,'');
}

async function auditHeaderAtViewport(page, vp, currentPathSlug) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.waitForSelector('.site-header', { timeout: 20000 });
  await new Promise(res => setTimeout(res, 300));

  // Screenshots (full page + header recorte) como SVG
  ensureDir(OUTPUT_DIR);
  const slug = currentPathSlug || 'home';
  const fullBuf = await page.screenshot({ fullPage: true });
  const fullFile = path.join(OUTPUT_DIR, `full-${slug}-${vp.width}x${vp.height}.svg`);
  // Nota: o tamanho do SVG é definido pelo viewport
  saveSVG(fullBuf, vp.width, vp.height, fullFile);

  try {
    const headerHandle = await page.$('.site-header');
    if (headerHandle) {
      const hb = await headerHandle.boundingBox();
      if (hb) {
        const headerBuf = await page.screenshot({ clip: { x: hb.x, y: hb.y, width: Math.max(1, hb.width), height: Math.max(1, hb.height) } });
        const headerFile = path.join(OUTPUT_DIR, `header-${slug}-${vp.width}x${vp.height}.svg`);
        saveSVG(headerBuf, Math.max(1, Math.round(hb.width)), Math.max(1, Math.round(hb.height)), headerFile);
      }
    }
  } catch {}

  const data = await page.evaluate(() => {
    const d = document;
    const docW = d.documentElement.clientWidth;
    const scrollW = d.documentElement.scrollWidth;
    const overflowX = scrollW > docW;

    const header = d.querySelector('.site-header');
    const nav = d.querySelector('.site-header .nav');
    const brand = d.querySelector('.site-header .brand');
    const navLinks = d.querySelector('.site-header .nav-links');
    const actions = d.querySelector('.site-header .actions');

    const headerRect = header?.getBoundingClientRect();
    const navRect = nav?.getBoundingClientRect();

    const csHeader = header ? getComputedStyle(header) : null;
    const csNav = nav ? getComputedStyle(nav) : null;

    const brandW = brand ? brand.getBoundingClientRect().width : 0;
    const navLinksW = navLinks ? navLinks.scrollWidth : 0;
    const actionsW = actions ? actions.scrollWidth : 0;

    const paddingLeft = csNav ? parseFloat(csNav.paddingLeft) : 0;
    const paddingRight = csNav ? parseFloat(csNav.paddingRight) : 0;

    const sumContent = brandW + navLinksW + actionsW + paddingLeft + paddingRight;
    const available = navRect ? navRect.width : docW;

    const wrapRisk = navLinks ? (navLinks.getBoundingClientRect().height > 48) : false;

    const offenders = [];
    [brand, navLinks, actions, nav].forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const sw = el.scrollWidth;
      const cw = el.clientWidth;
      if (sw > cw || r.right > document.documentElement.clientWidth + 0.5) {
        offenders.push({
          selector: el.className ? `.${el.className.split(' ').join('.')}` : el.tagName.toLowerCase(),
          clientWidth: cw,
          scrollWidth: sw,
          right: r.right,
        });
      }
    });

    return {
      viewportWidth: docW,
      overflowX,
      header: {
        height: headerRect?.height ?? null,
        width: headerRect?.width ?? null,
        paddingBlock: csHeader ? `${csHeader.paddingTop} ${csHeader.paddingBottom}` : null,
        borderBottom: csHeader?.borderBottomWidth || null,
      },
      nav: {
        width: navRect?.width ?? null,
        paddingInline: csNav ? `${csNav.paddingLeft} ${csNav.paddingRight}` : null,
        justifyContent: csNav?.justifyContent || null,
        alignItems: csNav?.alignItems || null,
      },
      widths: { brandW, navLinksW, actionsW, sumContent, available },
      wrapRisk,
      offenders,
    };
  });

  const issues = [];
  if (data.overflowX) issues.push('Overflow horizontal detectado (scrollWidth > viewport).');
  if ((data.widths.sumContent || 0) > (data.widths.available || 0)) {
    issues.push(`Conteúdo da barra (${Math.round(data.widths.sumContent)}px) maior que área disponível (${Math.round(data.widths.available)}px).`);
  }
  if (data.wrapRisk) issues.push('Links da navegação estão a quebrar para segunda linha (altura > 48px).');
  if ((data.header.height || 0) > 72) issues.push(`Altura do header elevada: ~${Math.round(data.header.height)}px (alvo <= 56-64px).`);
  if (data.offenders.length) issues.push(`Elementos que excedem largura: ${data.offenders.map(o => o.selector).join(', ')}`);

  return { viewport: vp.label, path: `/${currentPathSlug||''}`, measurements: data, issues };
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const pathsToCheck = PATHS.length ? PATHS : [new URL(START_URL).pathname];
  const allReports = [];

  for (const spaPath of pathsToCheck) {
    let slug = 'home';
    try {
      slug = await navigateToPath(page, START_URL, spaPath);
    } catch (e) {
      allReports.push({ path: spaPath, error: `navigate error: ${e.message}` });
      continue;
    }

    for (const vp of viewports) {
      try {
        const rep = await auditHeaderAtViewport(page, vp, slug);
        allReports.push(rep);
      } catch (e) {
        allReports.push({ viewport: vp.label, path: `/${slug}`, error: e.message });
      }
    }
  }

  await browser.close();
  const summary = {
    startUrl: START_URL,
    paths: pathsToCheck,
    timestamp: new Date().toISOString(),
    reports: allReports,
  };

  // Persistir relatório JSON em disco
  ensureDir(OUTPUT_DIR);
  const tsSlug = summary.timestamp.replace(/[:.]/g, '-');
  const reportFile = path.join(OUTPUT_DIR, `audit-header-${tsSlug}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2), 'utf8');

  // Output legível
  for (const r of allReports) {
    if (r.error) {
      console.log(`Path ${r.path || ''} Viewport ${r.viewport || ''}: ERROR - ${r.error}`);
      continue;
    }
    const m = r.measurements;
    console.log(`\n[${r.viewport}] ${r.path}`);
    console.log(`- viewportWidth: ${m.viewportWidth}`);
    console.log(`- header.height: ${Math.round(m.header.height || 0)}px, nav.width: ${Math.round(m.nav.width || 0)}px`);
    console.log(`- widths -> brand: ${Math.round(m.widths.brandW)}px, navLinks: ${Math.round(m.widths.navLinksW)}px, actions: ${Math.round(m.widths.actionsW)}px, sum: ${Math.round(m.widths.sumContent)}px, available: ${Math.round(m.widths.available)}px`);
    console.log(`- overflowX: ${m.overflowX}`);
    if (m.offenders?.length) {
      console.log(`- offenders:`);
      m.offenders.forEach(o => console.log(`  • ${o.selector} (scrollWidth ${o.scrollWidth}px > clientWidth ${o.clientWidth}px, right ${Math.round(o.right)}px)`));
    }
    if (r.issues?.length) {
      console.log(`- issues:`);
      r.issues.forEach(i => console.log(`  • ${i}`));
    } else {
      console.log(`- issues: none`);
    }
  }

  console.log(`\nSUMMARY_JSON_START`);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`SUMMARY_JSON_END`);
  console.log(`REPORT_FILE: ${reportFile}`);
})();