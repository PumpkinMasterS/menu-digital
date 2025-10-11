/* Lightweight client-side debug instrumentation
   - Captures console.*, window.onerror, unhandledrejection
   - Keeps an in-memory ring buffer and optional localStorage persistence
   - Toggle via query ?debug=1, localStorage DEBUG_OVERLAY=1, or hotkey Ctrl+Alt+D
   - Exposes window.__DEBUG__ helpers
*/

export type DebugLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'exception' | 'rejection';
export interface DebugEvent {
  id: string;
  level: DebugLevel;
  message: string;
  data?: any[];
  stack?: string;
  ts: number; // epoch ms
}

type Listener = (e: DebugEvent) => void;

const MAX_BUFFER = 500;
const STORAGE_KEY = 'DEBUG_OVERLAY';
let buffer: DebugEvent[] = [];
let listeners: Set<Listener> = new Set();
let enabled = false;
let overlayVisible = false;

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function addToBuffer(evt: DebugEvent) {
  buffer.push(evt);
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
  listeners.forEach((l) => {
    try { l(evt); } catch { /* noop */ }
  });
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBuffer() { return buffer.slice(); }
export function clearBuffer() { buffer = []; }

function parseDebugFlag(): boolean {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('debug') === '1') return true;
  } catch {}
  try { if (localStorage.getItem(STORAGE_KEY) === '1') return true; } catch {}
  try { return import.meta.env.VITE_DEBUG_OVERLAY_DEFAULT === 'true'; } catch { return false; }
}

function persistEnabled(val: boolean) {
  try { localStorage.setItem(STORAGE_KEY, val ? '1' : '0'); } catch {}
}

function instrument() {
  if (enabled) return;
  enabled = true;

  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  const wrap = (level: DebugLevel, fn: (...args: any[]) => void) => (...args: any[]) => {
    try {
      const msg = typeof args[0] === 'string' ? args[0] : JSON.stringify(args[0]);
      const evt: DebugEvent = { id: uuid(), level, message: msg, data: args.slice(1), ts: Date.now() };
      addToBuffer(evt);
    } catch {}
    fn.apply(console, args as any);
  };

  console.log = wrap('log', original.log);
  console.info = wrap('info', original.info);
  console.warn = wrap('warn', original.warn);
  console.error = wrap('error', original.error);
  console.debug = wrap('debug', original.debug);

  window.addEventListener('error', (ev) => {
    const message = ev.message || 'Unknown error';
    const stack = (ev as any).error?.stack || undefined;
    addToBuffer({ id: uuid(), level: 'exception', message, stack, ts: Date.now() });
  });

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    let message = 'Unhandled promise rejection';
    let stack: string | undefined;
    try {
      if (typeof ev.reason === 'string') message = ev.reason;
      else if (ev.reason && typeof ev.reason.message === 'string') message = ev.reason.message;
      if (ev.reason && typeof ev.reason.stack === 'string') stack = ev.reason.stack;
    } catch {}
    addToBuffer({ id: uuid(), level: 'rejection', message, stack, ts: Date.now() });
  });

  // Hotkey Ctrl+Alt+D to toggle overlay
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && (e.key.toLowerCase() === 'd')) {
      overlayVisible = !overlayVisible;
      persistEnabled(overlayVisible);
      // Emit synthetic event so UI can react
      addToBuffer({ id: uuid(), level: 'info', message: `Debug overlay ${overlayVisible ? 'enabled' : 'disabled'} via hotkey`, ts: Date.now() });
      const evt = new CustomEvent('debug-overlay-toggle', { detail: { visible: overlayVisible } });
      window.dispatchEvent(evt);
    }
  });
}

export function initClientDebug() {
  overlayVisible = parseDebugFlag();
  if (overlayVisible) instrument();

  // Expose helpers
  (window as any).__DEBUG__ = {
    enable: () => { overlayVisible = true; persistEnabled(true); instrument(); },
    disable: () => { overlayVisible = false; persistEnabled(false); },
    isEnabled: () => overlayVisible,
    getLogs: () => getBuffer(),
    clear: () => clearBuffer(),
    download: () => {
      try {
        const blob = new Blob([JSON.stringify(getBuffer(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {}
    },
  };
}

export function isDebugEnabled() { return overlayVisible; }