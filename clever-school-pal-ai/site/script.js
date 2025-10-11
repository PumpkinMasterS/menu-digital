// Connect AI — interações e acessibilidade melhoradas
(function(){
  'use strict';

  // Correção de layout - garantir que o documento ocupe toda a largura do viewport
  const fixLayout = () => {
    const html = document.documentElement;
    const body = document.body;
    html.style.width = '100vw';
    html.style.overflowX = 'hidden';
    body.style.width = '100vw';
  };
  
  // Aplicar correção imediatamente e após carregamento
  fixLayout();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixLayout);
  }

  // Atualizar ano
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Tema (dark/light) com persistência
  const root = document.documentElement;
  const themeBtn = document.querySelector('.theme-toggle');
  const storageKey = 'theme';
  const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const savedTheme = localStorage.getItem(storageKey);
  let theme = savedTheme || 'light'; // força claro por defeito quando não há preferência

  const applyTheme = (t)=>{
    root.setAttribute('data-theme', t);
    if(themeBtn){
      themeBtn.setAttribute('aria-pressed', String(t==='dark'));
      themeBtn.textContent = t==='dark' ? '☀️' : '🌙';
      themeBtn.title = t==='dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro';
    }
  };
  applyTheme(theme);

  themeBtn?.addEventListener('click', ()=>{
    theme = theme==='dark' ? 'light' : 'dark';
    localStorage.setItem(storageKey, theme);
    applyTheme(theme);
  });
  if(mql && !savedTheme){
    mql.addEventListener?.('change', (e)=>{
      theme = e.matches ? 'dark' : 'light';
      applyTheme(theme);
    });
  }

  // Menu mobile
  const toggle = document.querySelector('.nav__toggle');
  const list = document.querySelector('.nav__list');
  if(toggle && list){
    toggle.addEventListener('click', ()=>{
      const open = list.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    // Fechar ao clicar num link de ancora
    list.querySelectorAll('a[href^="#"]').forEach(a=>{
      a.addEventListener('click', ()=>{
        list.classList.remove('is-open');
        toggle.setAttribute('aria-expanded','false');
      });
    });
  }

  // Botão voltar ao topo com debouncing
  const back = document.querySelector('.back-to-top');
  let scrollTimer = null;
  const onScroll = ()=>{
    if(!back) return;
    if(scrollTimer) return; // Skip if already scheduled
    scrollTimer = requestAnimationFrame(()=>{
      if(window.scrollY > 500) back.classList.add('is-visible');
      else back.classList.remove('is-visible');
      scrollTimer = null;
    });
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  back?.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));

  // Tornar imagens/ícones clicáveis para voltar ao topo
  document.querySelectorAll('.brand__logo, .hero__mockup, .feature__icon, footer .brand__logo').forEach(el => {
    if(!el) return;
    el.style.cursor = 'pointer';
    el.setAttribute('role','button');
    el.setAttribute('tabindex','0');
    const goTop = (e)=>{ e?.preventDefault?.(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    el.addEventListener('click', goTop);
    el.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' '){ goTop(e); } });
  });

  // Slider acessível
  const slider = document.querySelector('.slider');
  if(slider){
    const slides = Array.from(slider.querySelectorAll('.slide'));
    const prev = slider.querySelector('.slider__prev');
    const next = slider.querySelector('.slider__next');
    const dotsWrap = slider.querySelector('.slider__dots');
    let idx = Math.max(0, slides.findIndex(s=>s.classList.contains('is-active')));
    let timer = null;

    const renderDots = ()=>{
      if(!dotsWrap) return;
      dotsWrap.innerHTML = '';
      slides.forEach((_,i)=>{
        const b = document.createElement('button');
        b.setAttribute('role','tab');
        b.setAttribute('aria-label', `Ir para slide ${i+1}`);
        b.setAttribute('aria-selected', i===idx? 'true':'false');
        b.addEventListener('click', ()=>{ go(i); stop(); });
        dotsWrap.appendChild(b);
      });
    };

    const setA11y = ()=>{
      slides.forEach((s,i)=>{
        s.setAttribute('aria-hidden', i===idx? 'false':'true');
        s.setAttribute('tabindex', i===idx? '0':'-1');
      });
      if(dotsWrap){
        dotsWrap.querySelectorAll('button').forEach((b,i)=>{
          b.setAttribute('aria-selected', i===idx? 'true':'false');
        });
      }
    };

    const go = (to)=>{
      slides[idx].classList.remove('is-active');
      idx = (to + slides.length) % slides.length;
      slides[idx].classList.add('is-active');
      setA11y();
    };

    const start = ()=>{
      if(slider.dataset.autoplay === 'true' && !timer && document.visibilityState === 'visible'){
        timer = setInterval(()=> go(idx+1), 6000);
      }
    };
    const stop = ()=>{ if(timer){ clearInterval(timer); timer=null; } };

    prev?.addEventListener('click', ()=>{ go(idx-1); stop(); });
    next?.addEventListener('click', ()=>{ go(idx+1); stop(); });

    slider.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowLeft'){ e.preventDefault(); go(idx-1); stop(); }
      if(e.key==='ArrowRight'){ e.preventDefault(); go(idx+1); stop(); }
    });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', ()=>{ if(!slider.contains(document.activeElement)) start(); });

    renderDots();
    setA11y();
    start();
    
    // Pause autoplay when page is not visible
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'hidden') stop();
      else start();
    });
  }

  // Botão de login placeholder
  const placeholderBtn = document.querySelector('[data-placeholder="true"]');
  if(placeholderBtn){
    // Live region para leitores de ecrã
    let live = document.getElementById('live-region');
    if(!live){
      live = document.createElement('div');
      live.id = 'live-region';
      live.setAttribute('aria-live','polite');
      Object.assign(live.style, {position:'absolute', width:'1px', height:'1px', overflow:'hidden', clip:'rect(1px, 1px, 1px, 1px)', whiteSpace:'nowrap'});
      document.body.appendChild(live);
    }
    placeholderBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      live.textContent = 'Área de login em breve. Obrigado pelo interesse!';
      alert('Área de login em breve! Em breve ligaremos à webapp.');
    });
  }
  // DEMONSTRAÇÃO INTERATIVA — Chat
  (function(){
    const form = document.getElementById('demo-form');
    const input = document.getElementById('demo-input');
    const list = document.querySelector('.demo__messages');
    if (!form || !input || !list) return;

    function appendMessage(text, role = 'user'){
      const li = document.createElement('li');
      li.className = `msg msg--${role}`;
      li.innerHTML = `<span class="msg__role">${role === 'user' ? 'Você' : 'AI'}</span><div class="msg__bubble">${text}</div>`;
      list.appendChild(li);
      li.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      appendMessage(text, 'user');
      input.value = '';

      setTimeout(() => {
        appendMessage('Obrigado! Vamos personalizar a experiência para a sua turma.');
      }, 600);
    });
  })();

  // MODAIS — Termos e Privacidade
  (function(){
    const overlay = document.getElementById('modal-overlay');
    const dialog = overlay?.querySelector('.modal-dialog');
    const modalTitle = overlay?.querySelector('#modal-title');
    const modalBody = overlay?.querySelector('.modal-body');
    const openers = document.querySelectorAll('[data-modal]');
    const closeBtn = overlay?.querySelector('.modal-close');
    let lastFocused = null;

    // Bloquear interação e leitura do fundo quando o modal está aberto
    const main = document.getElementById('main-content');
    const headerEl = document.querySelector('header');
    const footerEl = document.querySelector('footer');
    function setBackgroundInert(isInert){
      const action = isInert ? 'setAttribute' : 'removeAttribute';
      main?.[action]('aria-hidden','true');
      headerEl?.[action]('aria-hidden','true');
      footerEl?.[action]('aria-hidden','true');
      if(isInert){
        main?.setAttribute('inert','');
        headerEl?.setAttribute('inert','');
        footerEl?.setAttribute('inert','');
      }else{
        main?.removeAttribute('inert');
        headerEl?.removeAttribute('inert');
        footerEl?.removeAttribute('inert');
      }
    }

    // Focus trap helpers
    const focusSelectors = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    let focusables = [];
    let trapHandler = null;

    if (!overlay || !dialog || !modalTitle || !modalBody || !closeBtn) return;

    function computeFocusables(){
      focusables = Array.from(dialog.querySelectorAll(focusSelectors))
        .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null);
    }
    function trapFocus(e){
      if(e.key !== 'Tab') return;
      if(focusables.length === 0){ return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }

    function openModal(kind){
      lastFocused = document.activeElement;
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setBackgroundInert(true);

      // Conteúdos a partir dos templates (inclui contacto)
      let tmplId = 'privacy-modal-template';
      if (kind === 'terms') tmplId = 'terms-modal-template';
      else if (kind === 'privacy') tmplId = 'privacy-modal-template';
      else if (kind === 'contact') tmplId = 'contact-modal-template';
      const tmpl = document.getElementById(tmplId);
      if (tmpl) {
        const clone = tmpl.content.cloneNode(true);
        const header = clone.querySelector('.modal-header');
        const body = clone.querySelector('.modal-body');
        if (header) modalTitle.textContent = header.querySelector('h2')?.textContent || '';
        if (body && modalBody){ modalBody.innerHTML = body.innerHTML; }

        // Se for o modal de contacto, ligar o submit para abrir o cliente de email
        if (kind === 'contact'){
          const form = modalBody.querySelector('#contact-form');
          form?.addEventListener('submit', (e)=>{
            e.preventDefault();
            const data = new FormData(form);
            const name = (data.get('name') || '').toString().trim();
            const email = (data.get('email') || '').toString().trim();
            const message = (data.get('message') || '').toString().trim();
            const subject = encodeURIComponent(`Contacto — Connect AI${name ? ` — ${name}` : ''}`);
            const bodyText = encodeURIComponent(`Nome: ${name}\nEmail: ${email}\n\nMensagem:\n${message}`);
            window.location.href = `mailto:contacto@connectai.pt?subject=${subject}&body=${bodyText}`;
            setTimeout(()=> closeModal(), 150);
          });
        }
      }

      // Inicializar foco
      computeFocusables();
      trapHandler = (e)=> trapFocus(e);
      dialog.addEventListener('keydown', trapHandler);
      // Foco no botão fechar ou primeiro foco possível
      setTimeout(() => {
        computeFocusables();
        const target = focusables.find(el => el.classList?.contains('modal-close')) || focusables[0] || closeBtn;
        target?.focus();
      }, 10);
    }

    function closeModal(){
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setBackgroundInert(false);
      modalTitle.textContent = '';
      modalBody.innerHTML = '';
      if(trapHandler){ dialog.removeEventListener('keydown', trapHandler); trapHandler = null; }
      focusables = [];
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    openers.forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const kind = el.getAttribute('data-modal');
        if (!kind) return;
        openModal(kind);
      });
    });

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') closeModal(); });
  })();
})();