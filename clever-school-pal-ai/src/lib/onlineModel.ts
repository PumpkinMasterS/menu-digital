// Central helper for mapping LLMs to their :online variants and generic conversion logic
// Source of truth for Node/TS runtime (Discord services, web app).

// Importa o mapeamento centralizado compartilhado com a Edge Function
// Nota: TypeScript (frontend/backend) suporta import de JSON quando resolveJsonModule está habilitado.
// Para Node (cjs/esm) usamos assert { type: 'json' } se necessário, mas aqui é ts e será transpilado.
import ONLINE_MODELS_MAP from '../../supabase/functions/_shared/online-models.json';

export const ONLINEABLE_MODELS: string[] = Object.keys(ONLINE_MODELS_MAP);

const ONLINE_MODEL_MAP: Record<string, string> = ONLINE_MODELS_MAP as Record<string, string>;

/**
 * Convert model to its :online variant if "needsWebSearch" is true and the model supports an online variant.
 * Keeps the original model if already online or not eligible.
 */
export function toOnlineIfNeeded(model: string, needsWebSearch: boolean): string {
  try {
    if (!needsWebSearch || !model || typeof model !== 'string') return model;
    if (model.includes(':online')) return model;
    return ONLINE_MODEL_MAP[model] || model;
  } catch {
    return model;
  }
}