import { useState, useEffect, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'

export const useInfiniteScroll = ({
  fetchMore,
  hasNextPage = false,
  isFetchingNextPage = false,
  threshold = 0.1
}) => {
  const [ref, inView] = useInView({
    threshold,
    rootMargin: '100px'
  })

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchMore()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchMore])

  return { ref, inView }
}

export const useVirtualizedList = (items, itemHeight = 200) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 })
  const [containerHeight, setContainerHeight] = useState(600)

  const getVisibleItems = useCallback(() => {
    return items.slice(visibleRange.start, visibleRange.end)
  }, [items, visibleRange])

  const handleScroll = useCallback((scrollTop) => {
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(start + visibleCount + 2, items.length) // buffer de 2 itens

    setVisibleRange({ start, end })
  }, [itemHeight, containerHeight, items.length])

  return {
    visibleItems: getVisibleItems(),
    visibleRange,
    handleScroll,
    setContainerHeight,
    totalHeight: items.length * itemHeight
  }
}

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const useImagePreloader = (imageUrls) => {
  const [loadedImages, setLoadedImages] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) {
      setIsLoading(false)
      return
    }

    let loadedCount = 0
    const totalImages = imageUrls.length

    const preloadImage = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, url]))
          loadedCount++
          if (loadedCount === totalImages) {
            setIsLoading(false)
          }
          resolve(url)
        }
        img.onerror = reject
        img.src = url
      })
    }

    Promise.allSettled(imageUrls.map(preloadImage))
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false))

  }, [imageUrls])

  return { loadedImages, isLoading }
}

export const useLazyLoading = (threshold = 0.1) => {
  const [ref, inView] = useInView({
    threshold,
    triggerOnce: true,
    rootMargin: '50px'
  })

  return { ref, inView }
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    fps: 0
  })

  const measureRenderTime = useCallback((callback) => {
    const start = performance.now()
    callback()
    const end = performance.now()
    
    setMetrics(prev => ({
      ...prev,
      renderTime: end - start
    }))
  }, [])

  const getMemoryUsage = useCallback(() => {
    if (performance.memory) {
      setMetrics(prev => ({
        ...prev,
        memoryUsage: performance.memory.usedJSHeapSize / 1024 / 1024 // MB
      }))
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      getMemoryUsage()
    }, 5000)

    return () => clearInterval(interval)
  }, [getMemoryUsage])

  return { metrics, measureRenderTime }
}