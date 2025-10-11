import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function ListingDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const passedItem = location.state?.item;

  const [item, setItem] = useState(passedItem || null);
  const [loading, setLoading] = useState(!passedItem);
  const [activeIndex, setActiveIndex] = useState(0);

  // Mock de modelos para fallback (sem backend ou sem fotos)
  const mockModels = [
    { _id: 'm1', name: 'Bruna', city: 'Lisboa', age: 24, verified: true, price: 120, photos: [{ url: 'https://placehold.co/2000x1200?text=Bruna' }, { url: 'https://placehold.co/1600x1000?text=Bruna+2' }, { url: 'https://placehold.co/1200x800?text=Bruna+3' }] },
    { _id: 'm2', name: 'Camila', city: 'Porto', age: 27, verified: true, price: 150, photos: [{ url: 'https://placehold.co/2000x1200?text=Camila' }, { url: 'https://placehold.co/1600x1000?text=Camila+2' }] },
    { _id: 'm3', name: 'Sofia', city: 'Coimbra', age: 22, verified: false, price: 90, photos: [{ url: 'https://placehold.co/2000x1200?text=Sofia' }] },
  ];

  useEffect(() => {
    const load = async () => {
      if (passedItem) {
        setItem(passedItem);
        setLoading(false);
        return;
      }

      // Se for um ID placeholder, usar mock diretamente
      if (id && id.toString().startsWith('placeholder-')) {
        const found = mockModels.find(m => m._id === id) || mockModels[0];
        setItem(found);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(`/api/listings/${id}`);
        const data = res.data?.listing ? res.data.listing : res.data;
        const safe = data && data.photos && data.photos.length > 0 ? data : null;
        setItem(safe);
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
        // Fallback para mocks locais se não conseguir buscar do backend
        const found = mockModels.find(m => m._id === id) || mockModels[0];
        setItem(found);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, passedItem]);

  // Handler para trocar foto
  const nextModel = () => {
    if (item?.photos && item.photos.length > 0) {
      setActiveIndex((prev) => (prev + 1) % item.photos.length);
    }
  };

  // Handler para clique em WhatsApp
  const handleContactClick = async () => {
    // Apenas fazer tracking se não for placeholder
    if (id && !id.toString().startsWith('placeholder-')) {
    try {
      await axios.post(`/api/analytics/track/click/${id}`, { element: 'whatsapp' });
    } catch (err) {
      console.warn('Falhou tracking de clique:', err?.message);
      }
    }

    // Abrir WhatsApp se número estiver disponível
    const whatsapp = item?.whatsapp || item?.whatsappNumber || item?.contact?.whatsapp;
    if (whatsapp) {
      const normalized = String(whatsapp).replace(/\D/g, '');
      const url = `https://wa.me/${normalized}`;
      window.open(url, '_blank', 'noopener');
    } else {
      alert('Contacto WhatsApp não disponível.');
    }
  };

  if (loading || !item) {
    return <div className="profile-page"><p>A carregar perfil...</p></div>;
  }

  // Derivar lista de fotos simples (string/obj)
  const photos = (item.photos || []).map(p => typeof p === 'string' ? { url: p } : (p.url ? p : { url: p.thumbnail || '/assets/images/placeholder-profile.jpg' }));
  const currentPhoto = photos[activeIndex]?.url || '/assets/images/placeholder-profile.jpg';

  return (
    <div className="profile-page">
      <div className="profile-header">
        {/* Foto hero full-bleed */}
        <div className="main-photo" onClick={nextModel} title={photos.length > 1 ? "Clique para próxima foto" : ""}>
          <img src={currentPhoto} alt={item.name} onError={(e) => { e.target.src = '/assets/images/placeholder-profile.jpg'; }} />
          {photos.length > 1 && (
            <>
              <div className="photo-counter">
                {activeIndex + 1} / {photos.length}
              </div>
              <div className="photo-hint">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </div>
            </>
          )}
        </div>

        {/* Lateral com informações */}
        <aside className="profile-info">
          <h1 className="profile-name">{item.name}</h1>

          <div className="action-buttons">
            <button className="btn btn-primary btn-whatsapp" onClick={handleContactClick}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Contactar WhatsApp
            </button>
          </div>

          {/* Informações do Perfil */}
          <div className="profile-details">
            <div className="detail-item">
              <span className="detail-label">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Cidade
              </span>
              <span className="detail-value">{item.city || 'N/D'}</span>
          </div>

            {item.nationality && (
              <div className="detail-item">
                <span className="detail-label">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                  </svg>
                  Nacionalidade
                </span>
                <span className="detail-value">{item.nationality}</span>
              </div>
            )}
            
            {item.age && (
              <div className="detail-item">
                <span className="detail-label">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                  Idade
                </span>
                <span className="detail-value">{item.age} anos</span>
              </div>
            )}
            
            {item.eyeColor && (
              <div className="detail-item">
                <span className="detail-label">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  Olhos
                </span>
                <span className="detail-value">{item.eyeColor}</span>
              </div>
            )}
            
            {item.height && (
              <div className="detail-item">
                <span className="detail-label">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M15.22 7.59L13.56 6H10.5V2h-1v4H6.44l-1.66 1.59L6.1 9l1.4-1.34V15h2V9.66L10.9 9l1.32-1.41zM18 17h-5.35l2.59-2.59L14 13l-5 5 5 5 1.41-1.41L12.83 19H18c1.1 0 2-.9 2-2v-6h-2v6z"/>
                  </svg>
                  Altura
                </span>
                <span className="detail-value">{item.height}m</span>
              </div>
            )}
            
            {item.weight && (
              <div className="detail-item">
                <span className="detail-label">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm-.5 4H14v2h-2.5v2.5h2v2h-2V16h-2v-2.5h-2v-2h2V9h-2V7h2.5z"/>
                  </svg>
                  Peso
                </span>
                <span className="detail-value">{item.weight}kg</span>
              </div>
            )}

            {item.hairColor && (
              <div className="detail-item">
                <span className="detail-label">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  </svg>
                  Cabelo
                </span>
                <span className="detail-value">{item.hairColor}</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Galeria Horizontal de Fotos */}
      {photos.length > 1 && (
        <div className="photo-gallery-container">
          <h2 className="gallery-title">Galeria de Fotos</h2>
          <div className="photo-gallery-scroll">
          {photos.map((p, idx) => (
              <div
              key={idx}
                className={`photo-card ${idx === activeIndex ? 'active' : ''}`}
              onClick={() => setActiveIndex(idx)}
            >
              <img src={p.url} alt={`${item.name} ${idx + 1}`} onError={(e) => { e.target.src = '/assets/images/placeholder-profile.jpg'; }} />
                <div className="photo-card-overlay">
                  <span className="photo-number">{idx + 1}</span>
                </div>
              </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}