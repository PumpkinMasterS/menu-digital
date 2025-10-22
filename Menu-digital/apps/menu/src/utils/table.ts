export function resolveTableCode(params: URLSearchParams, hostname: string): string | null {
  // Priority: URL param ?table=Txx
  const fromParam = params.get('table');
  if (fromParam && typeof fromParam === 'string' && fromParam.trim()) {
    return fromParam.trim().toUpperCase();
  }
  // Fallback: subdomain prefix, e.g., T01.your-domain.com
  const firstLabel = (hostname || '').split('.')[0] || '';
  const code = firstLabel.toUpperCase();
  if (/^T\d+$/.test(code)) return code;
  return null;
}