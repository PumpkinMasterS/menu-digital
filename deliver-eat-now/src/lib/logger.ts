// Sistema de logging estruturado para produção
interface LogLevel {
  ERROR: 0
  WARN: 1
  INFO: 2
  DEBUG: 3
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

type LogLevelKey = keyof LogLevel
type LogContext = Record<string, unknown>

interface LogEntry {
  timestamp: string
  level: LogLevelKey
  message: string
  context?: LogContext
  userId?: string
  sessionId?: string
  component?: string
}

class Logger {
  private isProduction = import.meta.env.PROD
  private currentLevel = this.isProduction ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG
  private sessionId = crypto.randomUUID()

  private formatMessage(level: LogLevelKey, message: string, context?: LogContext, component?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      sessionId: this.sessionId,
      component
    }
  }

  private shouldLog(level: LogLevelKey): boolean {
    return LOG_LEVELS[level] <= this.currentLevel
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return

    if (this.isProduction) {
      // Em produção, enviar para serviço de logging (ex: Supabase Edge Function)
      this.sendToLoggingService(entry)
    } else {
      // Em desenvolvimento, usar console com formatação
      const color = this.getLevelColor(entry.level)
      const prefix = `[${entry.timestamp}] ${entry.level}`
      const contextStr = entry.context ? `\nContext: ${JSON.stringify(entry.context, null, 2)}` : ''
      
      console.log(`%c${prefix}%c ${entry.message}${contextStr}`, 
        `color: ${color}; font-weight: bold`,
        'color: inherit'
      )
    }
  }

  private getLevelColor(level: LogLevelKey): string {
    switch (level) {
      case 'ERROR': return '#dc2626'  // red
      case 'WARN': return '#d97706'   // orange
      case 'INFO': return '#059669'   // green
      case 'DEBUG': return '#7c3aed'  // purple
      default: return '#374151'       // gray
    }
  }

  private async sendToLoggingService(entry: LogEntry): Promise<void> {
    try {
      // Enviar para edge function de logging
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      // Fallback para console em caso de erro
      console.error('Failed to send log to service:', error)
      console.log(entry)
    }
  }

  // Métodos públicos de logging
  error(message: string, context?: LogContext, component?: string): void {
    this.writeLog(this.formatMessage('ERROR', message, context, component))
  }

  warn(message: string, context?: LogContext, component?: string): void {
    this.writeLog(this.formatMessage('WARN', message, context, component))
  }

  info(message: string, context?: LogContext, component?: string): void {
    this.writeLog(this.formatMessage('INFO', message, context, component))
  }

  debug(message: string, context?: LogContext, component?: string): void {
    this.writeLog(this.formatMessage('DEBUG', message, context, component))
  }

  // Métodos específicos para diferentes tipos de eventos
  userAction(action: string, userId: string, context?: LogContext): void {
    this.info(`User action: ${action}`, { ...context, userId, type: 'user_action' })
  }

  apiRequest(method: string, url: string, status: number, duration: number): void {
    const level = status >= 400 ? 'ERROR' : status >= 300 ? 'WARN' : 'INFO'
    this.writeLog(this.formatMessage(level, `API ${method} ${url}`, {
      status,
      duration,
      type: 'api_request'
    }))
  }

  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 1000 ? 'WARN' : 'INFO'
    this.writeLog(this.formatMessage(level, `Performance: ${operation}`, {
      ...context,
      duration,
      type: 'performance'
    }))
  }

  security(event: string, userId?: string, context?: LogContext): void {
    this.warn(`Security event: ${event}`, { ...context, userId, type: 'security' })
  }

  // Configuração do logger
  setLevel(level: LogLevelKey): void {
    this.currentLevel = LOG_LEVELS[level]
  }

  setUserId(userId: string): void {
    // Adicionar userId ao contexto global
    this.sessionId = `${userId}-${this.sessionId.split('-').pop()}`
  }
}

// Singleton logger instance
export const logger = new Logger()

// Hook React para logging com contexto do componente
export const useLogger = (componentName: string) => {
  return {
    error: (message: string, context?: LogContext) => logger.error(message, context, componentName),
    warn: (message: string, context?: LogContext) => logger.warn(message, context, componentName),
    info: (message: string, context?: LogContext) => logger.info(message, context, componentName),
    debug: (message: string, context?: LogContext) => logger.debug(message, context, componentName),
    userAction: (action: string, userId: string, context?: LogContext) => 
      logger.userAction(action, userId, { ...context, component: componentName }),
  }
}

// Utility para timing de operações
export const withTiming = async <T>(
  operation: string,
  fn: () => Promise<T>,
  component?: string
): Promise<T> => {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    logger.performance(operation, duration, { component })
    return result
  } catch (error) {
    const duration = performance.now() - start
    logger.error(`${operation} failed`, { 
      error: error instanceof Error ? error.message : String(error),
      duration,
      component 
    })
    throw error
  }
}

export default logger 