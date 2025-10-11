import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

// Traduções inline para desenvolvimento
const resources = {
  pt: {
    translation: {
      // Navegação
      nav: {
        home: 'Início',
        cities: 'Cidades',
        profile: 'Perfil',
        login: 'Entrar',
        register: 'Registrar',
        logout: 'Sair'
      },
      // Página inicial
      home: {
        title: 'Encontre o Apartado Perfeito',
        subtitle: 'Descubra apartados verificados em toda Portugal',
        searchPlaceholder: 'Pesquisar por cidade...',
        searchButton: 'Pesquisar',
        featuredTitle: 'Apartados em Destaque',
        viewAll: 'Ver Todos'
      },
      // Autenticação
      auth: {
        login: 'Entrar',
        register: 'Registrar',
        email: 'Email',
        password: 'Palavra-passe',
        confirmPassword: 'Confirmar Palavra-passe',
        name: 'Nome',
        age: 'Idade',
        forgotPassword: 'Esqueceu a palavra-passe?',
        noAccount: 'Não tem conta?',
        hasAccount: 'Já tem conta?',
        loginSuccess: 'Login realizado com sucesso!',
        registerSuccess: 'Registo realizado com sucesso!',
        loginError: 'Erro no login. Verifique as suas credenciais.',
        registerError: 'Erro no registo. Tente novamente.'
      },
      // Filtros
      filters: {
        city: 'Cidade',
        allCities: 'Todas as Cidades',
        search: 'Pesquisar',
        ageRange: 'Faixa Etária',
        priceRange: 'Faixa de Preço',
        category: 'Categoria',
        allCategories: 'Todas as Categorias',
        verified: 'Apenas Verificados',
        sortBy: 'Ordenar por',
        newest: 'Mais Recentes',
        oldest: 'Mais Antigos',
        priceAsc: 'Preço Crescente',
        priceDesc: 'Preço Decrescente',
        apply: 'Aplicar Filtros',
        clear: 'Limpar Filtros'
      },
      // Listagens
      listings: {
        noResults: 'Nenhum resultado encontrado',
        loading: 'A carregar...',
        verified: 'Verificado',
        premium: 'Premium',
        standard: 'Standard',
        viewDetails: 'Ver Detalhes',
        contact: 'Contactar',
        price: 'Preço',
        age: 'Idade',
        years: 'anos'
      },
      // Perfil
      profile: {
        title: 'Meu Perfil',
        editProfile: 'Editar Perfil',
        myListings: 'Meus Anúncios',
        favorites: 'Favoritos',
        settings: 'Configurações',
        language: 'Idioma',
        notifications: 'Notificações',
        privacy: 'Privacidade',
        deleteAccount: 'Eliminar Conta'
      },
      // Geral
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        delete: 'Eliminar',
        confirm: 'Confirmar',
        back: 'Voltar',
        next: 'Próximo',
        previous: 'Anterior',
        loading: 'A carregar...',
        error: 'Erro',
        success: 'Sucesso',
        warning: 'Aviso',
        info: 'Informação'
      }
    }
  },
  en: {
    translation: {
      // Navigation
      nav: {
        home: 'Home',
        cities: 'Cities',
        profile: 'Profile',
        login: 'Login',
        register: 'Register',
        logout: 'Logout'
      },
      // Home page
      home: {
        title: 'Find the Perfect Apartado',
        subtitle: 'Discover verified apartados across Portugal',
        searchPlaceholder: 'Search by city...',
        searchButton: 'Search',
        featuredTitle: 'Featured Apartados',
        viewAll: 'View All'
      },
      // Authentication
      auth: {
        login: 'Login',
        register: 'Register',
        email: 'Email',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        name: 'Name',
        age: 'Age',
        forgotPassword: 'Forgot password?',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        loginSuccess: 'Login successful!',
        registerSuccess: 'Registration successful!',
        loginError: 'Login error. Please check your credentials.',
        registerError: 'Registration error. Please try again.'
      },
      // Filters
      filters: {
        city: 'City',
        allCities: 'All Cities',
        search: 'Search',
        ageRange: 'Age Range',
        priceRange: 'Price Range',
        category: 'Category',
        allCategories: 'All Categories',
        verified: 'Verified Only',
        sortBy: 'Sort by',
        newest: 'Newest',
        oldest: 'Oldest',
        priceAsc: 'Price Ascending',
        priceDesc: 'Price Descending',
        apply: 'Apply Filters',
        clear: 'Clear Filters'
      },
      // Listings
      listings: {
        noResults: 'No results found',
        loading: 'Loading...',
        verified: 'Verified',
        premium: 'Premium',
        standard: 'Standard',
        viewDetails: 'View Details',
        contact: 'Contact',
        price: 'Price',
        age: 'Age',
        years: 'years old'
      },
      // Profile
      profile: {
        title: 'My Profile',
        editProfile: 'Edit Profile',
        myListings: 'My Listings',
        favorites: 'Favorites',
        settings: 'Settings',
        language: 'Language',
        notifications: 'Notifications',
        privacy: 'Privacy',
        deleteAccount: 'Delete Account'
      },
      // Common
      common: {
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        confirm: 'Confirm',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information'
      }
    }
  },
  es: {
    translation: {
      // Navegación
      nav: {
        home: 'Inicio',
        cities: 'Ciudades',
        profile: 'Perfil',
        login: 'Iniciar Sesión',
        register: 'Registrarse',
        logout: 'Cerrar Sesión'
      },
      // Página de inicio
      home: {
        title: 'Encuentra el Apartado Perfecto',
        subtitle: 'Descubre apartados verificados en todo Portugal',
        searchPlaceholder: 'Buscar por ciudad...',
        searchButton: 'Buscar',
        featuredTitle: 'Apartados Destacados',
        viewAll: 'Ver Todos'
      },
      // Autenticación
      auth: {
        login: 'Iniciar Sesión',
        register: 'Registrarse',
        email: 'Email',
        password: 'Contraseña',
        confirmPassword: 'Confirmar Contraseña',
        name: 'Nombre',
        age: 'Edad',
        forgotPassword: '¿Olvidaste tu contraseña?',
        noAccount: '¿No tienes cuenta?',
        hasAccount: '¿Ya tienes cuenta?',
        loginSuccess: '¡Inicio de sesión exitoso!',
        registerSuccess: '¡Registro exitoso!',
        loginError: 'Error en el inicio de sesión. Verifica tus credenciales.',
        registerError: 'Error en el registro. Inténtalo de nuevo.'
      },
      // Filtros
      filters: {
        city: 'Ciudad',
        allCities: 'Todas las Ciudades',
        search: 'Buscar',
        ageRange: 'Rango de Edad',
        priceRange: 'Rango de Precio',
        category: 'Categoría',
        allCategories: 'Todas las Categorías',
        verified: 'Solo Verificados',
        sortBy: 'Ordenar por',
        newest: 'Más Recientes',
        oldest: 'Más Antiguos',
        priceAsc: 'Precio Ascendente',
        priceDesc: 'Precio Descendente',
        apply: 'Aplicar Filtros',
        clear: 'Limpiar Filtros'
      },
      // Listados
      listings: {
        noResults: 'No se encontraron resultados',
        loading: 'Cargando...',
        verified: 'Verificado',
        premium: 'Premium',
        standard: 'Estándar',
        viewDetails: 'Ver Detalles',
        contact: 'Contactar',
        price: 'Precio',
        age: 'Edad',
        years: 'años'
      },
      // Perfil
      profile: {
        title: 'Mi Perfil',
        editProfile: 'Editar Perfil',
        myListings: 'Mis Anuncios',
        favorites: 'Favoritos',
        settings: 'Configuración',
        language: 'Idioma',
        notifications: 'Notificaciones',
        privacy: 'Privacidad',
        deleteAccount: 'Eliminar Cuenta'
      },
      // Común
      common: {
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        delete: 'Eliminar',
        confirm: 'Confirmar',
        back: 'Volver',
        next: 'Siguiente',
        previous: 'Anterior',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        warning: 'Advertencia',
        info: 'Información'
      }
    }
  }
}

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt',
    debug: false,
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n