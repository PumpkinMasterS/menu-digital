import React from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import AnaliseTecnicaPage from './pages/AnaliseTecnicaPage';
import EstrategiasPage from './pages/EstrategiasPage';
import PosicoesPage from './pages/PosicoesPage';
import DashboardPage from './pages/DashboardPage';
import BacktestingPage from './pages/BacktestingPage';
import ExecucaoPage from './pages/ExecucaoPage';

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 dark:bg-gray-900/60 backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-colors shadow-sm">
      <div className="container py-3 flex items-center gap-6">
        <div className="font-semibold text-lg tracking-tight">Cripto Risk Console</div>
        {/* Nav principal (mobile) */}
        <nav className="flex items-center gap-1 text-sm md:hidden">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Dashboard</NavLink>
          <NavLink
            to="/risco"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Risco</NavLink>
          <NavLink
            to="/auditoria"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Auditoria</NavLink>
          <NavLink
            to="/analise-tecnica"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Análise</NavLink>
          <NavLink
            to="/estrategias"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Estratégias</NavLink>
          <NavLink
            to="/posicoes"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Posições</NavLink>
          <NavLink
            to="/backtesting"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Backtest</NavLink>
          <NavLink
            to="/execucao"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Execução</NavLink>
          <NavLink
            to="/bybit"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Bybit</NavLink>
          <NavLink
            to="/config"
            className={({ isActive }) =>
              `px-3 py-1 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`
            }
          >Config</NavLink>
        </nav>
        <div className="ml-auto text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 shadow-sm animate-pulse">beta</div>
      </div>
    </header>
  )
}

function SidebarNav() {
  const linkClasses = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;
  return (
    <aside className="hidden md:block w-64 shrink-0 pr-4">
      <div className="sticky top-20">
        <nav className="space-y-1 text-sm">
          <NavLink to="/" end className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-blue-500/80" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/risco" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-rose-500/80" />
            <span>Risco</span>
          </NavLink>
          <NavLink to="/auditoria" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-emerald-500/80" />
            <span>Auditoria</span>
          </NavLink>
          <NavLink to="/analise-tecnica" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-indigo-500/80" />
            <span>Análise Técnica</span>
          </NavLink>
          <NavLink to="/estrategias" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-purple-500/80" />
            <span>Estratégias</span>
          </NavLink>
          <NavLink to="/posicoes" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-teal-500/80" />
            <span>Posições</span>
          </NavLink>
          <NavLink to="/backtesting" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-orange-500/80" />
            <span>Backtesting</span>
          </NavLink>
          <NavLink to="/execucao" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-teal-500/80" />
            <span>Execução</span>
          </NavLink>
          <NavLink to="/bybit" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-amber-500/80" />
            <span>Bybit</span>
          </NavLink>
          <NavLink to="/config" className={({ isActive }) => linkClasses(isActive)}>
            <span className="inline-block w-4 h-4 rounded-sm bg-gray-500/80" />
            <span>Config</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
}

function Page({children}: {children: React.ReactNode}) {
  // Conteúdo principal; container fica no Shell para evitar container aninhado
  return <main className="py-6">{children}</main>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <div className="flex gap-6">
        <SidebarNav />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);
  const [bybit, setBybit] = React.useState<{ configured: boolean; net: 'testnet'|'mainnet'|null; latency: number|null; reachable: boolean|null; equity: number|null; positions: number|null; error: string|null }>({ configured: false, net: null, latency: null, reachable: null, equity: null, positions: null, error: null });

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/risk/status')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!mounted) return;
        setData(json);
        setError(null);
      })
      .catch((err) => setError(String(err?.message || err)))
      .finally(() => setLoading(false));
    return () => { mounted = false };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const loadBybit = async () => {
      try {
        const statusRes = await fetch('/config/bybit/status');
        const statusJson = statusRes.ok ? await statusRes.json() : null;
        let testJson: any = null;
        try {
          const testRes = await fetch('/config/bybit/test');
          testJson = testRes.ok ? await testRes.json() : null;
        } catch {}
        let equity: number | null = null;
        let positions: number | null = null;
        if (statusJson?.configured) {
          try {
            const r1 = await fetch('/bybit/wallet-balance');
            const j1 = await r1.json();
            if (r1.ok && j1?.result) {
              const list = j1.result.list || j1.result || [];
              const first = Array.isArray(list) ? list[0] : j1.result;
              const eq = Number(first?.totalEquity ?? first?.equity ?? null);
              equity = isFinite(eq) ? eq : null;
            }
          } catch {}
          try {
            const r2 = await fetch('/bybit/positions');
            const j2 = await r2.json();
            if (r2.ok && j2?.result) {
              const arr = j2.result.list || j2.result || [];
              positions = Array.isArray(arr) ? arr.length : null;
            }
          } catch {}
        }
        if (!mounted) return;
        setBybit({
          configured: !!statusJson?.configured,
          net: statusJson?.testnet ? 'testnet' : 'mainnet',
          latency: typeof testJson?.latency_ms === 'number' ? testJson.latency_ms : null,
          reachable: typeof testJson?.reachable === 'boolean' ? !!testJson.reachable : null,
          equity,
          positions,
          error: null,
        });
      } catch (e: any) {
        if (!mounted) return;
        setBybit((prev) => ({ ...prev, error: e?.message || String(e) }));
      }
    };
    loadBybit();
    return () => { mounted = false };
  }, []);

  const risk = data?.risk;
  const gates = risk?.gates || {};
  const global = risk?.global || {};
  const limit = Number(global?.limit_usd || 0);
  const pnlToday = Number(global?.pnl_today_usd || 0);
  const ddPct = limit > 0 ? Math.max(0, Math.min(100, (-pnlToday / limit) * 100)) : 0;

  return (
    <Page>
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      {loading && (
        <div className="text-sm text-gray-600">Carregando status de risco</div>
      )}
      {error && (
        <div className="text-sm text-red-600">Falha ao carregar: {error}</div>
      )}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="rounded-lg border p-4 bg-white/60 dark:bg-gray-800/60 animate-pulse">
              <div className="h-3 w-24 bg-gray-200 rounded"/>
              <div className="mt-3 h-5 w-32 bg-gray-200 rounded"/>
              <div className="mt-2 h-3 w-40 bg-gray-200 rounded"/>
            </div>
          ))}
        </div>
      )}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-lg border p-4 bg-white/70 dark:bg-gray-800/70 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="text-xs uppercase tracking-wide text-gray-500">Kill Switch (manual)</div>
            <div className="mt-2 text-lg font-semibold">
              {gates.manual_killswitch_blocked ? (
                <span className="text-red-600">Ativado</span>
              ) : (
                <span className="text-green-600">Desativado</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border p-4 bg-white/70 dark:bg-gray-800/70 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="text-xs uppercase tracking-wide text-gray-500">Drawdown diário (global)</div>
            <div className="mt-2 text-lg font-semibold flex items-baseline gap-2">
              <span className={global?.breached ? 'text-red-600' : 'text-green-600'}>
                {global?.breached ? 'Bloqueado' : 'OK'}
              </span>
              <span className="text-sm text-gray-500">limite USD: {Number(global?.limit_usd || 0).toFixed(2)}</span>
            </div>
            <div className="mt-1 text-sm text-gray-600">PnL hoje: {Number(global?.pnl_today_usd || 0).toFixed(2)}</div>
            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">Drawdown hoje</div>
              <div className="h-2 w-full bg-gray-200 rounded">
                <div
                  className={`h-2 rounded ${global?.breached ? 'bg-red-600' : 'bg-blue-600'}`}
                  style={{ width: `${ddPct}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">{ddPct.toFixed(0)}% do limite</div>
            </div>
          </div>
          <div className="rounded-lg border p-4 bg-white/70 dark:bg-gray-800/70 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="text-xs uppercase tracking-wide text-gray-500">Símbolos monitorados</div>
            <div className="mt-2 text-lg font-semibold">{Object.keys(risk?.bySymbol || {}).length}</div>
            <div className="mt-1 text-xs text-gray-500">com limites e status individuais</div>
          </div>
          <div className="rounded-lg border p-4 bg-white/70 dark:bg-gray-800/70 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="text-xs uppercase tracking-wide text-gray-500">Bybit</div>
            <div className="mt-2 text-lg font-semibold flex items-baseline gap-2">
              <span className={bybit.configured ? 'text-green-600' : 'text-gray-600'}>
                {bybit.configured ? 'configurado' : 'não configurado'}
              </span>
              <span className="text-sm text-gray-500">rede: {bybit.net || '-'}</span>
            </div>
            <div className="mt-1 text-sm text-gray-600">
              {bybit.latency !== null ? `latência: ${bybit.latency} ms` : 'latência: -'}
              {typeof bybit.reachable === 'boolean' ? ` | alcance: ${bybit.reachable ? 'sim' : 'não'}` : ''}
            </div>
            {bybit.equity !== null && <div className="mt-1 text-sm text-gray-600">equity: {bybit.equity}</div>}
            {bybit.positions !== null && <div className="mt-1 text-xs text-gray-500">posições: {bybit.positions}</div>}
            {bybit.error && <div className="mt-2 text-xs text-red-600">{bybit.error}</div>}
          </div>
        </div>
      )}
    </Page>
  )
}

function RiscoPage() {
  const [status, setStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [ddMode, setDdMode] = React.useState<'usd' | 'pct'>('usd');
  const [ddUsd, setDdUsd] = React.useState<string>('');
  const [ddPct, setDdPct] = React.useState<string>('');
  const [ddBase, setDdBase] = React.useState<string>('');

  const loadStatus = React.useCallback(() => {
    setLoading(true);
    fetch('/risk/status')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => { setStatus(json); setErr(null); })
      .catch((e) => setErr(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { loadStatus(); }, [loadStatus]);

  const killswitchActive = !!status?.risk?.gates?.manual_killswitch_blocked;

  const postJson = async (url: string, body: any) => {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };

  const toggleKillswitch = async (active: boolean) => {
    setMsg(null); setErr(null);
    try {
      const res = await postJson('/risk/killswitch', { active });
      setMsg(`Kill switch ${res?.active ? 'ativado' : 'desativado'}.`);
      await loadStatus();
    } catch (e: any) {
      setErr(`Falha no killswitch: ${e?.message || e}`);
    }
  };

  const submitDrawdown = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setMsg(null); setErr(null);
    try {
      const payload: any = {};
        if (ddMode === 'usd') {
          const usd = Number(ddUsd);
        if (!isFinite(usd) || usd <= 0) throw new Error('Informe um USD válido (> 0).');
          payload.usd = usd;
        } else {
          const pct = Number(ddPct);
        if (!isFinite(pct) || pct <= 0) throw new Error('Informe um % válido (> 0).');
          payload.pct = pct;
          if (ddBase) {
            const base = Number(ddBase);
            if (!isFinite(base) || base <= 0) throw new Error('Base deve ser > 0.');
            payload.base = base;
          }
        }
      const res = await postJson('/risk/drawdown-limit', payload);
      if (res?.ok) setMsg('Limite de drawdown atualizado.');
      await loadStatus();
    } catch (e: any) {
      setErr(`Falha ao atualizar limite: ${e?.message || e}`);
    }
  };

  const global = status?.risk?.global || {};
  const bySymbol: Record<string, { pnl_today_usd: number; limit_usd: number; blocked: boolean }> = status?.risk?.bySymbol || {};
  const [editLimits, setEditLimits] = React.useState<Record<string, string>>({});

  const updateEdit = (symbol: string, value: string) => {
    setEditLimits((prev) => ({ ...prev, [symbol]: value }));
  };

  const submitSymbolLimit = async (symbol: string) => {
    setMsg(null); setErr(null);
    try {
      const raw = editLimits[symbol];
      const usd = Number(raw);
      if (!isFinite(usd) || usd < 0) throw new Error('Informe um USD válido (≥ 0).');
      const res = await postJson('/risk/symbol-limit', { symbol, usd });
      if (res?.ok) setMsg(`Limite de ${symbol} atualizado para USD ${usd.toFixed(2)}.`);
      await loadStatus();
    } catch (e: any) {
      setErr(`Falha ao atualizar ${symbol}: ${e?.message || e}`);
    }
  };

  return (
    <Page>
      <h2 className="text-xl font-semibold mb-4">Risco</h2>

      {loading && <div className="text-sm text-gray-600">Carregando</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}
      {msg && <div className="text-sm text-green-600">{msg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Kill Switch */}
        <section className="rounded-lg border p-4 bg-white/60 dark:bg-gray-800/60">
          <div className="text-sm font-semibold">Kill Switch (manual)</div>
          <div className="mt-2 text-sm text-gray-600">Estado: {killswitchActive ? 'Ativado' : 'Desativado'}</div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => toggleKillswitch(true)} className="px-3 py-2 rounded bg-red-600 text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring focus-visible:ring-red-400/50">Ativar</button>
            <button onClick={() => toggleKillswitch(false)} className="px-3 py-2 rounded bg-green-600 text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring focus-visible:ring-green-400/50">Desativar</button>
          </div>
        </section>

        {/* Drawdown Limit */}
        <section className="rounded-lg border p-4 bg-white/60 dark:bg-gray-800/60">
          <div className="text-sm font-semibold">Limite de Drawdown (global)</div>
          <div className="mt-2 text-xs text-gray-600">Atual: USD {Number(global?.limit_usd || 0).toFixed(2)} | PnL hoje: {Number(global?.pnl_today_usd || 0).toFixed(2)}</div>
          <form onSubmit={submitDrawdown} className="mt-3 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="radio" name="mode" checked={ddMode==='usd'} onChange={() => setDdMode('usd')} /> USD</label>
              <label className="flex items-center gap-1"><input type="radio" name="mode" checked={ddMode==='pct'} onChange={() => setDdMode('pct')} /> %</label>
            </div>
            {ddMode === 'usd' ? (
              <input type="number" step="0.01" min="0" value={ddUsd} onChange={(e) => setDdUsd(e.target.value)} placeholder="Limite em USD" className="w-full rounded border px-3 py-2" />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input type="number" step="0.01" min="0" value={ddPct} onChange={(e) => setDdPct(e.target.value)} placeholder="Percentual (%)" className="rounded border px-3 py-2" />
                <input type="number" step="0.01" min="0" value={ddBase} onChange={(e) => setDdBase(e.target.value)} placeholder="Base (USD, opcional)" className="rounded border px-3 py-2" />
              </div>
            )}
            <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-400/50">Aplicar limite</button>
          </form>
        </section>
      </div>

      {/* Limites por Símbolo */}
      <section className="rounded-lg border p-4 bg-white/60 dark:bg-gray-800/60 mt-6">
        <div className="text-sm font-semibold mb-3">Limites por símbolo</div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Símbolo</th>
                <th className="text-left px-3 py-2">PnL hoje (USD)</th>
                <th className="text-left px-3 py-2">Limite (USD)</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Novo limite</th>
                <th className="text-left px-3 py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(bySymbol).map(([symbol, s]) => (
                <tr key={symbol} className="border-t odd:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{symbol}</td>
                  <td className="px-3 py-2">{Number(s.pnl_today_usd || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{Number(s.limit_usd || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {s.blocked ? (
                      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Bloqueado</span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">OK</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editLimits[symbol] ?? ''}
                      onChange={(e) => updateEdit(symbol, e.target.value)}
                      placeholder="USD"
                      className="w-32 rounded border px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => submitSymbolLimit(symbol)}
                      className="px-3 py-2 rounded bg-blue-600 text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring focus-visible:ring-blue-400/50"
                    >Salvar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  )
}

function AuditoriaPage() {
  const [limit, setLimit] = React.useState<number>(50);
  const [text, setText] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<any[]>([]);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch(`/risk/audit?limit=${limit}`)
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { setEvents(json?.events || []); setError(null); })
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false));
  }, [limit]);

  React.useEffect(() => { load(); }, [load]);

  const filtered = events.filter((e) => {
    const q = text.trim().toLowerCase();
    if (!q) return true;
    const s = JSON.stringify(e).toLowerCase();
    return s.includes(q);
  });

  return (
    <Page>
      <h2 className="text-xl font-semibold mb-4">Auditoria</h2>
      <div className="flex items-center gap-3 mb-3">
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded border px-2 py-1 text-sm">
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Filtrar" className="rounded border px-3 py-2 text-sm w-64" />
        <button onClick={load} className="px-3 py-2 rounded bg-blue-600 text-white text-sm">Atualizar</button>
        <a href="/risk/audit/export" className="px-3 py-2 rounded bg-gray-700 text-white text-sm" download>
          Exportar JSONL
        </a>
      </div>
      {loading && <div className="text-sm text-gray-600">Carregando</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2">ts</th>
              <th className="text-left px-3 py-2">gate</th>
              <th className="text-left px-3 py-2">event</th>
              <th className="text-left px-3 py-2">meta</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={i} className="border-t odd:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">{e.ts}</td>
                <td className="px-3 py-2">{e.gate}</td>
                <td className="px-3 py-2">{e.event}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.meta ? JSON.stringify(e.meta) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  )
}

function ConfigPage() {
  const [apiKey, setApiKey] = React.useState<string>('');
  const [apiSecret, setApiSecret] = React.useState<string>('');
  const [testnet, setTestnet] = React.useState<boolean>(true);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [configured, setConfigured] = React.useState<boolean>(false);
  const [net, setNet] = React.useState<'testnet'|'mainnet' | null>(null);
  const [latency, setLatency] = React.useState<number | null>(null);
  const [reachable, setReachable] = React.useState<boolean | null>(null);
  const [validating, setValidating] = React.useState<boolean>(false);
  const [validation, setValidation] = React.useState<{ ok: boolean; configured?: boolean; network?: string | null; reachable?: boolean; status?: number; error?: string } | null>(null);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bybitCreds') || 'null');
      if (saved) {
        setApiKey(saved.apiKey || '');
        setApiSecret(saved.apiSecret || '');
        setTestnet(!!saved.testnet);
      }
    } catch {}
    fetch('/config/bybit/status')
      .then(r => r.json())
      .then(j => { setConfigured(!!j.configured); setNet(j.testnet ? 'testnet' : 'mainnet'); })
      .catch(() => {});
  }, []);

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setMsg(null); setErr(null);
    try {
      const payload = { apiKey, apiSecret, testnet };
      localStorage.setItem('bybitCreds', JSON.stringify(payload));
      try {
        const r = await fetch('/config/bybit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } catch {}
      setMsg('Credenciais salvas (localmente). Integração será habilitada futuramente.');
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  };

  const testConn = async () => {
    setMsg(null); setErr(null); setLatency(null); setReachable(null);
    try {
      const r = await fetch('/config/bybit/test');
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setNet(j.network === 'testnet' ? 'testnet' : 'mainnet');
      setLatency(typeof j.latency_ms === 'number' ? j.latency_ms : null);
      setReachable(!!j.reachable);
      setMsg('Conexão com Bybit OK');
    } catch (e: any) {
      setErr(e?.message || String(e));
      setReachable(false);
    }
  };

  const validateCreds = async () => {
    setValidating(true);
    setValidation(null);
    try {
      const r = await fetch('/config/bybit/validate');
      const j = await r.json();
      setValidation(j);
    } catch (e: any) {
      setValidation({ ok: false, error: e?.message || String(e) });
    } finally {
      setValidating(false);
    }
  };

  return (
    <Page>
      <h2 className="text-xl font-semibold mb-4">Configurações</h2>
      <div className="rounded-lg border p-4 bg-white/60 dark:bg-gray-800/60">
        <div className="text-sm text-gray-600 mb-3">Conectar à Bybit (MVP): salvos em localStorage; backend seguro virá depois.</div>
        <div className="text-sm text-gray-700 mb-2">Status: {configured ? 'configurado' : 'não configurado'} | Rede: {net || (testnet ? 'testnet' : 'mainnet')}</div>
        {latency !== null && <div className="text-xs text-gray-500 mb-2">Latência: {latency} ms | Alcance: {reachable ? 'sim' : 'não'}</div>}
        {msg && <div className="text-sm text-green-600 mb-2">{msg}</div>}
        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}
        <form onSubmit={save} className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">API Key</label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="BYBIT_API_KEY" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">API Secret</label>
              <input value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="BYBIT_API_SECRET" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={testnet} onChange={(e) => setTestnet(e.target.checked)} /> Testnet
          </label>
          <button type="submit" className="px-3 py-2 rounded bg-blue-600 text-white">Salvar</button>
          <button type="button" onClick={testConn} className="ml-2 px-3 py-2 rounded bg-emerald-600 text-white">Testar conexão</button>
          <button type="button" onClick={validateCreds} disabled={validating} className="ml-2 px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">{validating ? 'Validando…' : 'Validar credenciais'}</button>
          {validation && (
            <span className={`ml-3 text-sm ${validation.ok ? 'text-green-600' : 'text-red-600'}`}>
              {validation.ok ? `OK (${validation.network})` : `Falha${validation.error ? ': ' + validation.error : ''}`}
            </span>
          )}
        </form>
      </div>
    </Page>
  );
}
function BybitPage() {
  const [configured, setConfigured] = React.useState<boolean>(false);
  const [net, setNet] = React.useState<'testnet'|'mainnet'|null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string|null>(null);
  const [equity, setEquity] = React.useState<number|null>(null);
  const [positions, setPositions] = React.useState<any[]>([]);
  const [coins, setCoins] = React.useState<any[]>([]);
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const s = await fetch('/config/bybit/status');
        const sj = await s.json();
        const isCfg = !!sj?.configured;
        if (!mounted) return;
        setConfigured(isCfg);
        setNet(sj?.testnet ? 'testnet' : 'mainnet');
        if (!isCfg) { setLoading(false); return; }

        try {
          const w = await fetch('/bybit/wallet-balance');
          const wj = await w.json();
          if (w.ok && wj?.result) {
            const list = wj.result.list || wj.result || [];
            const first = Array.isArray(list) ? list[0] : wj.result;
            const eq = Number(first?.totalEquity ?? first?.equity ?? null);
            setEquity(isFinite(eq) ? eq : null);
            const coinsArr = first?.coin || first?.coins || [];
            setCoins(Array.isArray(coinsArr) ? coinsArr : []);
          }
        } catch {}

        try {
          const p = await fetch('/bybit/positions');
          const pj = await p.json();
          if (p.ok && pj?.result) {
            const arr = pj.result.list || pj.result || [];
            setPositions(Array.isArray(arr) ? arr : []);
          }
        } catch {}
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, []);

  React.useEffect(() => {
    if (!configured) return;
    const id = setInterval(async () => {
      try {
        const w = await fetch('/bybit/wallet-balance');
        const wj = await w.json();
        if (wj?.result) {
          const list = wj.result.list || wj.result || [];
          const first = Array.isArray(list) ? list[0] : wj.result;
          const eq = Number(first?.totalEquity ?? first?.equity ?? null);
          setEquity(isFinite(eq) ? eq : null);
          const coinsArr = first?.coin || first?.coins || [];
          setCoins(Array.isArray(coinsArr) ? coinsArr : []);
        }
      } catch {}
      try {
        const p = await fetch('/bybit/positions');
        const pj = await p.json();
        if (pj?.result) {
          const arr = pj.result.list || pj.result || [];
          setPositions(Array.isArray(arr) ? arr : []);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [configured]);

  const refreshAll = async () => {
    try {
      const w = await fetch('/bybit/wallet-balance');
      const wj = await w.json();
      if (wj?.result) {
        const list = wj.result.list || wj.result || [];
        const first = Array.isArray(list) ? list[0] : wj.result;
        const eq = Number(first?.totalEquity ?? first?.equity ?? null);
        setEquity(isFinite(eq) ? eq : null);
        const coinsArr = first?.coin || first?.coins || [];
        setCoins(Array.isArray(coinsArr) ? coinsArr : []);
      }
    } catch {}
    try {
      const p = await fetch('/bybit/positions');
      const pj = await p.json();
      if (pj?.result) {
        const arr = pj.result.list || pj.result || [];
        setPositions(Array.isArray(arr) ? arr : []);
      }
    } catch {}
  };

  async function closePosition(symbol: string, closeSide: 'long' | 'short') {
    const qtyStr = window.prompt('Quantidade para fechar (qty):');
    const qty = qtyStr ? Number(qtyStr) : NaN;
    if (!isFinite(qty) || qty <= 0) return;
    setActionBusy(`close-${symbol}`);
    try {
      const res = await fetch('/bybit/position/close', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'linear', symbol, closeSide, qty })
      });
      const j = await res.json();
      if (!j?.ok) alert(`Falha ao fechar: ${j?.error || 'erro'}`);
      await refreshAll();
    } catch (e: any) {
      alert(`Erro: ${e?.message || String(e)}`);
    } finally { setActionBusy(null); }
  }

  async function setLeverage(symbol: string) {
    const buyStr = window.prompt('Alavancagem Buy (ex: 3):');
    const sellStr = window.prompt('Alavancagem Sell (ex: 3):');
    const buyLeverage = buyStr ? Number(buyStr) : undefined;
    const sellLeverage = sellStr ? Number(sellStr) : undefined;
    if ((buyLeverage && (!isFinite(buyLeverage) || buyLeverage <= 0)) || (sellLeverage && (!isFinite(sellLeverage) || sellLeverage <= 0))) return;
    setActionBusy(`lev-${symbol}`);
    try {
      const res = await fetch('/bybit/position/set-leverage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'linear', symbol, buyLeverage, sellLeverage })
      });
      const j = await res.json();
      if (!j?.ok) alert(`Falha ao ajustar alavancagem: ${j?.error || 'erro'}`);
      await refreshAll();
    } catch (e: any) {
      alert(`Erro: ${e?.message || String(e)}`);
    } finally { setActionBusy(null); }
  }

  async function setTradingStop(symbol: string) {
    const tp = window.prompt('Take Profit (preço):');
    const sl = window.prompt('Stop Loss (preço):');
    const takeProfit = tp && tp.trim() ? tp.trim() : undefined;
    const stopLoss = sl && sl.trim() ? sl.trim() : undefined;
    if (!takeProfit && !stopLoss) return;
    setActionBusy(`tpsl-${symbol}`);
    try {
      const res = await fetch('/bybit/position/set-trading-stop', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'linear', symbol, takeProfit, stopLoss })
      });
      const j = await res.json();
      if (!j?.ok) alert(`Falha ao definir TP/SL: ${j?.error || 'erro'}`);
      await refreshAll();
    } catch (e: any) {
      alert(`Erro: ${e?.message || String(e)}`);
    } finally { setActionBusy(null); }
  }

  const renderPosRow = (item: any, i: number) => {
    const symbol = item?.symbol || item?.symbolName || item?.s || '-';
    const side = item?.side || item?.positionSide || item?.sd || '-';
    const sizeNum = Number(item?.size ?? item?.qty ?? item?.positionQty ?? 0);
    const avgNum = Number(item?.avgPrice ?? item?.entryPrice ?? item?.avgCost ?? 0);
    const markNum = Number(item?.markPrice ?? item?.lastPrice ?? 0);
    const pnlNum = Number(item?.unrealisedPnl ?? item?.unRealizedPNL ?? 0);
    return (
      <tr key={i} className="border-t odd:bg-gray-50">
        <td className="px-3 py-2 font-mono text-xs">{symbol}</td>
        <td className="px-3 py-2">{side}</td>
        <td className="px-3 py-2">{isFinite(sizeNum) ? sizeNum : '-'}</td>
        <td className="px-3 py-2">{isFinite(avgNum) ? avgNum : '-'}</td>
        <td className="px-3 py-2">{isFinite(markNum) ? markNum : '-'}</td>
        <td className="px-3 py-2">{isFinite(pnlNum) ? pnlNum : '-'}</td>
      </tr>
    );
  };

  return (
    <Page>
      <h2 className="text-xl font-semibold mb-4">Bybit</h2>
      {loading && <div className="text-sm text-gray-600">Carregando</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 bg-white/70 dark:bg-gray-800/70">
          <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
          <div className="mt-2 text-lg font-semibold flex items-baseline gap-2">
            <span className={configured ? 'text-green-600' : 'text-gray-600'}>
              {configured ? 'configurado' : 'não configurado'}
            </span>
            <span className="text-sm text-gray-500">rede: {net || '-'}</span>
          </div>
          <button onClick={() => location.reload()} className="mt-3 px-3 py-1 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">Atualizar</button>
        </div>
        <div className="rounded-lg border p-4 bg-white/70 dark:bg-gray-800/70">
          <div className="text-xs uppercase tracking-wide text-gray-500">Carteira</div>
          <div className="mt-2 text-lg font-semibold">Equity: {equity !== null ? equity : '-'}</div>
          <div className="mt-1 text-xs text-gray-500">Posições: {Array.isArray(positions) ? positions.length : '-'}</div>
        </div>
      </div>
      <section className="rounded-lg border p-4 bg-white/60 dark:bg-gray-800/60 mt-6">
        <div className="text-sm font-semibold mb-3">Ativos</div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Asset</th>
                <th className="text-left px-3 py-2">Equity</th>
                <th className="text-left px-3 py-2">Disponível</th>
                <th className="text-left px-3 py-2">Bloqueado</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(coins) && coins.length > 0 ? (
                coins.map((c, i) => (
                  <tr key={i} className="border-t odd:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{c?.coin || c?.currency || c?.asset || '-'}</td>
                    <td className="px-3 py-2">{isFinite(Number(c?.equity ?? c?.walletBalance ?? c?.total ?? 0)) ? Number(c?.equity ?? c?.walletBalance ?? c?.total ?? 0) : '-'}</td>
                    <td className="px-3 py-2">{isFinite(Number(c?.availableBalance ?? c?.free ?? 0)) ? Number(c?.availableBalance ?? c?.free ?? 0) : '-'}</td>
                    <td className="px-3 py-2">{isFinite(Number(c?.locked ?? c?.used ?? 0)) ? Number(c?.locked ?? c?.used ?? 0) : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-600" colSpan={4}>Sem ativos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4 bg-white/60 dark:bg-gray-800/60 mt-6">
        <div className="text-sm font-semibold mb-3">Posições</div>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Símbolo</th>
                <th className="text-left px-3 py-2">Lado</th>
                <th className="text-left px-3 py-2">Qtd</th>
                <th className="text-left px-3 py-2">Preço médio</th>
                <th className="text-left px-3 py-2">Mark</th>
                <th className="text-left px-3 py-2">PnL não-realizado</th>
                <th className="text-left px-3 py-2">Alavancagem</th>
                <th className="text-left px-3 py-2">Preço de liquidação</th>
                <th className="text-left px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(positions) && positions.length > 0 ? (
                positions.map((item, i) => {
                  const symbol = item?.symbol || item?.symbolName || item?.s || '-';
                  const side = item?.side || item?.positionSide || item?.sd || '-';
                  const sizeNum = Number(item?.size ?? item?.qty ?? item?.positionQty ?? 0);
                  const avgNum = Number(item?.avgPrice ?? item?.entryPrice ?? item?.avgCost ?? 0);
                  const markNum = Number(item?.markPrice ?? item?.lastPrice ?? 0);
                  const pnlNum = Number(item?.unrealisedPnl ?? item?.unRealizedPNL ?? 0);
                  const levNum = Number(item?.leverage ?? item?.leverageEr ?? 0);
                  const liqNum = Number(item?.liqPrice ?? item?.liquidationPrice ?? 0);
                  return (
                    <tr key={i} className="border-t odd:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs">{symbol}</td>
                      <td className="px-3 py-2">{side}</td>
                      <td className="px-3 py-2">{isFinite(sizeNum) ? sizeNum : '-'}</td>
                      <td className="px-3 py-2">{isFinite(avgNum) ? avgNum : '-'}</td>
                      <td className="px-3 py-2">{isFinite(markNum) ? markNum : '-'}</td>
                      <td className="px-3 py-2">{isFinite(pnlNum) ? pnlNum : '-'}</td>
                      <td className="px-3 py-2">{isFinite(levNum) ? levNum : '-'}</td>
                      <td className="px-3 py-2">{isFinite(liqNum) ? liqNum : '-'}</td>
                      <td className="px-3 py-2 space-x-2">
                        <button disabled={actionBusy !== null} onClick={() => closePosition(symbol, (String(side).toLowerCase().includes('long') || String(side).toLowerCase().includes('buy')) ? 'long' : 'short')} className="px-2 py-1 rounded bg-red-600 text-white disabled:opacity-50">Fechar</button>
                        <button disabled={actionBusy !== null} onClick={() => setLeverage(symbol)} className="px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-50">Alavancagem</button>
                        <button disabled={actionBusy !== null} onClick={() => setTradingStop(symbol)} className="px-2 py-1 rounded bg-teal-600 text-white disabled:opacity-50">TP/SL</button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-2 text-sm text-gray-600" colSpan={8}>Sem posições</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  );
}
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Header />
      <Shell>
        <Routes>
          <Route path="/" element={<DashboardPage/>} />
          <Route path="/risco" element={<RiscoPage/>} />
          <Route path="/auditoria" element={<AuditoriaPage/>} />
          <Route path="/analise-tecnica" element={<AnaliseTecnicaPage/>} />
          <Route path="/estrategias" element={<EstrategiasPage/>} />
          <Route path="/posicoes" element={<PosicoesPage/>} />
          <Route path="/backtesting" element={<BacktestingPage/>} />
          <Route path="/execucao" element={<ExecucaoPage/>} />
          <Route path="/bybit" element={<BybitPage/>} />
          <Route path="/config" element={<ConfigPage/>} />
        </Routes>
      </Shell>
    </BrowserRouter>
  )
}