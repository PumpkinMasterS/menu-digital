// Security utilities for data validation and sanitization
import { z } from "zod";

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return "";
  
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/\0/g, ''); // Remove null bytes
};

// Error message sanitization to prevent information disclosure
export const sanitizeErrorMessage = (error: unknown, userFriendlyMessage?: string): string => {
  // In production, return generic messages
  if (import.meta.env.PROD) {
    return userFriendlyMessage || 'Ocorreu um erro. Tente novamente.';
  }
  
  // In development, show detailed errors for debugging
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'Erro desconhecido';
};

// Safe error handler for database operations
export const handleDatabaseError = (error: any, operation: string): never => {
  const sanitizedMessage = sanitizeErrorMessage(error, `Erro ao ${operation}`);
  throw new Error(sanitizedMessage);
};

// Safe error handler for API operations  
export const handleApiError = (error: any, operation: string): never => {
  const sanitizedMessage = sanitizeErrorMessage(error, `Falha na ${operation}`);
  throw new Error(sanitizedMessage);
};

// File upload validation
export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/webm', 'video/ogg'
  ];
  
  // Blocked dangerous types
  const DANGEROUS_TYPES = [
    'application/x-executable', 'application/x-msdownload', 'application/x-msdos-program',
    'application/x-msi', 'application/x-bat', 'application/x-sh', 'application/x-perl',
    'application/x-python-code', 'text/x-php', 'application/x-httpd-php',
    'application/javascript', 'text/javascript', 'application/x-javascript'
  ];

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB`
    };
  }

  // Check for dangerous types first
  if (DANGEROUS_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo perigoso detectado e bloqueado por segurança'
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Tipos aceitos: ${ALLOWED_TYPES.join(', ')}`
    };
  }

  return { valid: true };
};

// Rate limiting for API calls
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove requests outside the time window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return true;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return false;
  }
}

// Password strength validation
export const validatePasswordStrength = (password: string): { 
  valid: boolean; 
  score: number; 
  feedback: string[] 
} => {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else feedback.push("Senha deve ter pelo menos 8 caracteres");

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Adicione letras minúsculas");

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Adicione letras maiúsculas");

  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Adicione números");

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push("Adicione caracteres especiais");

  return {
    valid: score >= 4,
    score,
    feedback
  };
};

// JWT token validation
export const validateJWT = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    return payload.exp > now;
  } catch {
    return false;
  }
};

// Content Security Policy headers
// Nota: frame-ancestors removido pois não funciona em meta tags
export const getCSPHeaders = (): Record<string, string> => ({
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https:",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
});

// Enhanced validation schemas
export const secureSchemas = {
  email: z.string()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .transform(sanitizeInput),
    
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128, "Senha muito longa")
    .refine(
      (password) => validatePasswordStrength(password).valid,
      "Senha muito fraca - use maiúsculas, minúsculas, números e símbolos"
    ),
    
  phoneNumber: z.string()
    .regex(/^(\+351)?[0-9]{9}$/, "Número de telefone português inválido")
    .transform(sanitizeInput),
    
  whatsappNumber: z.string()
    .regex(/^[0-9]{10,15}$/, "Número WhatsApp deve ter 10-15 dígitos")
    .transform(sanitizeInput),
    
  safeName: z.string()
    .min(2, "Nome muito curto")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s\-'.]+$/, "Nome contém caracteres inválidos")
    .transform(sanitizeInput)
};