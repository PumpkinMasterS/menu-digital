import { createContext, useContext, useState } from 'react';

// Textos em português e inglês
const translations = {
  pt: {
    // Header
    services: 'Serviços',
    process: 'Processo',
    plans: 'Planos',
    portfolio: 'Portfólio',
    faq: 'FAQ',
    contact: 'Contacto',
    getQuote: 'Pedir Orçamento',
    
    // Footer/Legal
    privacyPolicy: 'Política de Privacidade',
    terms: 'Termos',
    cookies: 'Cookies',
    
    // Hero
    heroTitle: 'Lançamos o seu negócio digital',
    heroSubtitle: 'Criamos websites modernos, rápidos e otimizados que convertem visitantes em clientes. Do design ao lançamento, cuidamos de tudo.',
    startProject: 'Iniciar Projeto',
    seePortfolio: 'Ver Portfólio',
    
    // Social Proof
    socialProofTitle: 'Confiança de empresas em crescimento',
    
    // Services
    servicesTitle: 'Os nossos serviços',
    servicesSubtitle: 'Soluções completas para o seu sucesso digital',
    webDevelopment: 'Desenvolvimento Web',
    webDevDesc: 'Websites responsivos e otimizados',
    ecommerce: 'E-commerce',
    ecommerceDesc: 'Lojas online que vendem',
    seo: 'SEO & Marketing',
    seoDesc: 'Visibilidade e tráfego qualificado',
    
    // Process
    processTitle: 'Como trabalhamos',
    processSubtitle: 'Um processo simples e eficaz',
    step1: 'Análise',
    step1Desc: 'Entendemos o seu negócio e objetivos',
    step2: 'Design',
    step2Desc: 'Criamos um design único e atrativo',
    step3: 'Desenvolvimento',
    step3Desc: 'Desenvolvemos com as melhores tecnologias',
    step4: 'Lançamento',
    step4Desc: 'Colocamos o seu projeto online',
    
    // Plans
    plansTitle: 'Planos e preços',
    plansSubtitle: 'Escolha o plano ideal para o seu negócio',
    basic: 'Básico',
    professional: 'Profissional',
    premium: 'Premium',
    choosePlan: 'Escolher Plano',
    
    // Portfolio
    portfolioTitle: 'Projetos realizados',
    portfolioSubtitle: 'Alguns dos nossos trabalhos recentes',
    
    // FAQ
    faqTitle: 'Perguntas frequentes',
    faqSubtitle: 'Esclarecemos as suas dúvidas',
    
    // Contact
    contactTitle: 'Vamos conversar?',
    contactSubtitle: 'Entre em contacto connosco e vamos discutir o seu projeto',
    phone: 'Telefone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    
    // Footer
    footerText: 'Lança Digital - Soluções digitais que impulsionam o seu negócio',
    
    // Common
    learnMore: 'Saber Mais',
    close: 'Fechar'
  },
  
  en: {
    // Header
    services: 'Services',
    process: 'Process',
    plans: 'Plans',
    portfolio: 'Portfolio',
    faq: 'FAQ',
    contact: 'Contact',
    getQuote: 'Get Quote',
    
    // Footer/Legal
    privacyPolicy: 'Privacy Policy',
    terms: 'Terms',
    cookies: 'Cookies',
    
    // Hero
    heroTitle: 'We launch your digital business',
    heroSubtitle: 'We create modern, fast and optimized websites that convert visitors into customers. From design to launch, we take care of everything.',
    startProject: 'Start Project',
    seePortfolio: 'See Portfolio',
    
    // Social Proof
    socialProofTitle: 'Trusted by growing companies',
    
    // Services
    servicesTitle: 'Our services',
    servicesSubtitle: 'Complete solutions for your digital success',
    webDevelopment: 'Web Development',
    webDevDesc: 'Responsive and optimized websites',
    ecommerce: 'E-commerce',
    ecommerceDesc: 'Online stores that sell',
    seo: 'SEO & Marketing',
    seoDesc: 'Visibility and qualified traffic',
    
    // Process
    processTitle: 'How we work',
    processSubtitle: 'A simple and effective process',
    step1: 'Analysis',
    step1Desc: 'We understand your business and goals',
    step2: 'Design',
    step2Desc: 'We create a unique and attractive design',
    step3: 'Development',
    step3Desc: 'We develop with the best technologies',
    step4: 'Launch',
    step4Desc: 'We put your project online',
    
    // Plans
    plansTitle: 'Plans and pricing',
    plansSubtitle: 'Choose the ideal plan for your business',
    basic: 'Basic',
    professional: 'Professional',
    premium: 'Premium',
    choosePlan: 'Choose Plan',
    
    // Portfolio
    portfolioTitle: 'Completed projects',
    portfolioSubtitle: 'Some of our recent work',
    
    // FAQ
    faqTitle: 'Frequently asked questions',
    faqSubtitle: 'We clarify your doubts',
    
    // Contact
    contactTitle: 'Let\'s talk?',
    contactSubtitle: 'Contact us and let\'s discuss your project',
    phone: 'Phone',
    email: 'Email',
    whatsapp: 'WhatsApp',
    
    // Footer
    footerText: 'Lança Digital - Digital solutions that boost your business',
    
    // Common
    learnMore: 'Learn More',
    close: 'Close'
  }
};

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('pt');
  
  const t = (key) => {
    return translations[language][key] || key;
  };
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'pt' ? 'en' : 'pt');
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};