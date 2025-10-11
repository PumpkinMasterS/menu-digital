import { z } from "zod";

// =============================================================================
// VALIDAÇÃO DE ENTRADA RIGOROSA - PREVENÇÃO DE INJECTION ATTACKS
// =============================================================================

// Email validation with whitelist domains for security
const ALLOWED_EMAIL_DOMAINS = [
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 
  'escola.com', 'educonnect.ai', 'educacao.gov.pt'
];

export const emailSchema = z
  .string()
  .email('Email inválido')
  .min(1, 'Email é obrigatório')
  .max(255, 'Email muito longo')
  .refine((email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain && ALLOWED_EMAIL_DOMAINS.includes(domain);
  }, 'Domínio de email não permitido');

// Password validation with security requirements
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha muito longa')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
  .regex(/[^a-zA-Z0-9]/, 'Senha deve conter pelo menos um caractere especial');

// Phone number validation (Portuguese format)
export const phoneSchema = z
  .string()
  .regex(/^\+351[0-9]{9}$|^[0-9]{9}$/, 'Número de telefone inválido')
  .transform((phone) => {
    // Normalize to +351 format
    if (phone.startsWith('+351')) return phone;
    if (phone.length === 9) return `+351${phone}`;
    return phone;
  });

// Text content validation (prevent XSS)
export const textContentSchema = z
  .string()
  .max(10000, 'Texto muito longo')
  .refine((text) => {
    // Block dangerous HTML tags and JavaScript
    const dangerousPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(text));
  }, 'Conteúdo contém código potencialmente perigoso');

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string().max(255, 'Nome do arquivo muito longo'),
  size: z.number().max(50 * 1024 * 1024, 'Arquivo muito grande (máx 50MB)'),
  type: z.enum([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/webm'
  ], { errorMap: () => ({ message: 'Tipo de arquivo não permitido' }) })
});

// School data validation
export const schoolSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(200, 'Nome muito longo'),
  address: z.string().min(5, 'Endereço muito curto').max(500, 'Endereço muito longo'),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
});

// Student data validation
export const studentSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  phone: phoneSchema,
  school_id: z.string().uuid('ID da escola inválido'),
  class_id: z.string().uuid('ID da turma inválido'),
  notes: textContentSchema.optional(),
});

// Class data validation
export const classSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  grade: z.string().min(1, 'Ano é obrigatório').max(20, 'Ano muito longo'),
  school_id: z.string().uuid('ID da escola inválido'),
  description: textContentSchema.optional(),
});

// User data validation
export const userSchema = z.object({
  email: emailSchema,
  name: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  role: z.enum(['super_admin', 'admin', 'teacher', 'student'], {
    errorMap: () => ({ message: 'Role inválido' })
  }),
  school_id: z.string().uuid('ID da escola inválido').optional(),
});

// =============================================================================
// SANITIZAÇÃO DE DADOS
// =============================================================================

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/\0/g, '') // Remove null bytes
    .trim();
}

export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  return query
    .replace(/[<>\"'%;()&+]/g, '') // Remove SQL/HTML special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 200); // Limit length
}

export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .substring(0, 100); // Limit length
}

// =============================================================================
// VALIDAÇÃO DE API REQUESTS
// =============================================================================

export function validateApiRequest(req: Request): { valid: boolean; error?: string } {
  const contentType = req.headers.get('content-type');
  const userAgent = req.headers.get('user-agent');
  const origin = req.headers.get('origin');
  
  // Check content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!contentType || !contentType.includes('application/json')) {
      return { valid: false, error: 'Invalid content type' };
    }
  }
  
  // Block suspicious user agents
  if (userAgent) {
    const suspiciousPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /python/i, /curl/i, /wget/i, /postman/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      return { valid: false, error: 'Blocked user agent' };
    }
  }
  
  // Validate origin for browser requests
  if (origin && !isValidOrigin(origin)) {
    return { valid: false, error: 'Invalid origin' };
  }
  
  return { valid: true };
}

function isValidOrigin(origin: string): boolean {
  const allowedOrigins = [
    'https://connectai.pt',
    'https://www.connectai.pt',
    'https://clever-school-pal-ai.vercel.app',
    'http://localhost:8080',
    'http://localhost:8081'
  ];
  
  return allowedOrigins.includes(origin);
}

// =============================================================================
// RATE LIMITING IMPLEMENTATION
// =============================================================================

interface RateLimitRecord {
  count: number;
  resetTime: number;
  lastRequest: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  identifier: string, 
  maxRequests = 100, 
  windowMs = 60000,
  blockDuration = 300000 // 5 minutes block
): { allowed: boolean; remainingRequests: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;
  
  let record = rateLimitStore.get(key);
  
  // If no record or window expired, create new one
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
      lastRequest: now
    };
    rateLimitStore.set(key, record);
    
    return {
      allowed: true,
      remainingRequests: maxRequests - 1,
      resetTime: record.resetTime
    };
  }
  
  // Check if currently blocked
  if (record.count > maxRequests && now < record.lastRequest + blockDuration) {
    return {
      allowed: false,
      remainingRequests: 0,
      resetTime: record.lastRequest + blockDuration
    };
  }
  
  // Increment counter
  record.count++;
  record.lastRequest = now;
  
  const allowed = record.count <= maxRequests;
  
  return {
    allowed,
    remainingRequests: Math.max(0, maxRequests - record.count),
    resetTime: record.resetTime
  };
}

// =============================================================================
// SECURITY UTILITIES
// =============================================================================

export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function hashSensitiveData(data: string): string {
  // Simple hash for demo - in production use bcrypt or similar
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  return crypto.subtle.digest('SHA-256', dataBuffer).then(hashBuffer => {
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }).catch(() => 'hash_error');
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
} 