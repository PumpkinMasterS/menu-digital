import { Loader } from '@googlemaps/js-api-loader';

// Configuração centralizada do Google Maps
const GOOGLE_MAPS_CONFIG = {
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  version: 'weekly',
  libraries: ['drawing', 'geometry'],
  id: '__googleMapsScriptId',
};

// Singleton do loader - garante que seja criado apenas uma vez
let loaderInstance: Loader | null = null;

const getGoogleMapsLoader = (): Loader => {
  if (!loaderInstance) {
    loaderInstance = new Loader(GOOGLE_MAPS_CONFIG);
  }
  return loaderInstance;
};

// Promise para controlar carregamento único
let loadPromise: Promise<typeof google> | null = null;

export const loadGoogleMaps = async (): Promise<typeof google> => {
  if (!loadPromise) {
    const loader = getGoogleMapsLoader();
    loadPromise = loader.load();
  }
  return loadPromise;
};

export const isGoogleMapsConfigured = (): boolean => {
  return !!GOOGLE_MAPS_CONFIG.apiKey;
};

export const getDefaultMapConfig = () => ({
  center: { lat: 38.7223, lng: -9.1393 }, // Lisboa
  zoom: 13,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
});

export default {
  loadGoogleMaps,
  isGoogleMapsConfigured,
  getDefaultMapConfig,
}; 