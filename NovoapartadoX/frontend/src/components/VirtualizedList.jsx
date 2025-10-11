import React, { useMemo } from 'react'
import { FixedSizeList as List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { useLazyLoading } from '../hooks/useInfiniteScroll'

const VirtualizedList = ({ 
  items, 
  itemHeight = 200, 
  renderItem, 
  className = '',
  overscan = 5,
  onItemsRendered,
  hasNextPage = false,
  loadMore,
  isLoading = false
}) => {
  const memoizedItems = useMemo(() => items, [items])

  const ItemRenderer = ({ index, style }) => {
    const item = memoizedItems[index]
    const isLast = index === memoizedItems.length - 1
    
    // Trigger load more when near the end
    if (isLast && hasNextPage && !isLoading && loadMore) {
      loadMore()
    }

    return (
      <div style={style}>
        {renderItem(item, index)}
        {isLast && isLoading && (
          <div className="loading-indicator" style={{ padding: '20px', textAlign: 'center' }}>
            Carregando mais...
          </div>
        )}
      </div>
    )
  }

  if (!memoizedItems || memoizedItems.length === 0) {
    return (
      <div className={`empty-state ${className}`} style={{ padding: '40px', textAlign: 'center' }}>
        <p>Nenhum item encontrado</p>
      </div>
    )
  }

  return (
    <div className={`virtualized-list ${className}`} style={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={memoizedItems.length}
            itemSize={itemHeight}
            overscanCount={overscan}
            onItemsRendered={onItemsRendered}
          >
            {ItemRenderer}
          </List>
        )}
      </AutoSizer>
    </div>
  )
}

export default React.memo(VirtualizedList)

// Componente específico para listagens de modelos/acompanhantes
export const VirtualizedModelList = ({ 
  models, 
  onModelClick, 
  hasNextPage, 
  loadMore, 
  isLoading 
}) => {
  const renderModelItem = (model, index) => (
    <div 
      key={model.id || index}
      className="model-card virtualized"
      onClick={() => onModelClick?.(model)}
      style={{
        display: 'flex',
        padding: '16px',
        borderBottom: '1px solid #eee',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    >
      <LazyImage
        src={model.photos?.[0]?.thumbnail || model.photos?.[0]?.url}
        alt={model.name}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '8px',
          objectFit: 'cover',
          marginRight: '16px'
        }}
      />
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>{model.name}</h3>
        <p style={{ margin: '0 0 4px 0', color: '#666' }}>{model.city}</p>
        <p style={{ margin: '0 0 4px 0', color: '#666' }}>
          {model.age} anos • {model.category}
        </p>

      </div>
      {model.verified && (
        <div style={{ 
          backgroundColor: '#4CAF50', 
          color: 'white', 
          padding: '4px 8px', 
          borderRadius: '4px',
          fontSize: '12px',
          height: 'fit-content'
        }}>
          Verificado
        </div>
      )}
    </div>
  )

  return (
    <VirtualizedList
      items={models}
      itemHeight={120}
      renderItem={renderModelItem}
      hasNextPage={hasNextPage}
      loadMore={loadMore}
      isLoading={isLoading}
      className="model-list"
    />
  )
}

// Componente de imagem lazy loading otimizada
const LazyImage = ({ src, alt, style, placeholder = '/placeholder.jpg' }) => {
  const { ref, inView } = useLazyLoading()
  const [loaded, setLoaded] = React.useState(false)
  const [error, setError] = React.useState(false)

  return (
    <div ref={ref} style={style}>
      {inView && (
        <img
          src={error ? placeholder : src}
          alt={alt}
          style={{
            ...style,
            opacity: loaded ? 1 : 0.5,
            transition: 'opacity 0.3s'
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
      {!inView && (
        <div 
          style={{
            ...style,
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ color: '#999', fontSize: '12px' }}>...</span>
        </div>
      )}
    </div>
  )
}