// =============================================================================
// HEADERS DE SEGURANÇA RIGOROSOS - PROTEÇÃO CONTRA ATAQUES WEB
// =============================================================================

export interface SecurityHeadersConfig {
  environment: 'development' | 'staging' | 'production';
  domain: string;
  allowedDomains: string[];
  nonce?: string;
}

export function getSecurityHeaders(config: SecurityHeadersConfig): Record<string, string> {
  const { environment, domain, nonce } = config;
  
  // Content Security Policy mais restritivo para produção
  // Nota: frame-ancestors não funciona em meta tags, apenas em headers HTTP
  const cspDirectives = [
    "default-src 'self'",
    environment === 'development' 
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https:"
      : `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ''} https://vercel.live https://vitals.vercel-insights.com`,
    environment === 'development'
      ? "style-src 'self' 'unsafe-inline' blob: data: https:"
      : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    environment === 'development'
      ? "font-src 'self' data: https://fonts.gstatic.com"
      : "font-src 'self' https://fonts.gstatic.com",
    environment === 'development'
      ? "connect-src 'self' http: https: ws: wss:"
      : "connect-src 'self' https: wss:",
    environment === 'development'
      ? "worker-src 'self' blob:"
      : "worker-src 'self'",
    "media-src 'self' https: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    environment === 'production' ? "block-all-mixed-content" : ""
  ].filter(Boolean);
  
  return {
    // Content Security Policy
    'Content-Security-Policy': cspDirectives.join('; '),
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS Protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (Feature Policy)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()', 
      'geolocation=()',
      'payment=()',
      'usb=()',
      'autoplay=(self)',
      'encrypted-media=(self)',
      'fullscreen=(self)',
      'picture-in-picture=(self)'
    ].join(', '),
    
    // HSTS (only for HTTPS)
    ...(environment === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Cross-Origin Policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // Server Information Hiding
    'Server': 'EduConnect-AI',
    'X-Powered-By': 'EduConnect-AI',
    
    // Cache Control for security
    'Cache-Control': environment === 'development' 
      ? 'no-cache, no-store, must-revalidate'
      : 'public, max-age=300, s-maxage=300',
    
    // Expect-CT (Certificate Transparency)
    ...(environment === 'production' && {
      'Expect-CT': `max-age=86400, enforce, report-uri="https://${domain}/api/security/ct-report"`
    })
  };
}

// =============================================================================
// MIDDLEWARE DE SEGURANÇA PARA REQUESTS
// =============================================================================

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  headers: Record<string, string>;
}

export function performSecurityCheck(
  request: Request,
  config: SecurityHeadersConfig
): SecurityCheckResult {
  const headers = getSecurityHeaders(config);
  let riskLevel: SecurityCheckResult['riskLevel'] = 'low';
  
  const origin = request.headers.get('origin');
  const userAgent = request.headers.get('user-agent');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  
  // Check 1: Origin validation
  if (origin && !isAllowedOrigin(origin, config.allowedDomains)) {
    return {
      allowed: false,
      reason: 'Origin not allowed',
      riskLevel: 'high',
      headers
    };
  }
  
  // Check 2: User Agent validation
  if (userAgent) {
    const suspiciousAgents = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /python-requests/i, /curl/i, /wget/i,
      /postman/i, /insomnia/i, /httpie/i
    ];
    
    if (suspiciousAgents.some(pattern => pattern.test(userAgent))) {
      riskLevel = 'medium';
    }
    
    // Block completely headless or suspicious agents
    if (userAgent.length < 10 || /headless|phantom|selenium/i.test(userAgent)) {
      return {
        allowed: false,
        reason: 'Suspicious user agent',
        riskLevel: 'critical',
        headers
      };
    }
  }
  
  // Check 3: Request method validation
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
  if (!allowedMethods.includes(request.method)) {
    return {
      allowed: false,
      reason: 'Method not allowed',
      riskLevel: 'medium',
      headers
    };
  }
  
  // Check 4: Content-Type validation for POST/PUT
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      riskLevel = 'medium';
    }
  }
  
  // Check 5: IP-based validation (if available)
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    const suspiciousIps = ips.some(ip => 
      ip.startsWith('10.') || 
      ip.startsWith('192.168.') ||
      ip === '127.0.0.1' ||
      ip === 'localhost'
    );
    
    if (suspiciousIps && config.environment === 'production') {
      riskLevel = 'medium';
    }
  }
  
  return {
    allowed: true,
    riskLevel,
    headers
  };
}

function isAllowedOrigin(origin: string, allowedDomains: string[]): boolean {
  try {
    const url = new URL(origin);
    return allowedDomains.some(domain => 
      url.hostname === domain || 
      url.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// =============================================================================
// DETECÇÃO DE ATAQUES COMUNS
// =============================================================================

export interface AttackPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export const ATTACK_PATTERNS: AttackPattern[] = [
  // SQL Injection
  {
    name: 'SQL_INJECTION',
    pattern: /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bupdate\b|--|\/\*|\*\/|'|")/i,
    severity: 'critical',
    description: 'Possível tentativa de SQL Injection'
  },
  
  // XSS
  {
    name: 'XSS_SCRIPT',
    pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    severity: 'high',
    description: 'Tentativa de injeção de script'
  },
  
  // Path Traversal
  {
    name: 'PATH_TRAVERSAL',
    pattern: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c/i,
    severity: 'high',
    description: 'Tentativa de path traversal'
  },
  
  // Command Injection
  {
    name: 'COMMAND_INJECTION',
    pattern: /(\||&|;|`|\$\(|\${|<|>)/,
    severity: 'critical',
    description: 'Possível tentativa de command injection'
  },
  
  // XXE
  {
    name: 'XXE_ATTACK',
    pattern: /<!DOCTYPE|<!ENTITY|SYSTEM|PUBLIC/i,
    severity: 'high',
    description: 'Possível tentativa de XXE attack'
  }
];

export function detectAttacks(input: string): AttackPattern[] {
  const detectedAttacks: AttackPattern[] = [];
  
  for (const pattern of ATTACK_PATTERNS) {
    if (pattern.pattern.test(input)) {
      detectedAttacks.push(pattern);
    }
  }
  
  return detectedAttacks;
}

export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '[SCRIPT_REMOVED]')
    .replace(/javascript:/gi, '[JAVASCRIPT_REMOVED]')
    .replace(/on\w+\s*=/gi, '[EVENT_HANDLER_REMOVED]')
    .replace(/(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b)/gi, '[SQL_KEYWORD_REMOVED]')
    .replace(/(\||&|;|`|\$\()/g, '[COMMAND_CHAR_REMOVED]')
    .replace(/\0/g, '') // Remove null bytes
    .trim();
}

// =============================================================================
// LOGGING DE SEGURANÇA
// =============================================================================

export interface SecurityLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  event: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

export function logSecurityEvent(
  level: SecurityLog['level'],
  event: string,
  details: Record<string, any>,
  request?: Request
): SecurityLog {
  const log: SecurityLog = {
    timestamp: new Date().toISOString(),
    level,
    event,
    details,
    ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown'
  };
  
  // Em produção, enviar para serviço de logging
  if (typeof console !== 'undefined') {
    const logMethod = level === 'critical' || level === 'error' ? console.error : 
                     level === 'warning' ? console.warn : console.log;
    
    logMethod(`[SECURITY:${level.toUpperCase()}] ${event}`, log);
  }
  
  return log;
}

// =============================================================================
// VALIDAÇÃO DE SESSÃO E TOKENS
// =============================================================================

export function validateJWTStructure(token: string): { valid: boolean; reason?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Invalid JWT structure' };
    }
    
    // Validate header
    const header = JSON.parse(atob(parts[0]));
    if (!header.alg || !header.typ) {
      return { valid: false, reason: 'Invalid JWT header' };
    }
    
    // Validate payload
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.iat || !payload.exp) {
      return { valid: false, reason: 'Invalid JWT payload' };
    }
    
    // Check expiration
    if (payload.exp * 1000 < Date.now()) {
      return { valid: false, reason: 'Token expired' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, reason: 'JWT parsing error' };
  }
}

export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// 🛡️ HEADERS DE SEGURANÇA PARA DEPLOY 2025
// Implementa proteções contra XSS, CSRF, Clickjacking, etc.

export interface SecurityHeaders {
  [key: string]: string;
}

// Headers de segurança recomendados para 2025
export const SECURITY_HEADERS: SecurityHeaders = {
  // Content Security Policy - Previne XSS
  // Nota: frame-ancestors removido pois não funciona em meta tags
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://openrouter.ai",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  // Previne clickjacking
  'X-Frame-Options': 'DENY',
  
  // Previne MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // XSS Protection (legacy, mas ainda útil)
  'X-XSS-Protection': '1; mode=block',
  
  // Força HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Controla referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy (Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '),
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

// Headers específicos para desenvolvimento
export const DEV_SECURITY_HEADERS: SecurityHeaders = {
  ...SECURITY_HEADERS,
  // CSP mais relaxado para desenvolvimento
  // Nota: frame-ancestors removido pois não funciona em meta tags
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com http://localhost:*",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://openrouter.ai http://localhost:* ws://localhost:*",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

// Função para aplicar headers de segurança
// Rate limiting para frontend
class FrontendRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remover tentativas antigas
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      console.warn('🛡️ Rate limit exceeded', { key, attempts: validAttempts.length });
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const frontendRateLimiter = new FrontendRateLimiter();