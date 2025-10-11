# RuleConfig – Contrato de Configuração

Objetivo
- Definir, de forma declarativa, as regras e políticas do bot (frontend), para o backend aplicar decisões de forma rule-agnostic.
- Abrange símbolos, timeframes, indicadores/sentimento, execução, SL/TP, sizing e limites globais.

Princípios
- Validação estrita no backend via JSON Schema.
- Versionamento: draft → validate → publish, com auditoria e rollback.
- Precedência: política global de risco supera regras específicas.

JSON Schema (v1 – simplificado)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "ruleconfig.schema.json",
  "type": "object",
  "required": ["metadata", "symbols", "timeframes", "risk", "execution"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["name", "version", "createdAt"],
      "properties": {
        "name": {"type": "string"},
        "version": {"type": "string"},
        "createdAt": {"type": "string", "format": "date-time"},
        "status": {"type": "string", "enum": ["draft", "published"]},
        "parentVersion": {"type": "string"}
      }
    },
    "symbols": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["symbol", "marketType"],
        "properties": {
          "symbol": {"type": "string"},
          "marketType": {"type": "string", "enum": ["spot", "perp"]},
          "leverage": {"type": "number", "minimum": 1, "maximum": 10},
          "marginMode": {"type": "string", "enum": ["isolated", "cross"]}
        }
      }
    },
    "timeframes": {
      "type": "array",
      "items": {"type": "string", "enum": ["1m", "3m", "5m", "10m", "15m", "1h", "4h"]},
      "minItems": 1
    },
    "indicators": {
      "type": "object",
      "properties": {
        "rsi": {"type": "object", "properties": {"period": {"type": "integer", "minimum": 2}, "upper": {"type": "number"}, "lower": {"type": "number"}}},
        "ema": {"type": "object", "properties": {"fast": {"type": "integer"}, "slow": {"type": "integer"}}},
        "atr": {"type": "object", "properties": {"period": {"type": "integer", "minimum": 2}}},
        "macd": {"type": "object", "properties": {"fast": {"type": "integer"}, "slow": {"type": "integer"}, "signal": {"type": "integer"}}}
      }
    },
    "sentiment": {
      "type": "object",
      "properties": {
        "window": {"type": "string"},
        "sources": {
          "type": "array",
          "items": {"type": "object", "properties": {"name": {"type": "string"}, "weight": {"type": "number"}}}
        }
      }
    },
    "risk": {
      "type": "object",
      "required": ["sizing", "stopLoss", "takeProfit"],
      "properties": {
        "sizing": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "stopLoss": {"type": "object", "required": ["mode", "value"], "properties": {"mode": {"type": "string", "enum": ["percent", "absolute", "atrMultiple"]}, "value": {"type": "number", "exclusiveMinimum": 0}}},
        "takeProfit": {"type": "object", "required": ["mode", "value"], "properties": {"mode": {"type": "string", "enum": ["percent", "absolute", "atrMultiple"]}, "value": {"type": "number", "exclusiveMinimum": 0}}},
        "rrMin": {"type": "number", "exclusiveMinimum": 0},
        "maxDailyDrawdown": {"type": "number", "minimum": 0, "maximum": 1},
        "maxPositions": {"type": "integer", "minimum": 1},
        "maxSignals": {"type": "integer", "minimum": 1},
        "cooldownCandles": {"type": "integer", "minimum": 0},
        "killSwitch": {"type": "object", "properties": {"enabled": {"type": "boolean"}, "errorBurst": {"type": "integer"}, "latencyMs": {"type": "integer"}}}
      }
    },
    "execution": {
      "type": "object",
      "properties": {
        "defaultOrderType": {"type": "string", "enum": ["market", "limit"]},
        "postOnly": {"type": "boolean"},
        "reduceOnly": {"type": "boolean"}
      }
    },
    "precedence": {
      "type": "object",
      "properties": {
        "riskOverridesRule": {"type": "boolean"},
        "conflictResolution": {"type": "string", "enum": ["block", "warn"]}
      }
    },
    "audit": {
      "type": "object",
      "properties": {
        "changedBy": {"type": "string"},
        "reason": {"type": "string"}
      }
    }
  }
}
```

Exemplo (v1)
```json
{
  "metadata": {"name": "Base BTC", "version": "1.0.0", "createdAt": "2025-09-22T10:00:00Z", "status": "draft"},
  "symbols": [{"symbol": "BTCUSDT", "marketType": "perp", "leverage": 3, "marginMode": "isolated"}],
  "timeframes": ["1m", "3m", "5m", "10m", "15m", "1h", "4h"],
  "indicators": {"rsi": {"period": 14, "upper": 70, "lower": 30}, "ema": {"fast": 50, "slow": 200}, "atr": {"period": 14}},
  "sentiment": {"window": "6h", "sources": [{"name": "twitter", "weight": 0.6}, {"name": "reddit", "weight": 0.4}]},
  "risk": {
    "sizing": 0.02,
    "stopLoss": {"mode": "atrMultiple", "value": 1.5},
    "takeProfit": {"mode": "atrMultiple", "value": 3},
    "rrMin": 1.5,
    "maxDailyDrawdown": 0.05,
    "maxPositions": 1,
    "maxSignals": 3,
    "cooldownCandles": 2,
    "killSwitch": {"enabled": true, "errorBurst": 5, "latencyMs": 1500}
  },
  "execution": {"defaultOrderType": "limit", "postOnly": true, "reduceOnly": true},
  "precedence": {"riskOverridesRule": true, "conflictResolution": "block"},
  "audit": {"changedBy": "admin", "reason": "Config inicial"}
}
```

Validações e precedência
- Backend valida ranges, tipos e dependências (ex.: leverage só para perp; reduceOnly em saídas).
- Política global de risco bloqueia ordens que violem rrMin, maxDailyDrawdown, limites de sizing/posições.

Versionamento e publicação
- Ciclo: draft → validate (backend) → publish.
- Snapshot do RuleConfig é guardado e referenciado em cada sinal/ordem.

## Versionamento e Audit Log

- Campos: version (int), status (draft | active | archived), effectiveAt (ISO UTC), createdAt, updatedAt, publishedBy, changeReason, hash, parentVersion.
- Persistência: MongoDB (coleção rule_configs) com histórico completo; index por { status, effectiveAt, version }.
- Rollback: reativar versão anterior (alterando status/effectiveAt) e registrar motivo em audit log.

## Campos opcionais (cooldown e sentimento)

- cooldownBars por timeframe é opcional; se ausente, aplica-se o default global.
- sentimentFilters opcionais (ex.: source, scoreMin, window); se ausentes, nenhum filtro é aplicado.
- Defaults documentados e aplicados pelo motor sem exigir alteração de código.

## Precedência de sinais

- Prioridade entre timeframes: 4h > 1h > 15m > 10m > 5m > 3m > 1m.
- Conflitos (sinais simultâneos para o mesmo símbolo) são resolvidos pela maior prioridade; empate por score/força do sinal e, por fim, recência.
- Janela de deduplicação: até 1 candle do timeframe menor para evitar churn.

## Validação (Ajv)

- RuleConfig deve ser validado no boot e a cada publish usando Ajv (JSON Schema 2020-12).
- Em caso de inválido: bloquear cálculo/execução, emitir alerta e registrar em auditoria.
- Compatibilidade de schema por versionamento (schemaVersion) e migrações documentadas.

## Parâmetros padrão de risco

- rrMin default, killSwitch (maxDrawdown, maxConsecutiveLosses), maxSignals por timeframe, cooldowns por timeframe.
- Overrides por símbolo (stepSize, lotSize, minNotional/qty, pricePrecision, quantityPrecision) com validação antes do envio de ordens.

## Publicação/ativação

- Ciclo: draft → validate → publish; effectiveAt permite ativação programada.
- Rollback seguro: republicar versão anterior como active, auditando operador e changeReason.

## Atualizações aplicadas (setup inicial)

- Símbolos de arranque: BTCUSDT e ETHUSDT.
- Timeframes suportados (atuais no backend): 1m, 3m, 5m, 10m, 15m, 1h, 4h.
- Timeframes planejados (próximo passo): incluir 30m, 2h, 1d (exige atualização do schema e do motor de regras).
- Risco (baseline):
  - cooldownSeconds: 2
  - maxConcurrentSignals: 2
  - rrMin: 1.0 (podes aumentar conforme necessidade)
  - killSwitch: false (o kill switch global pode ser acionado manualmente no servidor)
- Precedência padrão de timeframes: 4h > 1h > 15m > 10m > 5m > 3m > 1m

### Exemplo de publicação via API (/rules/publish)

Endpoint:
- POST /rules/publish

Exemplo de payload (v1):
```json
{
  "schemaVersion": 1,
  "name": "frontend-defaults",
  "effectiveAt": "2025-09-25T12:00:00Z",
  "timeframes": ["1m", "3m", "5m", "10m", "15m", "1h", "4h"],
  "symbols": ["BTCUSDT", "ETHUSDT"],
  "risk": {
    "maxConcurrentSignals": 2,
    "rrMin": 1.0,
    "killSwitch": false,
    "cooldownSeconds": 2
  },
  "precedence": ["4h", "1h", "15m", "10m", "5m", "3m", "1m"]
}
```

Resposta esperada (200):
```json
{
  "ok": true,
  "appliedAt": "2025-09-25T12:01:00.123Z",
  "warnings": [
    "... (podem surgir avisos sobre campos opcionais não definidos)"
  ]
}
```

Notas:
- O schema v1 atual não expõe campos detalhados de stopLoss/takeProfit; estes podem ser geridos no Execution Manager a partir de configurações do frontend, enquanto o /rules/publish cobre principalmente risco global (cooldown, concorrência, rrMin, killSwitch).
- Expansão do schema para incluir SL/TP explícitos poderá ser introduzida numa versão posterior (v2).