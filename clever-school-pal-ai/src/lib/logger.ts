// Logger utility with controlled verbosity and optional Node file transport
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Detect runtime
const IS_NODE = typeof process !== 'undefined' && !!process.versions?.node && typeof window === 'undefined';
const META_ENV: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
const ENV: Record<string, string | undefined> = IS_NODE ? (process.env as Record<string, string | undefined>) : META_ENV;

// Config
const LOG_LEVEL = (META_ENV.VITE_LOG_LEVEL || ENV.DISCORD_LOG_LEVEL || 'error') as string;
const IS_PRODUCTION = IS_NODE ? (ENV.NODE_ENV === 'production') : !!META_ENV.PROD;
// Default: desabilitar no browser, permitir em Node (controlado por nível)
const DISABLE_ALL_LOGS = (ENV.DISABLE_ALL_LOGS === 'true') || (!IS_NODE);

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  // 🚨 Em modo profissional, apenas errors críticos
  if (DISABLE_ALL_LOGS && level !== 'error') return false;
  if (IS_PRODUCTION && level === 'debug') return false;
  return logLevels[level] >= logLevels[LOG_LEVEL as LogLevel];
};

const formatMessage = (level: LogLevel, message: string, context?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [EduConnect] [${level.toUpperCase()}]`;
  
  if (context && Object.keys(context).length > 0) {
    return `${prefix} ${message} | ${JSON.stringify(context)}`;
  }
  
  return `${prefix} ${message}`;
};

// Optional Node file transport with rotation
const FILE_LOG_ENABLED = IS_NODE && (ENV.DISCORD_FILE_LOG_ENABLED === 'true');
const FILE_LOG_DIR = ENV.DISCORD_LOG_DIR || 'logs';
const FILE_LOG_FILE = ENV.DISCORD_LOG_FILE || 'discord.log';
const FILE_ERR_FILE = ENV.DISCORD_ERROR_LOG_FILE || 'discord-error.log';
const FILE_MAX_MB = Math.max(1, Number(ENV.DISCORD_LOG_MAX_SIZE_MB || '5'));
const FILE_MAX_BYTES = FILE_MAX_MB * 1024 * 1024;
const FILE_ROTATE_KEEP = Math.max(1, Number(ENV.DISCORD_LOG_ROTATE_KEEP || '5'));
const FILE_SPLIT_ERROR = ENV.DISCORD_LOG_SPLIT_ERROR === 'true';

async function ensureDir(pathModule: any) {
  const fs = await import('node:fs');
  const dirPath = pathModule.join(process.cwd(), FILE_LOG_DIR);
  try { await fs.promises.mkdir(dirPath, { recursive: true }); } catch {}
  return dirPath;
}

async function rotateIfNeeded(filePath: string, extraBytes: number) {
  const fs = await import('node:fs');
  try {
    const stat = await fs.promises.stat(filePath).catch(() => null);
    const size = stat?.size || 0;
    if (size + extraBytes <= FILE_MAX_BYTES) return;

    // Rotate chain: .N -> .N+1, base -> .1
    for (let i = FILE_ROTATE_KEEP; i >= 1; i--) {
      const from = `${filePath}.${i}`;
      const to = `${filePath}.${i + 1}`;
      try { await fs.promises.rename(from, to); } catch {}
    }
    try { await fs.promises.rename(filePath, `${filePath}.1`); } catch {}
  } catch {}
}

async function writeFileLog(level: LogLevel, formatted: string) {
  if (!FILE_LOG_ENABLED || !IS_NODE) return;
  const path = await import('node:path');
  const fs = await import('node:fs');
  const dir = await ensureDir(path);
  const basePath = path.join(dir, FILE_LOG_FILE);
  const errPath = path.join(dir, FILE_ERR_FILE);
  const target = level === 'error' && FILE_SPLIT_ERROR ? errPath : basePath;

  const data = formatted + '\n';
  try {
    await rotateIfNeeded(target, Buffer.byteLength(data));
    await fs.promises.appendFile(target, data, 'utf8');
  } catch {}
}

export const logger = {
  debug: (_message: string, _context?: Record<string, any>) => {
    // 🔇 Debug completamente desabilitado
    return;
  },
  
  info: (message: string, context?: Record<string, any>) => {
    // 🔇 Info limitado apenas para ações críticas do usuário
    if (!DISABLE_ALL_LOGS && shouldLog('info')) {
      // Bloquear TODOS os logs de auth/inicialização
      if (message.includes('Auth') || 
          message.includes('initialized') ||
          message.includes('Checking storage') || 
          message.includes('Auth system') ||
          message.includes('Theme applied') ||
          message.includes('Supabase client')) {
        return; // 🚫 BLOQUEADO
      }
      const formatted = formatMessage('info', message, context);
      console.info(formatted);
      void writeFileLog('info', formatted);
    }
  },
  
  warn: (message: string, context?: Record<string, any>) => {
    if (!DISABLE_ALL_LOGS && shouldLog('warn')) {
      const formatted = formatMessage('warn', message, context);
      console.warn(formatted);
      void writeFileLog('warn', formatted);
    }
  },
  
  error: (message: string, context?: Record<string, any>) => {
    // Apenas errors críticos que afetem funcionamento
    if (shouldLog('error')) {
      const formatted = formatMessage('error', message, context);
      console.error(formatted);
      void writeFileLog('error', formatted);
    }
  },

  // Supabase specific logging - COMPLETAMENTE DESABILITADO
  supabase: {
    auth: (_action: string, _success: boolean, _details?: any) => {
      // 🔇 SILENCIADO
    },

    storage: (_action: string, _success: boolean, _details?: any) => {
      // 🔇 SILENCIADO
    },

    database: (_action: string, _success: boolean, _details?: any) => {
      // 🔇 SILENCIADO
    }
  }
};

export default logger;