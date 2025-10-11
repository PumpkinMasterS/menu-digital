import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { setActiveRuleConfig } from './rule-config.store.js';
import { readFileSync } from 'fs';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Resolve JSON schema with fallback for dist runtime (copy-less)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema: any = (() => {
  const distPath = path.join(__dirname, 'schemas', 'rule-config.schema.json');
  try {
    return JSON.parse(readFileSync(distPath, 'utf-8'));
  } catch {
    // Fallback to source path when running from dist without copied assets
    const projectRoot = path.resolve(__dirname, '../../..');
    const srcPath = path.join(projectRoot, 'src', 'modules', 'rules', 'schemas', 'rule-config.schema.json');
    return JSON.parse(readFileSync(srcPath, 'utf-8'));
  }
})();

export interface RuleConfigV1 {
  schemaVersion: 1;
  name: string;
  effectiveAt: string; // ISO datetime
  timeframes: Array<'1m'|'3m'|'5m'|'10m'|'15m'|'1h'|'4h'>;
  symbols: string[];
  risk: {
    maxConcurrentSignals: number;
    rrMin: number;
    killSwitch: boolean;
    cooldownSeconds?: number;
    cooldownCandles?: number;
    maxSignalsPerDay?: number;
  };
  precedence?: Array<'1m'|'3m'|'5m'|'10m'|'15m'|'1h'|'4h'>;
}

const ajv = new Ajv({ allErrors: true, removeAdditional: false, strict: true });
addFormats(ajv);
const validate = ajv.compile<RuleConfigV1>(schema as any);

function formatAjvError(e: ErrorObject): string {
  const instancePath = e.instancePath || '';
  return `${instancePath} ${e.message || ''}`.trim();
}

function computeWarnings(cfg: RuleConfigV1): string[] {
  const warns: string[] = [];
  if (!cfg.precedence || cfg.precedence.length === 0) {
    warns.push('precedence não definida: usando ordem padrão 4h>1h>15m>5m>3m>1m');
  }
  if (cfg.risk.cooldownSeconds === undefined && cfg.risk.cooldownCandles === undefined) {
    warns.push('cooldown não definido (nem por segundos nem por candles): aplicando default 0');
  }
  if (cfg.risk.maxSignalsPerDay === undefined) {
    warns.push('maxSignalsPerDay ausente: sem limite diário de sinais');
  }
  if (cfg.symbols.length === 0) {
    warns.push('symbols vazio: nenhum símbolo alvo definido');
  }
  return warns;
}

function checkInvariants(cfg: RuleConfigV1): string[] {
  const errs: string[] = [];
  // Timeframes e precedence coerentes
  if (cfg.precedence) {
    const tfSet = new Set(cfg.timeframes);
    for (const tf of cfg.precedence) {
      if (!tfSet.has(tf)) {
        errs.push(`precedence contém timeframe não presente em timeframes: ${tf}`);
      }
    }
  }
  // Cooldown não negativo (já no schema) e pelo menos um se definidos
  if (cfg.risk.cooldownSeconds !== undefined && cfg.risk.cooldownSeconds < 0) {
    errs.push('cooldownSeconds deve ser >= 0');
  }
  if (cfg.risk.cooldownCandles !== undefined && cfg.risk.cooldownCandles < 0) {
    errs.push('cooldownCandles deve ser >= 0');
  }
  // rrMin e maxConcurrentSignals já checados via schema, mas reforçamos mensagens claras
  if (!(cfg.risk.maxConcurrentSignals > 0)) {
    errs.push('maxConcurrentSignals deve ser > 0');
  }
  if (!(cfg.risk.rrMin >= 0)) {
    errs.push('rrMin deve ser >= 0');
  }
  if (!cfg.timeframes || cfg.timeframes.length === 0) {
    errs.push('timeframes não pode ser vazio');
  }
  if (!cfg.symbols || cfg.symbols.length === 0) {
    errs.push('symbols não pode ser vazio');
  }
  // effectiveAt válido
  const d = new Date(cfg.effectiveAt);
  if (isNaN(d.getTime())) {
    errs.push('effectiveAt inválido (ISO datetime requerido)');
  }
  return errs;
}

export const ruleConfigPlugin = fp(async function (app: FastifyInstance) {
  const rulesJsonlPath = path.resolve(process.cwd(), 'rules.jsonl');

  app.post('/publish', {
    schema: {
      body: schema as any,
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            appliedAt: { type: 'string' },
            warnings: { type: 'array', items: { type: 'string' } }
          },
          required: ['ok','appliedAt']
        }
      }
    }
  }, async (req, reply) => {
    const body = req.body as unknown;
    const ok = validate(body);
    if (!ok) {
      const errors = (validate.errors || []).map(formatAjvError);
      app.log.warn({ errors }, 'RuleConfig validation failed');
      return reply.code(400).send({ ok: false, errors });
    }

    const cfg = body as RuleConfigV1;

    const invErrors = checkInvariants(cfg);
    if (invErrors.length > 0) {
      app.log.warn({ errors: invErrors }, 'RuleConfig invariants failed');
      return reply.code(400).send({ ok: false, errors: invErrors });
    }

    setActiveRuleConfig(cfg);
    const appliedAt = new Date().toISOString();

    // Persistência em JSONL (best-effort)
    try {
      const line = JSON.stringify({ appliedAt, config: cfg }) + '\n';
      await fs.appendFile(rulesJsonlPath, line, { encoding: 'utf8' });
    } catch (err) {
      app.log.warn({ err }, 'Falha ao persistir RuleConfig em rules.jsonl (ignorado)');
    }

    app.log.info({ cfg }, 'RuleConfig validated, accepted and set as active');
    return { ok: true, appliedAt, warnings: computeWarnings(cfg) };
  });

  app.post('/validate', {
    schema: {
      body: schema as any,
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            warnings: { type: 'array', items: { type: 'string' } },
            errors: { type: 'array', items: { type: 'string' } }
          },
          required: ['ok']
        }
      }
    }
  }, async (req, reply) => {
    const body = req.body as unknown;
    const ok = validate(body);
    if (!ok) {
      const errors = (validate.errors || []).map(formatAjvError);
      return reply.code(400).send({ ok: false, errors });
    }
    const cfg = body as RuleConfigV1;
    const invErrors = checkInvariants(cfg);
    if (invErrors.length > 0) {
      return reply.code(400).send({ ok: false, errors: invErrors });
    }
    return { ok: true, warnings: computeWarnings(cfg) };
  });

  app.get('/schema', async (_req, _reply) => {
    return schema;
  });

  app.get('/history', async (req) => {
    const { getRuleConfigHistory } = await import('./rule-config.store.js');
    const q = (req.query || {}) as any;
    const limit = q.limit !== undefined ? Number(q.limit) : undefined;
    const items = getRuleConfigHistory();
    const out = (typeof limit === 'number' && limit > 0) ? items.slice(-limit) : items;
    return { ok: true, count: out.length, history: out };
  });

  app.get('/active', async (_req, _reply) => {
    // Lightweight runtime read; store returns a default if undefined
    const { getActiveRuleConfig } = await import('./rule-config.store.js');
    const cfg = getActiveRuleConfig();
    return { ok: true, config: cfg };
  });
});