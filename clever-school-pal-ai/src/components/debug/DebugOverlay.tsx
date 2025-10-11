import { useEffect, useMemo, useRef, useState } from 'react';
import { DebugEvent, getBuffer, subscribe, isDebugEnabled } from '@/lib/client-debug';
import { Button } from '@/components/ui/button';

export default function DebugOverlay() {
  const [events, setEvents] = useState<DebugEvent[]>(getBuffer());
  const [visible, setVisible] = useState(isDebugEnabled());
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = subscribe((e) => setEvents((prev) => [...prev, e]));
    const onToggle = (ev: any) => setVisible(!!ev?.detail?.visible);
    window.addEventListener('debug-overlay-toggle', onToggle);
    return () => {
      unsub();
      window.removeEventListener('debug-overlay-toggle', onToggle);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  const filtered = useMemo(() => events.slice(-300), [events]);

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, width: 420, height: 280, background: 'rgba(20,22,28,0.92)', color: '#eaeef2', border: '1px solid #2d3748', borderRadius: 10, zIndex: 99999, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #2d3748', background: 'rgba(255,255,255,0.03)'}}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.3 }}>Debug Overlay</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="secondary" onClick={() => (window as any).__DEBUG__?.download?.()}>Export</Button>
          <Button size="sm" variant="destructive" onClick={() => (window as any).__DEBUG__?.clear?.()}>Clear</Button>
        </div>
      </div>
      <div style={{ height: 230, overflowY: 'auto', padding: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, lineHeight: 1.4 }}>
        {filtered.map((e) => (
          <div key={e.id} style={{ marginBottom: 4 }}>
            <span style={{ opacity: 0.7 }}>{new Date(e.ts).toLocaleTimeString()}</span>
            <span style={{ marginLeft: 6, padding: '2px 6px', borderRadius: 6, background: tagBg(e.level), color: tagColor(e.level) }}>{e.level.toUpperCase()}</span>
            <span style={{ marginLeft: 8 }}>{e.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function tagBg(level: string) {
  switch (level) {
    case 'error':
    case 'exception':
    case 'rejection':
      return 'rgba(239, 68, 68, 0.15)';
    case 'warn':
      return 'rgba(245, 158, 11, 0.18)';
    case 'info':
      return 'rgba(59, 130, 246, 0.18)';
    case 'debug':
      return 'rgba(16, 185, 129, 0.18)';
    default:
      return 'rgba(148, 163, 184, 0.18)';
  }
}

function tagColor(level: string) {
  switch (level) {
    case 'error':
    case 'exception':
    case 'rejection':
      return '#fecaca';
    case 'warn':
      return '#fde68a';
    case 'info':
      return '#bfdbfe';
    case 'debug':
      return '#bbf7d0';
    default:
      return '#cbd5e1';
  }
}