import assert from 'node:assert';
import http from 'node:http';
import { spawn, ChildProcess } from 'node:child_process';

function httpGet(url: string): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>{
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c as Buffer));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

function httpPost(url: string, json: any): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>{
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(json), 'utf8');
    const u = new URL(url);
    const opts: http.RequestOptions = {
      method: 'POST',
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c as Buffer));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parsePromMetric(body: string, metricName: string, labels: Record<string,string>): number {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    // Evitar colisão com métricas com sufixo (ex: *_created)
    const startsWithTarget = line.startsWith(metricName + ' ') || line.startsWith(metricName + '{') || line === metricName;
    if (!startsWithTarget) continue;
    const braceStart = line.indexOf('{');
    const braceEnd = line.indexOf('}');
    let labelOk = true;
    if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
      const labelStr = line.substring(braceStart + 1, braceEnd);
      const pairs = labelStr.split(',').filter(Boolean).map(p => p.trim());
      const found: Record<string,string> = {};
      for (const p of pairs) {
        const [k, v] = p.split('=');
        if (!k) continue;
        found[k.trim()] = (v || '').trim().replace(/^"|"$/g, '');
      }
      for (const [k, v] of Object.entries(labels)) {
        if (found[k] !== v) { labelOk = false; break; }
      }
      if (!labelOk) continue;
      const valuePart = line.substring(braceEnd + 1).trim();
      const val = parseFloat(valuePart.split(/\s+/)[0]);
      if (!Number.isNaN(val)) return val;
    } else {
      // Métrica sem labels; pegar o valor após o nome
      if (Object.keys(labels).length > 0) { labelOk = false; }
      if (!labelOk) continue;
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts.length >= 2 && parts[0] === metricName) {
        const val = parseFloat(parts[1]);
        if (!Number.isNaN(val)) return val;
      }
    }
  }
  return 0;
}

async function detectBaseUrl(): Promise<string> {
  const envBase = process.env.BASE_URL?.trim();
  const candidates = envBase ? [envBase] : ['http://localhost:3001', 'http://localhost:3000'];
  for (const base of candidates) {
    try {
      const res = await httpGet(`${base}/healthz`);
      if (res.status === 200 && /\{"status":"ok"\}/.test(res.body)) {
        return base;
      }
    } catch {
      // ignore and try next
    }
  }
  throw new Error(`Não foi possível detectar o BASE_URL automaticamente. Tente exportar BASE_URL, e.g.: http://localhost:3001`);
}

async function waitForHealth(base: string, timeoutMs = 8000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpGet(`${base}/healthz`);
      if (res.status === 200 && /\{"status":"ok"\}/.test(res.body)) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

async function ensureServerAndBaseUrl(): Promise<{ base: string, child?: ChildProcess }> {
  try {
    const base = await detectBaseUrl();
    return { base };
  } catch {}

  const ports = [3001, 3002, 3003];
  for (const p of ports) {
    const base = `http://localhost:${p}`;
    try {
      const res = await httpGet(`${base}/healthz`);
      if (res.status === 200 && /\{"status":"ok"\}/.test(res.body)) {
        return { base };
      }
    } catch {}

    const child = spawn('node', ['dist/index.js'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(p), NODE_ENV: process.env.NODE_ENV || 'test' },
    });
    const ok = await waitForHealth(base, 8000);
    if (ok) return { base, child };
    try { child.kill('SIGTERM'); } catch {}
  }
  throw new Error('Não foi possível iniciar o servidor de testes');
}

async function main() {
  const { base, child } = await ensureServerAndBaseUrl();

  // sanity check
  const health = await httpGet(`${base}/healthz`);
  assert.equal(health.status, 200, '/healthz should be 200');
  assert.equal(health.body, '{"status":"ok"}', '/healthz body should be {"status":"ok"}');

  // fetch initial metrics
  const metricsInitial = await httpGet(`${base}/metrics`);
  assert.equal(metricsInitial.status, 200, '/metrics should be 200');

  const symbol = 'BTCUSDT';
  const timeframe = '1m';

  // Baseline metrics before trades
  const tcWinBefore = parsePromMetric(metricsInitial.body, 'trades_count_total', { symbol, timeframe, outcome: 'win' });
  const tcLossBefore = parsePromMetric(metricsInitial.body, 'trades_count_total', { symbol, timeframe, outcome: 'loss' });
  const rrWinCountBefore = parsePromMetric(metricsInitial.body, 'trades_rr_ratio_count', { symbol, timeframe, outcome: 'win' });
  const rrLossCountBefore = parsePromMetric(metricsInitial.body, 'trades_rr_ratio_count', { symbol, timeframe, outcome: 'loss' });
  const pnlWinsBefore = parsePromMetric(metricsInitial.body, 'trades_realized_pnl_wins_usd_total', { symbol, timeframe });
  const pnlLossesBefore = parsePromMetric(metricsInitial.body, 'trades_realized_pnl_losses_usd_total', { symbol, timeframe });

  // Record a winning trade
  const winPayload = {
    symbol,
    timeframe,
    side: 'long',
    entryPrice: 100,
    exitPrice: 102,
    stopPrice: 99,
    sizeUsd: 1000,
    highPrice: 102.4,
    lowPrice: 99.5,
    feesUsd: 0
  };
  const postWin = await httpPost(`${base}/trades/record`, winPayload);
  assert.equal(postWin.status, 200, '/trades/record expected 200');
  const postWinBody = JSON.parse(postWin.body || '{}');
  assert.equal(postWinBody.ok, true, '/trades/record response ok should be true');

  // After win
  const mAfterWin = await httpGet(`${base}/metrics`);
  assert.equal(mAfterWin.status, 200, 'metrics after win trade should be 200');
  const tcWinAfter = parsePromMetric(mAfterWin.body, 'trades_count_total', { symbol, timeframe, outcome: 'win' });
  const rrWinCountAfter = parsePromMetric(mAfterWin.body, 'trades_rr_ratio_count', { symbol, timeframe, outcome: 'win' });
  const pnlWinsAfter = parsePromMetric(mAfterWin.body, 'trades_realized_pnl_wins_usd_total', { symbol, timeframe });

  assert.ok(tcWinAfter >= tcWinBefore + 1, `trades_count_total win should increase by >=1 (before=${tcWinBefore}, after=${tcWinAfter})`);
  assert.ok(rrWinCountAfter >= rrWinCountBefore + 1, `trades_rr_ratio_count win should increase by >=1 (before=${rrWinCountBefore}, after=${rrWinCountAfter})`);
  assert.ok(pnlWinsAfter >= pnlWinsBefore + 19.9 && pnlWinsAfter <= pnlWinsBefore + 20.1, `trades_realized_pnl_wins_usd_total should increase by ~20 (before=${pnlWinsBefore}, after=${pnlWinsAfter})`);

  // Record a losing trade
  const lossPayload = {
    symbol,
    timeframe,
    side: 'long',
    entryPrice: 100,
    exitPrice: 99,
    stopPrice: 101,
    sizeUsd: 1000,
    highPrice: 100.8,
    lowPrice: 98.5,
    feesUsd: 0
  };
  const postLoss = await httpPost(`${base}/trades/record`, lossPayload);
  assert.equal(postLoss.status, 200, `/trades/record expected 200, got ${postLoss.status}`);
  const postLossBody = JSON.parse(postLoss.body || '{}');
  assert.equal(postLossBody.ok, true, '/trades/record response ok should be true');

  // After loss
  const mAfterLoss = await httpGet(`${base}/metrics`);
  assert.equal(mAfterLoss.status, 200, 'metrics after loss trade should be 200');

  const tcLossAfter = parsePromMetric(mAfterLoss.body, 'trades_count_total', { symbol, timeframe, outcome: 'loss' });
  const rrLossCountAfter = parsePromMetric(mAfterLoss.body, 'trades_rr_ratio_count', { symbol, timeframe, outcome: 'loss' });
  const pnlLossesAfter = parsePromMetric(mAfterLoss.body, 'trades_realized_pnl_losses_usd_total', { symbol, timeframe });

  assert.ok(tcLossAfter >= tcLossBefore + 1, `trades_count_total loss should increase by >=1 (before=${tcLossBefore}, after=${tcLossAfter})`);
  // O histograma trades_rr_ratio só observa valores de rr > 0; em perdas rr é negativo e não é observado.
  // Portanto, não esperamos incremento em perdas; apenas garantimos que não haja decréscimo.
  assert.ok(rrLossCountAfter >= rrLossCountBefore, `trades_rr_ratio_count loss should not decrease (before=${rrLossCountBefore}, after=${rrLossCountAfter})`);
  assert.ok(pnlLossesAfter >= pnlLossesBefore + 9.9 && pnlLossesAfter <= pnlLossesBefore + 10.1, `trades_realized_pnl_losses_usd_total should increase by ~10 (before=${pnlLossesBefore}, after=${pnlLossesAfter})`);

  // ==== Risk Gates: Kill Switch ====
  const metricsBeforeKS = await httpGet(`${base}/metrics`);
  const ksGaugeBefore = parsePromMetric(metricsBeforeKS.body, 'risk_killswitch_active', {});
  const ksBlocksBefore = parsePromMetric(metricsBeforeKS.body, 'risk_blocks_total', { reason: 'manual_killswitch' });

  const ksOn = await httpPost(`${base}/risk/killswitch`, { active: true });
  assert.equal(ksOn.status, 200, `/risk/killswitch ON expected 200, got ${ksOn.status}`);
  const ksOnBody = JSON.parse(ksOn.body || '{}');
  assert.equal(ksOnBody.ok, true, 'killswitch ON ok should be true');
  assert.equal(ksOnBody.active, true, 'killswitch active should be true');

  const metricsAfterKSOn = await httpGet(`${base}/metrics`);
  const ksGaugeAfterOn = parsePromMetric(metricsAfterKSOn.body, 'risk_killswitch_active', {});
  assert.equal(ksGaugeAfterOn, 1, 'risk_killswitch_active should be 1 after enabling');
  // Verificar gauge de gate manual e endpoint /risk/status durante killswitch ON
  const gateManualBlockedOn = parsePromMetric(metricsAfterKSOn.body, 'risk_gate_blocked', { type: 'manual_killswitch' });
  assert.equal(gateManualBlockedOn, 1, 'risk_gate_blocked{type="manual_killswitch"} should be 1 after enabling');
  const statusKSOn = await httpGet(`${base}/risk/status`);
  assert.equal(statusKSOn.status, 200, '/risk/status during killswitch should be 200');
  const statusKSOnBody = JSON.parse(statusKSOn.body || '{}');
  assert.equal(!!statusKSOnBody.risk?.gates?.manual_killswitch_blocked, true, 'manual_killswitch_blocked should be true during killswitch');

  const metricsAfterKSBlock = await httpGet(`${base}/metrics`);
  const ksBlocksAfter = parsePromMetric(metricsAfterKSBlock.body, 'risk_blocks_total', { reason: 'manual_killswitch' });
  assert.ok(ksBlocksAfter >= ksBlocksBefore + 1, `risk_blocks_total{reason="manual_killswitch"} should increase by >=1 (before=${ksBlocksBefore}, after=${ksBlocksAfter})`);

  const ksOff = await httpPost(`${base}/risk/killswitch`, { active: false });
  assert.equal(ksOff.status, 200, `/risk/killswitch OFF expected 200, got ${ksOff.status}`);
  const ksOffBody = JSON.parse(ksOff.body || '{}');
  assert.equal(ksOffBody.ok, true, 'killswitch OFF ok should be true');
  const metricsAfterKSOff = await httpGet(`${base}/metrics`);
  const ksGaugeAfterOff = parsePromMetric(metricsAfterKSOff.body, 'risk_killswitch_active', {});
  assert.equal(ksGaugeAfterOff, 0, 'risk_killswitch_active should be 0 after disabling');
  // Verificar gauge manual_killswitch e status após desativar
  const gateManualBlockedOff = parsePromMetric(metricsAfterKSOff.body, 'risk_gate_blocked', { type: 'manual_killswitch' });
  assert.equal(gateManualBlockedOff, 0, 'risk_gate_blocked{type="manual_killswitch"} should be 0 after disabling');
  const statusKSOff = await httpGet(`${base}/risk/status`);
  const statusKSOffBody = JSON.parse(statusKSOff.body || '{}');
  assert.equal(!!statusKSOffBody.risk?.gates?.manual_killswitch_blocked, false, 'manual_killswitch_blocked should be false after disabling');

  // ==== Risk Gates: Global Daily Drawdown ====
  const setDD = await httpPost(`${base}/risk/drawdown-limit`, { usd: 5 });
  assert.equal(setDD.status, 200, `/risk/drawdown-limit expected 200, got ${setDD.status}`);
  const setDDBody = JSON.parse(setDD.body || '{}');
  assert.equal(setDDBody.ok, true, 'drawdown-limit ok should be true');

  const metricsBeforeDD = await httpGet(`${base}/metrics`);
  const ddGaugeBefore = parsePromMetric(metricsBeforeDD.body, 'risk_daily_drawdown_usd', {});
  const ddLimitGaugeBefore = parsePromMetric(metricsBeforeDD.body, 'risk_daily_drawdown_limit_usd', {});
  const ddBlocksBefore = parsePromMetric(metricsBeforeDD.body, 'risk_blocks_total', { reason: 'daily_drawdown' });

  // Calcular perda necessária para ultrapassar o limite global (final <= -5)
  // Se ddGaugeBefore for 43.5, precisamos de ~49.0 de perda (43.5 + 5 + margem)
  const marginUsd = 1;
  const requiredLossForGlobal = Math.max(10, ddGaugeBefore + 5 + marginUsd); // pelo menos ~10 USD
  // Usaremos trade com entry=100, exit=99 => perda = (entry-exit)*(sizeUsd/entry) = 1*(sizeUsd/100)
  const sizeUsdGlobal = Math.ceil(requiredLossForGlobal * 100);

  const lossForDD = {
    symbol: 'BTCUSDT',
    timeframe: '1m',
    side: 'long',
    entryPrice: 100,
    exitPrice: 99,
    stopPrice: 101,
    sizeUsd: sizeUsdGlobal,
    highPrice: 100.8,
    lowPrice: 98.5,
    feesUsd: 0
  };
  const postLossDD = await httpPost(`${base}/trades/record`, lossForDD);
  assert.equal(postLossDD.status, 200, `/trades/record expected 200, got ${postLossDD.status}`);
  const postLossDDBody = JSON.parse(postLossDD.body || '{}');
  assert.equal(postLossDDBody.ok, true, '/trades/record response ok should be true');

  const metricsAfterDDLoss = await httpGet(`${base}/metrics`);
  const ddGaugeAfter = parsePromMetric(metricsAfterDDLoss.body, 'risk_daily_drawdown_usd', {});
  const ddLimitGauge = parsePromMetric(metricsAfterDDLoss.body, 'risk_daily_drawdown_limit_usd', {});
  assert.ok(ddLimitGauge >= 5 && ddLimitGauge <= 5.1, `risk_daily_drawdown_limit_usd should be ~5 (got ${ddLimitGauge})`);
  const deltaGlobal = ddGaugeAfter - ddGaugeBefore; // deve ser ~ -requiredLossForGlobal
  assert.ok(deltaGlobal <= -(requiredLossForGlobal - 0.2) && deltaGlobal >= -(requiredLossForGlobal + 0.2),
    `daily drawdown delta should be ~-${requiredLossForGlobal.toFixed(1)} (before=${ddGaugeBefore}, after=${ddGaugeAfter}, delta=${deltaGlobal})`);

  const enqueueDuringGlobalDD = await httpPost(`${base}/signals/enqueue`, { symbol: 'TESTDD', timeframe: '1m' });
  assert.equal(enqueueDuringGlobalDD.status, 429, `/signals/enqueue during global DD should be 429, got ${enqueueDuringGlobalDD.status}`);
  const metricsAfterGlobalDDBlock = await httpGet(`${base}/metrics`);
  const ddBlocksAfter = parsePromMetric(metricsAfterGlobalDDBlock.body, 'risk_blocks_total', { reason: 'daily_drawdown' });
  assert.ok(ddBlocksAfter >= ddBlocksBefore + 1, `risk_blocks_total{reason="daily_drawdown"} should increase by >=1 (before=${ddBlocksBefore}, after=${ddBlocksAfter})`);

  // Reset global DD limit to avoid global gate blocking the per-symbol test
  const resetGlobalDD = await httpPost(`${base}/risk/drawdown-limit`, { usd: 10000 });
  assert.equal(resetGlobalDD.status, 200, `/risk/drawdown-limit reset expected 200, got ${resetGlobalDD.status}`);
  const resetGlobalDDBody = JSON.parse(resetGlobalDD.body || '{}');
  assert.equal(resetGlobalDDBody.ok, true, 'drawdown-limit reset ok should be true');

  // ==== Risk Gates: Per-Symbol Daily Drawdown ====
  const setSymbolDD = await httpPost(`${base}/risk/symbol-limit`, { symbol: 'XRPUSDT', usd: 3 });
  assert.equal(setSymbolDD.status, 200, `/risk/symbol-limit expected 200, got ${setSymbolDD.status}`);
  const setSymbolDDBody = JSON.parse(setSymbolDD.body || '{}');
  assert.equal(setSymbolDDBody.ok, true, 'symbol-limit ok should be true');

  const metricsBeforeSymbolDD = await httpGet(`${base}/metrics`);
  const ddBlocksSymbolBefore = parsePromMetric(metricsBeforeSymbolDD.body, 'risk_blocks_total', { reason: 'daily_drawdown_symbol_XRPUSDT' });
  const ddBySymbolBefore = parsePromMetric(metricsBeforeSymbolDD.body, 'risk_daily_drawdown_symbol_usd', { symbol: 'XRPUSDT' });
  const ddLimitBySymbolBefore = parsePromMetric(metricsBeforeSymbolDD.body, 'risk_daily_drawdown_symbol_limit_usd', { symbol: 'XRPUSDT' });
  assert.ok(ddLimitBySymbolBefore >= 2.9 && ddLimitBySymbolBefore <= 3.1, `risk_daily_drawdown_symbol_limit_usd{symbol="XRPUSDT"} should be ~3 (got ${ddLimitBySymbolBefore})`);

  // Calcular perda necessária por símbolo (final <= -3)
  const requiredLossForSymbol = Math.max(5, ddBySymbolBefore + 3 + marginUsd); // garantir ultrapassar 3 com margem, mínimo 5
  // Para entry=1, exit=0.97 => perda = 0.03 * sizeUsd
  const sizeUsdSymbol = Math.ceil(requiredLossForSymbol / 0.03);

  const lossForSymbolDD = {
    symbol: 'XRPUSDT',
    timeframe: '1m',
    side: 'long',
    entryPrice: 1,
    exitPrice: 0.97,
    stopPrice: 1.02,
    sizeUsd: sizeUsdSymbol,
    highPrice: 1.01,
    lowPrice: 0.95,
    feesUsd: 0
  };
  const postLossSymbolDD = await httpPost(`${base}/trades/record`, lossForSymbolDD);
  assert.equal(postLossSymbolDD.status, 200, `/trades/record expected 200, got ${postLossSymbolDD.status}`);
  const postLossSymbolDDBody = JSON.parse(postLossSymbolDD.body || '{}');
  assert.equal(postLossSymbolDDBody.ok, true, '/trades/record response ok should be true');

  const metricsAfterSymbolDDLoss = await httpGet(`${base}/metrics`);
  const ddBySymbolAfter = parsePromMetric(metricsAfterSymbolDDLoss.body, 'risk_daily_drawdown_symbol_usd', { symbol: 'XRPUSDT' });
  const ddLimitBySymbolGauge = parsePromMetric(metricsAfterSymbolDDLoss.body, 'risk_daily_drawdown_symbol_limit_usd', { symbol: 'XRPUSDT' });
  assert.ok(ddLimitBySymbolGauge >= 3 && ddLimitBySymbolGauge <= 3.1, `risk_daily_drawdown_symbol_limit_usd{symbol="XRPUSDT"} should be ~3 (got ${ddLimitBySymbolGauge})`);
  const deltaSymbol = ddBySymbolAfter - ddBySymbolBefore;
  assert.ok(deltaSymbol <= -(requiredLossForSymbol - 0.5) && deltaSymbol >= -(requiredLossForSymbol + 0.5),
    `symbol daily drawdown delta should be ~-${requiredLossForSymbol.toFixed(1)} (before=${ddBySymbolBefore}, after=${ddBySymbolAfter}, delta=${deltaSymbol})`);

  const enqueueDuringSymbolDD = await httpPost(`${base}/signals/enqueue`, { symbol: 'XRPUSDT', timeframe: '1m' });
  assert.equal(enqueueDuringSymbolDD.status, 429, `/signals/enqueue during symbol DD should be 429, got ${enqueueDuringSymbolDD.status}`);
  const metricsAfterSymbolDDBlock = await httpGet(`${base}/metrics`);
  const ddBlocksSymbolAfter = parsePromMetric(metricsAfterSymbolDDBlock.body, 'risk_blocks_total', { reason: 'daily_drawdown_symbol_XRPUSDT' });
  assert.ok(ddBlocksSymbolAfter >= ddBlocksSymbolBefore + 1, `risk_blocks_total{reason="daily_drawdown_symbol_XRPUSDT"} should increase by >=1 (before=${ddBlocksSymbolBefore}, after=${ddBlocksSymbolAfter})`);

  // Done
  if (child) {
    try { child.kill('SIGTERM'); } catch {}
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});