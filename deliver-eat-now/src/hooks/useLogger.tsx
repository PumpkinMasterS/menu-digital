import { useCallback } from 'react'

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  userId?: string
  sessionId?: string
  component?: string
  action?: string
  [key: string]: unknown
}

interface Logger {
  error: (message: string, context?: LogContext) => void
  warn: (message: string, context?: LogContext) => void
  info: (message: string, context?: LogContext) => void
  debug: (message: string, context?: LogContext) => void
}

export const useLogger = (component?: string): Logger => {
  const isProduction = import.meta.env.PROD
  const isDevelopment = import.meta.env.DEV

  const log = useCallback((level: LogLevel, message: string, context?: LogContext) => {
    // Em produção, apenas log de erros e warnings
    if (isProduction && !['error', 'warn'].includes(level)) {
      return
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component,
      ...context
    }

    // Em desenvolvimento, usar console
    if (isDevelopment) {
      switch (level) {
        case 'error':
          console.error(`[${component || 'APP'}]`, message, context)
          break
        case 'warn':
          console.warn(`[${component || 'APP'}]`, message, context)
          break
        case 'info':
          console.info(`[${component || 'APP'}]`, message, context)
          break
        case 'debug':
          console.debug(`[${component || 'APP'}]`, message, context)
          break
      }
    }

    // Em produção, enviar para serviço de logging (futuro)
    if (isProduction && ['error', 'warn'].includes(level)) {
      // Aqui você pode integrar com serviços como Sentry, LogRocket, etc.
      // Exemplo: sendToLoggingService(logEntry)
      
      // Por enquanto, armazenar em localStorage para debug
      try {
        const logs = JSON.parse(localStorage.getItem('app_logs') || '[]')
        logs.push(logEntry)
        
        // Manter apenas os últimos 50 logs
        if (logs.length > 50) {
          logs.splice(0, logs.length - 50)
        }
        
        localStorage.setItem('app_logs', JSON.stringify(logs))
      } catch (e) {
        // Fallback silencioso se localStorage não estiver disponível
      }
    }
  }, [component, isProduction, isDevelopment])

  return {
    error: useCallback((message: string, context?: LogContext) => {
      log('error', message, context)
    }, [log]),

    warn: useCallback((message: string, context?: LogContext) => {
      log('warn', message, context)
    }, [log]),

    info: useCallback((message: string, context?: LogContext) => {
      log('info', message, context)
    }, [log]),

    debug: useCallback((message: string, context?: LogContext) => {
      log('debug', message, context)
    }, [log])
  }
}

// Hook para debug de logs em produção (apenas para admins)
export const useLogViewer = () => {
  const getLogs = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]')
    } catch {
      return []
    }
  }, [])

  const clearLogs = useCallback(() => {
    localStorage.removeItem('app_logs')
  }, [])

  const exportLogs = useCallback(() => {
    const logs = getLogs()
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `app-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [getLogs])

  return {
    getLogs,
    clearLogs,
    exportLogs
  }
} 