// Deno-compatible copy of the online model helper for Edge Functions.
// This file should remain functionally identical to src/lib/onlineModel.ts.

// Load JSON mapping (Deno supports import assertions in TS with bundler)
// In Supabase Edge Functions (Deno Deploy), dynamic fs is restricted; static import is fine.
import mapping from './online-models.json' assert { type: 'json' };

const ONLINE_MODEL_MAP: Record<string, string> = mapping as Record<string, string>;

export const ONLINEABLE_MODELS: string[] = Object.keys(ONLINE_MODEL_MAP);

export function toOnlineIfNeeded(model: string, needsWebSearch: boolean): string {
  try {
    if (!needsWebSearch || !model || typeof model !== 'string') return model;
    if (model.includes(':online')) return model;
    return ONLINE_MODEL_MAP[model] || model;
  } catch {
    return model;
  }
}