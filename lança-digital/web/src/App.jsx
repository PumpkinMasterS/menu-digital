import { useEffect, useState } from 'react'
import LogoPreview from './LogoPreview.jsx'
import { Logo } from './components/Logo.jsx'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext.jsx'
import LanguageToggle from './components/LanguageToggle.jsx'
import { Globe2, ShoppingCart, LineChart, CheckCircle2, ArrowRight, Mail, MessageCircle } from 'lucide-react'

function AppContent() {
  const { t } = useLanguage()
  const [showPolicy, setShowPolicy] = useState(false)
  const [showLogos, setShowLogos] = useState(window.location.hash === '#logos')
  const [showBackgrounds, setShowBackgrounds] = useState(window.location.hash === '#fundos')
  const [bgStyle, setBgStyle] = useState(localStorage.getItem('bgStyle') || 'aurora')
  const [showProDetails, setShowProDetails] = useState(false)
  const [cookieConsent, setCookieConsent] = useState(() => localStorage.getItem('cookieConsent'))

  // Inicialização condicional de Analytics (GA4/Meta) apenas com consentimento
  useEffect(() => {
    if (cookieConsent !== 'accepted') return

    const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
    const FB_ID = import.meta.env.VITE_FB_PIXEL_ID

    // Google Analytics 4
    if (GA_ID && !window.__gaInitialized) {
      window.__gaInitialized = true
      window.dataLayer = window.dataLayer || []
      function gtag(){window.dataLayer.push(arguments)}
      window.gtag = gtag

      const gaScript = document.createElement('script')
      gaScript.async = true
      gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
      document.head.appendChild(gaScript)

      gtag('js', new Date())
      gtag('config', GA_ID, { anonymize_ip: true })
    }

    // Meta Pixel
    if (FB_ID && !window.__fbqInitialized) {
      window.__fbqInitialized = true
      !(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window,document,'script','https://connect.facebook.net/en_US/fbevents.js')
      window.fbq('init', FB_ID)
      window.fbq('track', 'PageView')
    }
  }, [cookieConsent])

  useEffect(() => {
    const handleHashChange = () => {
      setShowLogos(window.location.hash === '#logos')
      setShowBackgrounds(window.location.hash === '#fundos')
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    try { localStorage.setItem('bgStyle', bgStyle) } catch (e) {}
  }, [bgStyle])

  if (showLogos) {
    return <LogoPreview />
  }

  if (showBackgrounds) {
    const opts = [
      { key: 'aurora', name: 'Aurora + Grain', previewClass: '[background:radial-gradient(240px_circle_at_20%_20%,rgba(56,189,248,0.30),transparent_60%),radial-gradient(200px_circle_at_80%_25%,rgba(16,185,129,0.28),transparent_60%),radial-gradient(220px_circle_at_40%_80%,rgba(99,102,241,0.26),transparent_60%)] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]' },
      { key: 'mesh', name: 'Mesh + Grain', previewClass: '[background:radial-gradient(200px_140px_at_20%_25%,rgba(14,165,233,0.22),transparent_60%),radial-gradient(180px_120px_at_80%_30%,rgba(16,185,129,0.20),transparent_60%),radial-gradient(220px_160px_at_50%_85%,rgba(99,102,241,0.18),transparent_60%)]' },
      { key: 'beams', name: 'Light Beams', previewClass: '[background:linear-gradient(115deg,rgba(14,165,233,0.22),transparent_45%),linear-gradient(245deg,rgba(99,102,241,0.20),transparent_50%),repeating-linear-gradient(115deg,rgba(59,130,246,0.12)_0_2px,transparent_2px_14px)] [mask-image:radial-gradient(ellipse_at_center,black_70%,transparent_100%)]' },
      { key: 'holo', name: 'Holográfico', previewClass: '[background:conic-gradient(from_180deg_at_50%_50%,rgba(99,102,241,0.28),rgba(236,72,153,0.20),rgba(56,189,248,0.22),rgba(16,185,129,0.20),rgba(99,102,241,0.28))] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]' },
      { key: 'paper', name: 'Paper Grain', previewClass: 'bg-white' },
    ]
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <header className="site-header sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-black/5 elevation-2">
          <div className="container flex items-center justify-between py-4">
            <Logo width={120} height={32} className="pulse-on-hover" />
            <nav className="hidden md:flex items-center gap-8">
              <a href="#" className="nav-link">Home</a>
            </nav>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <a href="#" className="btn btn-pulse">Voltar</a>
            </div>
          </div>
        </header>
        <section className="container py-16">
          <h1 className="text-2xl md:text-3xl font-semibold mb-6">Escolher fundo</h1>
          <p className="text-slate-600 mb-8">Seleciona um estilo de fundo moderno para a hero.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {opts.map(opt => (
              <button
                key={opt.key}
                onClick={() => { setBgStyle(opt.key); window.location.hash = '' }}
                className={`group p-5 rounded-2xl border-subtle bg-white text-left hover:shadow-lg transition-all duration-300 ${bgStyle === opt.key ? 'ring-2 ring-emerald-400' : ''}`}
              >
                <div className={`h-32 rounded-xl border-subtle relative overflow-hidden ${opt.previewClass}`}>
                  {opt.key !== 'paper' && (
                    <svg className="absolute inset-0 opacity-[0.10] mix-blend-overlay pointer-events-none" aria-hidden="true">
                      <filter id="noisePrev"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter>
                      <rect width="100%" height="100%" filter="url(#noisePrev)"/>
                    </svg>
                  )}
                </div>
                <div className="mt-3 font-semibold">{opt.name}</div>
                <div className="text-sm text-slate-600">Clique para aplicar</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    )
  }

  useEffect(() => {
    const header = document.querySelector('.site-header')
    const onScroll = () => {
      if (!header) return
      if (window.scrollY > 8) header.classList.add('scrolled')
      else header.classList.remove('scrolled')
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale'))
    if (!('IntersectionObserver' in window) || els.length === 0) return
    
    // Revelar elementos que já estão visíveis na tela
    els.forEach((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('revealed')
      }
    })
    
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (showProDetails) {
      const el = document.getElementById('pro-detalhes')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [showProDetails])

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Skip link para acessibilidade */}
      <a href="#conteudo" className="skip-link">Saltar para o conteúdo</a>
      <div className="mesh-gradient fixed inset-0 opacity-5 pointer-events-none"></div>
      {/* Header */}
      <header className="site-header sticky top-0 z-40 bg-white/70 backdrop-blur border-b border-black/5 elevation-2">
        <div className="container flex items-center justify-between py-4">
          <Logo width={120} height={32} className="pulse-on-hover" />
          <nav className="hidden md:flex items-center gap-8">
            <a href="#servicos" className="nav-link">{t('services')}</a>
            <a href="#processo" className="nav-link">{t('process')}</a>
            <a href="#planos" className="nav-link">{t('plans')}</a>
            <a href="#faq" className="nav-link">{t('faq')}</a>
            <a href="#fundos" className="nav-link">Fundos</a>
            <a href="#contacto" className="nav-link">{t('contact')}</a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <a href="#contacto" className="btn btn-pulse">{t('getQuote')}</a>
          </div>
        </div>
      </header>
 
      {/* Main landmark */}
      <main id="conteudo" tabIndex={-1}>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 min-h-[70vh]">
        {/* Background: Aurora gradient + grain */}
        <div className="absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [background:radial-gradient(1200px_circle_at_10%_10%,rgba(56,189,248,0.25),transparent_60%),radial-gradient(900px_circle_at_90%_20%,rgba(16,185,129,0.25),transparent_60%),radial-gradient(800px_circle_at_30%_80%,rgba(99,102,241,0.25),transparent_60%)]"></div>
        <svg className="absolute inset-0 -z-10 opacity-[0.06] mix-blend-overlay pointer-events-none" aria-hidden="true">
          <filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
        </svg>
        
        <div className="container relative z-10 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="reveal-left">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block reveal reveal-delay-1">🇵🇹 Built in Portugal</p>
            <h1 className="text-display text-primary mb-6 reveal reveal-delay-2 text-balance">{t('heroTitle')}</h1>
            <p className="text-body-large text-secondary reveal reveal-delay-3 text-pretty">{t('heroSubtitle')}</p>
            <div className="mt-8 flex items-center gap-4 reveal reveal-delay-4">
              <a href="#contacto" className="btn btn-ripple">{t('startProject')}</a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-slate-600 reveal reveal-delay-4">
              <span className="px-3 py-1 rounded-full border-subtle bg-white shadow-soft glow-on-hover">Entrega média 5 dias úteis</span>
              <span className="px-3 py-1 rounded-full border-subtle bg-white shadow-soft glow-on-hover">+20 projetos entregues</span>
              <span className="px-3 py-1 rounded-full border-subtle bg-white shadow-soft glow-on-hover">SEO e Analytics incluídos</span>
            </div>
          </div>
          <div className="relative p-6 rounded-2xl border-subtle shadow-soft reveal-right">
            <svg className="w-full h-auto" viewBox="0 0 400 250" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="250" rx="20" fill="#F8FAFC"/>
              <path d="M200 50C150 100 250 150 200 200" stroke="#0EA5E9" strokeWidth="4" strokeDasharray="10 5"/>
              <circle cx="200" cy="125" r="40" fill="#0EA5E9" opacity="0.2"/>
              <path d="M180 110L220 140L180 170" stroke="#0EA5E9" strokeWidth="4" strokeLinecap="round"/>
              <text x="50" y="40" fontSize="24" fill="#0F172A">Lança Digital</text>
                <text x="50" y="220" fontSize="16" fill="#475569">Ilustração de lançamento</text>
            </svg>
            <div className="absolute -top-3 left-6 text-[11px] px-2 py-1 rounded-full border-subtle bg-white shadow-soft">Ilustração conceitual</div>
          </div>
        </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container py-16 border-t border-black/5">
        <h2 className="text-headline text-primary text-center reveal text-balance">{t('socialProofTitle')}</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[
            { name: 'Cliente A', quote: 'Excelente serviço, landing page convertendo leads diariamente!' },
            { name: 'Cliente B', quote: 'Rápido e profissional, recomendo para qualquer negócio.' },
            { name: 'Cliente C', quote: 'Design clean e funcional, superou expectativas.' },
          ].map((testimonial, i) => (
            <div key={i} className={`p-6 rounded-xl shadow-md elevation-3 reveal-scale reveal-delay-${i + 1} card-hover`}>
              <p className="text-sm text-slate-600 italic">"{testimonial.quote}"</p>
              <div className="mt-4 text-base font-semibold">{testimonial.name}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-8 opacity-50 flex-wrap">
          <svg width="80" height="40" viewBox="0 0 100 50" fill="currentColor"><rect width="100" height="50" rx="5"/></svg>
          <svg width="80" height="40" viewBox="0 0 100 50" fill="currentColor"><circle cx="50" cy="25" r="25"/></svg>
          <svg width="80" height="40" viewBox="0 0 100 50" fill="currentColor"><path d="M0 0L100 50H0Z"/></svg>
          <svg width="80" height="40" viewBox="0 0 100 50" fill="currentColor"><rect width="100" height="50" rx="25"/></svg>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="section-bg container py-20 border-t border-black/5 reveal">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold">{t('servicesTitle')}</h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">{t('servicesSubtitle')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
          {[
            { title: t('webDevelopment'), desc: t('webDevDesc'), icon: <Globe2 className="w-6 h-6 text-emerald-600" aria-hidden="true" /> },
            { title: t('ecommerce'), desc: t('ecommerceDesc'), icon: <ShoppingCart className="w-6 h-6 text-emerald-600" aria-hidden="true" /> },
            { title: t('seo'), desc: t('seoDesc'), icon: <LineChart className="w-6 h-6 text-emerald-600" aria-hidden="true" /> },
          ].map((service, k) => (
            <div key={k} className="group p-6 sm:p-8 rounded-2xl border-subtle shadow-soft ring-1 ring-black/5 bg-white hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="text-3xl mb-4">{service.icon}</div>
              <div className="text-xl font-semibold mb-3">{service.title}</div>
              <p className="text-slate-600 text-[15px] sm:text-base">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Processo */}
      <section id="processo" className="section-bg container py-20 border-t border-black/5 reveal">
        <h2 className="text-2xl md:text-3xl font-semibold">Processo</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {['Briefing','Copy & Wireframe','Implementação','QA & Lançamento'].map((s, i) => (
            <div key={i} className="p-6 rounded-2xl border-subtle ring-1 ring-black/5 bg-white shadow-soft">
              <div className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                {String(i+1).padStart(2,'0')}
              </div>
              <div className="mt-2 text-base font-semibold">{s}</div>
              <p className="mt-2 text-[13px] sm:text-sm text-slate-600">Etapas claras para entregar rápido com qualidade.</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="container py-16 md:py-20 border-t border-black/5 reveal">
        <h2 className="text-2xl md:text-3xl font-semibold">Planos</h2>
        <p className="mt-2 text-sm text-slate-500">Preços sem IVA. Valores indicativos; proposta final depende de requisitos e conteúdos.</p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {[
            {
              name: 'Essencial',
              price: 'Desde 100€ / mês*',
              desc: 'Para marcar presença online sem complicação — ideal para restaurantes, lavandarias e lojas de serviços.',
              features: [
                '✔️ Site simples e funcional (até 3 páginas)',
                '✔️ Design mobile‑first',
                '✔️ Horários, localização e contactos visíveis',
                '✔️ Botão de WhatsApp para pedidos/reservas',
                '✔️ Ligações a Instagram e Google Maps',
                '✔️ Entrega rápida',
              ],
            },
            {
              name: 'Profissional',
              price: 'Desde 250€ / mês*',
              badge: 'Mais vendido',
              desc: 'Para negócios que querem destacar‑se e converter: reservas, pedidos e orçamentos com facilidade.',
              features: [
                'Inclui tudo do Essencial +',
                '✔️ Site completo (até 6 páginas)',
                '✔️ Landing page para campanhas (reservas, pedidos, orçamentos)',
                '✔️ SEO básico (aparecer no Google)',
                '✔️ Secção dedicada: Menu digital (restaurantes) / Preçário (lavandarias) / Serviços (lojas)',
                '✔️ Integração com WhatsApp e Email Marketing',
                '✔️ Reviews e destaques (Google/TripAdvisor)',
                '✔️ Suporte por 1 mês',
              ],
            },
            {
              name: 'Corporate',
              price: 'Desde 350€ / mês*',
              desc: 'Para empresas que precisam de impacto e resultados sérios, com integrações e personalização à medida.',
              features: [
                'Inclui tudo do Profissional +',
                '✔️ Páginas ilimitadas',
                '✔️ Design premium e 100% personalizado',
                '✔️ Estratégia de SEO inicial + Google Analytics',
                '✔️ Integrações avançadas: reservas online, CRM, Chatbot, formulários à medida',
                '✔️ Loja online (opcional): vales/ofertas ou produtos (até 20)',
                '✔️ Suporte estendido (3 meses)',
              ],
            },
            ].map((pl, i) => (
              <div key={i} className={`p-5 sm:p-6 rounded-2xl border-subtle bg-white ring-1 ${pl.badge ? 'shadow-soft ring-emerald-200' : 'ring-black/5'} flex flex-col`}>
                {pl.badge && (
                  <div className="text-[10px] inline-block mb-3 px-2 py-1 rounded-full border-subtle bg-white shadow-soft">
                    {pl.badge}
                  </div>
                )}
                <div className="text-base font-semibold">{pl.name}</div>
                <div className="mt-1 text-2xl sm:text-3xl font-semibold">{pl.price}</div>
                {pl.name === 'Profissional' && (
                  <div className="mt-0.5 text-[12px] font-medium text-emerald-700">Inclui Essencial +</div>
                )}
                {pl.desc && <p className="mt-1 text-sm text-slate-600 text-pretty">{pl.desc}</p>}
                <ul className="mt-3 text-[15px] sm:text-sm leading-relaxed md:leading-snug text-slate-600 space-y-2 sm:space-y-1 list-none pl-0 flex-1">
                  {pl.features.map((x, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span className="flex-1">{x}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <a href="#contacto" className="btn w-full">Pedir Orçamento <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" /></a>
                  {pl.name === 'Profissional' && (
                    <button
                      type="button"
                      onClick={() => setShowProDetails((v) => !v)}
                      className="btn btn-ghost w-full"
                      aria-expanded={showProDetails}
                      aria-controls="pro-detalhes"
                    >
                      {showProDetails ? 'Fechar detalhes' : 'Ver detalhes'}
                    </button>
                  )}
                 </div>
               </div>
             ))}
           </div>
           <p className="mt-3 text-xs text-slate-500">* Valores “desde” por mês; indicativos e sem IVA. A proposta final depende de requisitos, integrações e conteúdos.</p>
          {showProDetails && (
            <div id="pro-detalhes" className="mt-6 md:mt-8 p-5 md:p-6 rounded-2xl border-subtle bg-white scroll-mt-24 pb-28 md:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-lg md:text-xl font-semibold">Plano Profissional — Detalhes por setor</h3>
                <button type="button" onClick={() => setShowProDetails(false)} className="btn btn-ghost px-3 py-1" aria-label="Fechar detalhes do plano Profissional">Fechar</button>
              </div>
              <p className="mt-2 text-sm text-slate-600 text-pretty">Inclui tudo do Essencial e adiciona funcionalidades para aumentar conversões, com conteúdos ajustados a restaurantes, lavandarias e lojas de serviços.</p>

              {/* tabs existentes aqui */}

              <div className="mt-5">
                <div className="text-sm font-semibold">Add‑ons opcionais</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-3 py-1 text-xs rounded-full border-subtle bg-slate-50">Reservas online avançadas</span>
                  <span className="px-3 py-1 text-xs rounded-full border-subtle bg-slate-50">Programa de fidelização</span>
                  <span className="px-3 py-1 text-xs rounded-full border-subtle bg-slate-50">Integrações POS / Glovo / UberEats</span>
                  <span className="px-3 py-1 text-xs rounded-full border-subtle bg-slate-50">Sessão de fotos</span>
                  <span className="px-3 py-1 text-xs rounded-full border-subtle bg-slate-50">Gestão de redes sociais</span>
                  <span className="px-3 py-1 text-xs rounded-full border-subtle bg-slate-50">Copywriting extra</span>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <a href="#contacto" className="btn w-full sm:w-auto" aria-label="Solicitar contacto para plano Profissional">Quero o Profissional</a>
                <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={() => { setShowProDetails(false); location.hash = '#planos' }}>Voltar</button>
              </div>
            </div>
          )}
          {showProDetails && (
            <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-black/5 bg-white/95 backdrop-blur px-4 py-3">
              <a href="#contacto" className="btn w-full">Quero o Profissional</a>
            </div>
          )}
         </section>

      {/* FAQ */}
      <section id="faq" className="section-bg container py-20 border-t border-black/5 reveal">
        <h2 className="text-2xl md:text-3xl font-semibold">FAQ</h2>
        <div className="mt-6 space-y-4">
          {[
            { q: 'O que é uma landing page?', a: 'É uma página com objetivo de conversão (lead, venda, agendamento).' },
            { q: 'Qual o prazo médio?', a: '5 dias úteis para o plano Recomendado, dependendo de conteúdos.' },
            { q: 'Trabalham com sites multipágina?', a: 'Sim, projetos institucionais completos sob consulta.' },
            { q: 'Inclui SEO e Analytics?', a: 'Sim, configuramos indexação básica e tracking.' },
          ].map((f, i) => (
            <div key={i} className="p-5 rounded-xl border-subtle bg-white">
              <div className="font-semibold">{f.q}</div>
              <p className="mt-1 text-sm text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="section-bg container py-20 border-t border-black/5 reveal">
        <div className="p-8 rounded-2xl border-subtle bg-white shadow-soft max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold">Vamos lançar a sua landing page?</h2>
          <p className="mt-2 text-slate-600">Envie uma mensagem e respondemos hoje.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <a href="https://wa.me/351912345678" className="btn inline-flex items-center"><MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" /> Falar no WhatsApp</a>
            <a href="mailto:info@lancadigital.pt" className="btn btn-ghost inline-flex items-center"><Mail className="w-4 h-4 mr-2" aria-hidden="true" /> Enviar Email</a>
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200">
        <div className="container py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <Logo width={140} height={36} />
              <p className="mt-4 text-slate-600 max-w-md">
                {t('heroSubtitle')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('services')}</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><a href="#servicos" className="hover:text-slate-900 transition">{t('webDevelopment')}</a></li>
                <li><a href="#servicos" className="hover:text-slate-900 transition">{t('ecommerce')}</a></li>
                <li><a href="#servicos" className="hover:text-slate-900 transition">{t('seo')}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('contact')}</h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>info@lancadigital.pt</li>
                <li>+351 123 456 789</li>
                <li>Porto, Portugal</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500">
              © 2025 Lança Digital. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <button 
                onClick={() => setShowPolicy(true)}
                className="hover:text-slate-900 transition"
              >
                {t('privacyPolicy')}
              </button>
              <button 
                onClick={() => setShowPolicy(true)}
                className="hover:text-slate-900 transition"
              >
                {t('terms')}
              </button>
              <button 
                onClick={() => setShowPolicy(true)}
                className="hover:text-slate-900 transition"
              >
                {t('cookies')}
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Banner de Cookies */}
      {cookieConsent == null && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t border-black/10 bg-white/95 backdrop-blur px-4 py-3" role="region" aria-label="Preferências de cookies" aria-live="polite">
          <div className="container flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              Utilizamos cookies para funcionalidades essenciais e métricas agregadas. Pode aceitar, recusar ou gerir preferências.
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => { localStorage.setItem('cookieConsent','rejected'); setCookieConsent('rejected'); }}>Recusar</button>
              <button className="btn" onClick={() => { localStorage.setItem('cookieConsent','accepted'); setCookieConsent('accepted'); }}>Aceitar</button>
              <button className="btn btn-ghost" onClick={() => setShowPolicy(true)}>Gerir</button>
            </div>
          </div>
        </div>
      )}

      {/* Política de Privacidade Modal */}
      {showPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="policy-title">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
              <div id="policy-title" className="text-lg font-semibold">{t('privacyPolicy')} & {t('terms')}</div>
              <button className="btn btn-ghost px-3 py-1" onClick={() => setShowPolicy(false)}>Fechar</button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-700 max-h-[60vh] overflow-auto">
              <div>
                <h3 className="font-semibold mb-2">{t('privacyPolicy')}</h3>
                <p>Respeitamos a sua privacidade. Utilizamos cookies apenas para funcionalidades essenciais e métricas agregadas.</p>
                <p className="mt-2">Dados submetidos via formulários são usados exclusivamente para contacto e proposta comercial. Não partilhamos dados com terceiros sem consentimento.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('terms')}</h3>
                <p>Ao utilizar este website, concorda com os nossos termos de serviço. Os serviços são prestados de acordo com as condições acordadas em proposta comercial.</p>
                <p className="mt-2">Reservamo-nos o direito de alterar estes termos a qualquer momento, com notificação prévia.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">{t('cookies')}</h3>
                <p>Utilizamos cookies essenciais para o funcionamento do website e cookies analíticos para melhorar a experiência do utilizador.</p>
                <p className="mt-2">Pode gerir as suas preferências de cookies nas definições do seu navegador.</p>
              </div>
              <p className="text-xs text-slate-500 mt-4">Pode solicitar eliminação/alteração dos seus dados a qualquer momento contactando-nos através de info@lancadigital.pt</p>
            </div>
            <div className="p-6 border-t border-black/5 flex items-center justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => { localStorage.setItem('cookieConsent','rejected'); setCookieConsent('rejected'); setShowPolicy(false); }}>Recusar</button>
              <button className="btn" onClick={() => { localStorage.setItem('cookieConsent','accepted'); setCookieConsent('accepted'); setShowPolicy(false); }}>Aceitar</button>
              <button className="btn btn-ghost" onClick={() => setShowPolicy(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
