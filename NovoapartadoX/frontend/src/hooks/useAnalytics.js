import { useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'

// Configurações do analytics
const ANALYTICS_CONFIG = {
  apiUrl: '/api/analytics',
  trackPageViews: true,
  trackClicks: true,
  trackScrollDepth: true,
  trackTimeOnPage: true,
  batchSize: 10,
  flushInterval: 30000, // 30 segundos
  sessionTimeout: 30 * 60 * 1000, // 30 minutos
}

// Queue de eventos para batch processing
let eventQueue = []
let flushTimer = null

// Gerar ID de sessão
const generateSessionId = () => {
  const existing = sessionStorage.getItem('analytics_session_id')
  if (existing) {
    const sessionData = JSON.parse(existing)
    const now = Date.now()
    
    // Verificar se a sessão ainda é válida
    if (now - sessionData.lastActivity < ANALYTICS_CONFIG.sessionTimeout) {
      sessionData.lastActivity = now
      sessionStorage.setItem('analytics_session_id', JSON.stringify(sessionData))
      return sessionData.id
    }
  }
  
  // Criar nova sessão
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const sessionData = {
    id: sessionId,
    startTime: Date.now(),
    lastActivity: Date.now()
  }
  
  sessionStorage.setItem('analytics_session_id', JSON.stringify(sessionData))
  return sessionId
}

// Obter ID de sessão atual
const getSessionId = () => {
  const sessionData = sessionStorage.getItem('analytics_session_id')
  if (sessionData) {
    const parsed = JSON.parse(sessionData)
    return parsed.id
  }
  return generateSessionId()
}

// Atualizar atividade da sessão
const updateSessionActivity = () => {
  const sessionData = sessionStorage.getItem('analytics_session_id')
  if (sessionData) {
    const parsed = JSON.parse(sessionData)
    parsed.lastActivity = Date.now()
    sessionStorage.setItem('analytics_session_id', JSON.stringify(parsed))
  }
}

// Enviar eventos para o servidor
const sendEvents = async (events) => {
  try {
    const promises = events.map(event => 
      fetch(`${ANALYTICS_CONFIG.apiUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
    )
    
    await Promise.all(promises)
  } catch (error) {
    console.error('Erro ao enviar eventos de analytics:', error)
  }
}

// Flush da queue de eventos
const flushEvents = () => {
  if (eventQueue.length === 0) return
  
  const eventsToSend = [...eventQueue]
  eventQueue = []
  
  sendEvents(eventsToSend)
}

// Adicionar evento à queue
const queueEvent = (eventType, data = {}) => {
  const event = {
    eventType,
    data: {
      ...data,
      sessionId: getSessionId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      page: window.location.pathname + window.location.search
    }
  }
  
  eventQueue.push(event)
  updateSessionActivity()
  
  // Flush imediato para eventos críticos
  const criticalEvents = ['phone_click', 'listing_click', 'user_registration']
  if (criticalEvents.includes(eventType)) {
    flushEvents()
    return
  }
  
  // Flush quando atingir o tamanho do batch
  if (eventQueue.length >= ANALYTICS_CONFIG.batchSize) {
    flushEvents()
    return
  }
  
  // Configurar timer para flush automático
  if (flushTimer) {
    clearTimeout(flushTimer)
  }
  
  flushTimer = setTimeout(flushEvents, ANALYTICS_CONFIG.flushInterval)
}

// Hook principal de analytics
export const useAnalytics = () => {
  const location = useLocation()
  const pageStartTime = useRef(Date.now())
  const scrollDepthRef = useRef(0)
  const maxScrollDepth = useRef(0)

  // Tracking de page views
  useEffect(() => {
    if (!ANALYTICS_CONFIG.trackPageViews) return
    
    pageStartTime.current = Date.now()
    maxScrollDepth.current = 0
    
    queueEvent('page_view', {
      page: location.pathname + location.search,
      referrer: document.referrer
    })
    
    // Cleanup ao sair da página
    return () => {
      const timeOnPage = Date.now() - pageStartTime.current
      
      queueEvent('page_exit', {
        page: location.pathname + location.search,
        timeOnPage,
        maxScrollDepth: maxScrollDepth.current
      })
    }
  }, [location])

  // Tracking de scroll depth
  useEffect(() => {
    if (!ANALYTICS_CONFIG.trackScrollDepth) return
    
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollDepth = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0
      
      scrollDepthRef.current = scrollDepth
      
      if (scrollDepth > maxScrollDepth.current) {
        maxScrollDepth.current = scrollDepth
        
        // Tracking de marcos de scroll
        const milestones = [25, 50, 75, 90, 100]
        const currentMilestone = milestones.find(m => 
          scrollDepth >= m && maxScrollDepth.current < m
        )
        
        if (currentMilestone) {
          queueEvent('scroll_depth', {
            depth: currentMilestone,
            page: location.pathname + location.search
          })
        }
      }
    }
    
    const throttledScroll = throttle(handleScroll, 1000)
    window.addEventListener('scroll', throttledScroll)
    
    return () => {
      window.removeEventListener('scroll', throttledScroll)
    }
  }, [location])

  // Flush eventos ao sair da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushEvents()
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEvents()
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Funções de tracking
  const trackEvent = useCallback((eventType, data = {}) => {
    queueEvent(eventType, data)
  }, [])

  const trackListingView = useCallback((listingId, duration = null) => {
    queueEvent('listing_view', {
      listingId,
      duration,
      page: location.pathname + location.search
    })
  }, [location])

  const trackListingClick = useCallback((listingId, clickType = 'general') => {
    const eventType = clickType === 'phone' ? 'phone_click' : 'listing_click'
    queueEvent(eventType, {
      listingId,
      clickType,
      page: location.pathname + location.search
    })
  }, [location])

  const trackSearch = useCallback((query, filters = {}, resultsCount = 0) => {
    queueEvent('search', {
      searchQuery: query,
      filters,
      resultsCount,
      page: location.pathname + location.search
    })
  }, [location])

  const trackUserAction = useCallback((action, data = {}) => {
    const eventMap = {
      'register': 'user_registration',
      'login': 'user_login',
      'logout': 'user_logout',
      'profile_update': 'profile_update',
      'favorite_add': 'favorite_added',
      'favorite_remove': 'favorite_removed',
      'review_submit': 'review_submitted',
      'photo_upload': 'photo_upload',
      'listing_create': 'listing_created',
      'listing_update': 'listing_updated',
      'listing_delete': 'listing_deleted'
    }
    
    const eventType = eventMap[action] || action
    queueEvent(eventType, {
      ...data,
      action,
      page: location.pathname + location.search
    })
  }, [location])

  const trackError = useCallback((error, context = {}) => {
    queueEvent('error_occurred', {
      errorMessage: error.message || error.toString(),
      errorStack: error.stack,
      context,
      page: location.pathname + location.search
    })
  }, [location])

  const trackPerformance = useCallback((metric, value, context = {}) => {
    queueEvent('performance_metric', {
      metric,
      value,
      context,
      page: location.pathname + location.search
    })
  }, [location])

  return {
    trackEvent,
    trackListingView,
    trackListingClick,
    trackSearch,
    trackUserAction,
    trackError,
    trackPerformance,
    flushEvents: () => flushEvents(),
    getSessionId
  }
}

// Hook para tracking automático de cliques
export const useClickTracking = (elementRef, eventData = {}) => {
  const { trackEvent } = useAnalytics()
  
  useEffect(() => {
    if (!ANALYTICS_CONFIG.trackClicks || !elementRef.current) return
    
    const element = elementRef.current
    
    const handleClick = (event) => {
      const clickData = {
        elementType: element.tagName.toLowerCase(),
        elementId: element.id,
        elementClass: element.className,
        elementText: element.textContent?.substring(0, 100),
        clickX: event.clientX,
        clickY: event.clientY,
        ...eventData
      }
      
      trackEvent('element_click', clickData)
    }
    
    element.addEventListener('click', handleClick)
    
    return () => {
      element.removeEventListener('click', handleClick)
    }
  }, [elementRef, eventData, trackEvent])
}

// Hook para tracking de tempo em elemento
export const useTimeTracking = (elementRef, eventType = 'element_view') => {
  const { trackEvent } = useAnalytics()
  const startTime = useRef(null)
  const isVisible = useRef(false)
  
  useEffect(() => {
    if (!elementRef.current) return
    
    const element = elementRef.current
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible.current) {
            isVisible.current = true
            startTime.current = Date.now()
          } else if (!entry.isIntersecting && isVisible.current) {
            isVisible.current = false
            
            if (startTime.current) {
              const duration = Date.now() - startTime.current
              trackEvent(eventType, {
                duration,
                elementId: element.id,
                elementClass: element.className
              })
            }
          }
        })
      },
      { threshold: 0.5 }
    )
    
    observer.observe(element)
    
    return () => {
      observer.disconnect()
      
      // Track final duration se ainda estiver visível
      if (isVisible.current && startTime.current) {
        const duration = Date.now() - startTime.current
        trackEvent(eventType, {
          duration,
          elementId: element.id,
          elementClass: element.className,
          final: true
        })
      }
    }
  }, [elementRef, eventType, trackEvent])
}

// Hook para tracking de formulários
export const useFormTracking = (formRef, formName) => {
  const { trackEvent } = useAnalytics()
  
  useEffect(() => {
    if (!formRef.current) return
    
    const form = formRef.current
    const startTime = Date.now()
    
    const handleSubmit = (event) => {
      const duration = Date.now() - startTime
      const formData = new FormData(form)
      const fields = Array.from(formData.keys())
      
      trackEvent('form_submit', {
        formName,
        duration,
        fieldCount: fields.length,
        fields: fields.join(','),
        success: !event.defaultPrevented
      })
    }
    
    const handleFocus = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') {
        trackEvent('form_field_focus', {
          formName,
          fieldName: event.target.name || event.target.id,
          fieldType: event.target.type
        })
      }
    }
    
    form.addEventListener('submit', handleSubmit)
    form.addEventListener('focusin', handleFocus)
    
    return () => {
      form.removeEventListener('submit', handleSubmit)
      form.removeEventListener('focusin', handleFocus)
    }
  }, [formRef, formName, trackEvent])
}

// Utility function para throttle
function throttle(func, limit) {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export default useAnalytics