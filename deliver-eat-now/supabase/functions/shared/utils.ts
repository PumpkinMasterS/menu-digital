// ============================================================================
// SHARED UTILITIES FOR ENTERPRISE EDGE FUNCTIONS
// Error handling, logging, retry logic, and resilience patterns
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface LogContext {
  organizationId?: string;
  userId?: string;
  action: string;
  metadata?: Record<string, any>;
  requestId?: string;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

export class Logger {
  private context: LogContext;

  constructor(context: LogContext) {
    this.context = {
      ...context,
      requestId: context.requestId || crypto.randomUUID(),
    };
  }

  private log(level: string, message: string, metadata?: Record<string, any>) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      organizationId: this.context.organizationId,
      userId: this.context.userId,
      action: this.context.action,
      requestId: this.context.requestId,
      ...this.context.metadata,
      ...metadata,
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>) {
    this.log('error', message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...metadata,
    });
  }

  debug(message: string, metadata?: Record<string, any>) {
    if (Deno.env.get('LOG_LEVEL') === 'debug') {
      this.log('debug', message, metadata);
    }
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error) {
    super(
      `External service error: ${service}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service, originalError: originalError?.message }
    );
  }
}

// ============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================================================

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  logger?: Logger
): Promise<T> {
  const config: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    ...options,
  };

  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1 && logger) {
        logger.info(`Operation succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (logger) {
        logger.warn(`Operation failed on attempt ${attempt}`, {
          error: lastError.message,
          attempt,
          maxAttempts: config.maxAttempts,
        });
      }

      // Don't retry on the last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Don't retry on certain types of errors
      if (error instanceof ValidationError || 
          error instanceof AuthenticationError || 
          error instanceof AuthorizationError) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw new AppError(
    `Operation failed after ${config.maxAttempts} attempts: ${lastError.message}`,
    'MAX_RETRIES_EXCEEDED',
    500,
    { originalError: lastError.message, attempts: config.maxAttempts }
  );
}

// ============================================================================
// CIRCUIT BREAKER PATTERN
// ============================================================================

export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      ...options,
    };
  }

  async execute<T>(operation: () => Promise<T>, logger?: Logger): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger?.info('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new AppError(
          'Circuit breaker is OPEN',
          'CIRCUIT_BREAKER_OPEN',
          503
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess(logger);
      return result;
    } catch (error) {
      this.onFailure(logger);
      throw error;
    }
  }

  private onSuccess(logger?: Logger) {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger?.info('Circuit breaker closed after successful operation');
    }
  }

  private onFailure(logger?: Logger) {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      logger?.warn(`Circuit breaker opened after ${this.failures} failures`);
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

export async function checkRateLimit(
  userId: string,
  action: string,
  maxRequests: number = 100,
  windowMinutes: number = 60,
  supabase: any,
  logger?: Logger
): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      action_name: action,
      max_requests: maxRequests,
      window_minutes: windowMinutes,
    });

    if (error) {
      logger?.error('Rate limit check failed', error);
      // Don't block on rate limit check failure, but log it
      return;
    }

    if (!data) {
      logger?.warn('Rate limit exceeded', {
        userId,
        action,
        maxRequests,
        windowMinutes,
      });
      throw new RateLimitError(windowMinutes * 60); // Convert to seconds
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    
    logger?.error('Rate limit check error', error as Error);
    // Don't block on technical errors
  }
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export function validateRequest(
  request: Request,
  requiredHeaders: string[] = [],
  requiredMethods: string[] = ['POST']
): void {
  // Check HTTP method
  if (!requiredMethods.includes(request.method)) {
    throw new ValidationError(
      `Method ${request.method} not allowed. Allowed methods: ${requiredMethods.join(', ')}`
    );
  }

  // Check required headers
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      throw new ValidationError(`Missing required header: ${header}`);
    }
  }

  // Check Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new ValidationError('Content-Type must be application/json');
    }
  }
}

export async function parseRequestBody<T>(request: Request): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ValidationError('Invalid JSON body', {
      error: (error as Error).message,
    });
  }
}

// ============================================================================
// RESPONSE UTILITIES
// ============================================================================

export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        ...headers,
      },
    }
  );
}

export function createErrorResponse(
  error: AppError | Error,
  requestId?: string
): Response {
  const isAppError = error instanceof AppError;
  
  const errorResponse: ErrorDetails = {
    code: isAppError ? error.code : 'INTERNAL_ERROR',
    message: error.message,
    details: isAppError ? error.details : undefined,
    timestamp: new Date().toISOString(),
    requestId,
  };

  const status = isAppError ? error.statusCode : 500;

  return new Response(
    JSON.stringify({
      success: false,
      error: errorResponse,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
}

// ============================================================================
// SUPABASE CLIENT WITH ERROR HANDLING
// ============================================================================

export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new AppError(
      'Missing Supabase configuration',
      'CONFIGURATION_ERROR',
      500,
      { missing: !supabaseUrl ? 'SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY' }
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

export async function authenticateUser(
  request: Request,
  supabase: any
): Promise<{ user: any; organizationId: string; role: string }> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new AuthenticationError('Invalid token');
  }

  // Get user profile with organization and role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthenticationError('User profile not found');
  }

  return {
    user,
    organizationId: profile.organization_id,
    role: profile.role,
  };
}

// ============================================================================
// MAIN FUNCTION WRAPPER
// ============================================================================

export function createSecureHandler(
  handler: (
    request: Request,
    context: {
      user: any;
      organizationId: string;
      role: string;
      logger: Logger;
      supabase: any;
    }
  ) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    
    let logger: Logger;
    let context: any = {};

    try {
      // Initialize logger
      logger = new Logger({
        action: 'function_execution',
        requestId,
      });

      // Validate request
      validateRequest(request);

      // Initialize Supabase client
      const supabase = createSupabaseClient();

      // Authenticate user
      const auth = await authenticateUser(request, supabase);
      
      // Update logger with user context
      logger = new Logger({
        action: 'function_execution',
        requestId,
        userId: auth.user.id,
        organizationId: auth.organizationId,
      });

      context = {
        ...auth,
        logger,
        supabase,
      };

      logger.info('Function execution started');

      // Execute handler with retry logic
      const response = await withRetry(
        () => handler(request, context),
        { maxAttempts: 2 },
        logger
      );

      logger.info('Function execution completed successfully');
      return response;

    } catch (error) {
      const appError = error as AppError | Error;
      
      if (logger) {
        logger.error('Function execution failed', appError);
      } else {
        console.error('Function execution failed:', appError);
      }

      return createErrorResponse(appError, requestId);
    }
  };
} 