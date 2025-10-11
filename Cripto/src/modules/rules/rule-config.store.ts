import type { RuleConfigV1 } from './rule-config-plugin.js';
import { PRECEDENCE_DEFAULT } from '../../config/defaults.js';

let activeConfig: RuleConfigV1 | undefined;
// Histórico simples em memória
const ruleConfigHistory: RuleConfigV1[] = [];

export function setActiveRuleConfig(cfg: RuleConfigV1) {
  activeConfig = cfg;
  try {
    // Registrar em memória para histórico
    ruleConfigHistory.push(cfg);
  } catch {}
}

export function getActiveRuleConfig(): RuleConfigV1 {
  if (activeConfig) return activeConfig;
  // Fallback mínimo (fail-open controlado) até publicar uma config
  return {
    schemaVersion: 1,
    name: 'default',
    effectiveAt: new Date(0).toISOString(),
    timeframes: ['1m','3m','5m','10m','15m','1h','4h'],
    symbols: [],
    risk: { maxConcurrentSignals: 3, rrMin: 1, killSwitch: false, cooldownSeconds: 0 },
    precedence: PRECEDENCE_DEFAULT
  };
}

export function getRuleConfigHistory(): RuleConfigV1[] {
  // Retorna cópia para evitar mutação externa
  return ruleConfigHistory.slice();
}