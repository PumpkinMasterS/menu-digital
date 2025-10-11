import { z } from "zod";

// Environment schema validation
const envSchema = z.object({
  // Vite environment variables
  MODE: z.enum(["development", "production", "test"]).default("development"),
  DEV: z.boolean().default(true),
  PROD: z.boolean().default(false),
  
  // Supabase configuration
  VITE_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  
  // Optional environment variables
  VITE_APP_ENVIRONMENT: z.enum(["development", "staging", "production"]).default("development"),
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_ALLOWED_ORIGINS: z.string().optional(),
  
  // Feature flags
  VITE_ENABLE_ANALYTICS: z.string().transform(val => val === "true").default("false"),
  VITE_ENABLE_ERROR_REPORTING: z.string().transform(val => val === "true").default("false"),
  VITE_ENABLE_PERFORMANCE_MONITORING: z.string().transform(val => val === "true").default("false"),
  
  // WhatsApp integration (optional)
  VITE_WHATSAPP_ENABLED: z.string().transform(val => val === "true").default("false"),
});

// Parse and validate environment variables
function parseEnv() {
  const env = {
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_APP_ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_ALLOWED_ORIGINS: import.meta.env.VITE_ALLOWED_ORIGINS,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
    VITE_ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING,
    VITE_ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING,
    VITE_WHATSAPP_ENABLED: import.meta.env.VITE_WHATSAPP_ENABLED,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${missingVars}`);
    }
    throw error;
  }
}

// Export validated environment variables
export const env = parseEnv();

// Helper functions
export const isDevelopment = env.MODE === "development";
export const isProduction = env.MODE === "production";
export const isTest = env.MODE === "test";

// Application configuration based on environment
export const appConfig = {
  supabase: {
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY,
  },
  app: {
    environment: env.VITE_APP_ENVIRONMENT,
    baseUrl: env.VITE_API_BASE_URL || env.VITE_SUPABASE_URL,
    allowedOrigins: env.VITE_ALLOWED_ORIGINS?.split(',') || [],
  },
  features: {
    analytics: env.VITE_ENABLE_ANALYTICS,
    errorReporting: env.VITE_ENABLE_ERROR_REPORTING,
    performanceMonitoring: env.VITE_ENABLE_PERFORMANCE_MONITORING,
    whatsapp: env.VITE_WHATSAPP_ENABLED,
  },
  debug: {
    showPerformanceMetrics: isDevelopment,
    showErrorDetails: isDevelopment,
    enableConsoleLogging: isDevelopment,
  },
} as const;

// Validate required environment variables on startup
export function validateEnvironment() {
  try {
    parseEnv();
    console.log(`✅ Environment validation passed (${env.MODE})`);
    
    if (isDevelopment) {
      console.log("📊 Debug mode enabled");
      console.log("🔧 Performance monitoring:", appConfig.features.performanceMonitoring);
      console.log("📈 Analytics:", appConfig.features.analytics);
    }
  } catch (error) {
    console.error("❌ Environment validation failed:", error);
    throw error;
  }
}