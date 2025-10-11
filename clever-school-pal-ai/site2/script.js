(function(){
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
      const isOpen = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Close mobile nav after clicking a link
  const navLinks = Array.from(document.querySelectorAll('.nav-list a[href^="#"]'));
  navLinks.forEach(a => a.addEventListener('click', () => {
    if (navList && navToggle) {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  }));

  const contactBtn = document.getElementById('contactBtn');
  const contactModal = document.getElementById('contactModal');
  if (contactBtn && contactModal) {
    contactBtn.addEventListener('click', () => contactModal.showModal());
    contactModal.addEventListener('close', () => {});
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#' || id.length === 1) return;
      const el = document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Reveal on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  // Header compact on scroll + active nav link
  const header = document.querySelector('.site-header');
  const sections = Array.from(document.querySelectorAll('section[id]'));
  let scheduled = false;

  function updateActiveNav() {
    let currentId = null;
    for (const sec of sections) {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= 100 && rect.bottom >= 200) {
        currentId = '#' + sec.id;
        break;
      }
    }
    navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === currentId));
  }

  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 4);
    updateActiveNav();
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(() => { onScroll(); scheduled = false; });
    }
  });
  onScroll();

  // Parallax leve na colagem de imagens
  const collage = document.getElementById('collage');
  if (collage) {
    const imgs = collage.querySelectorAll('.collage-img');
    collage.addEventListener('mousemove', (e) => {
      const r = collage.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1 a 1
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      imgs.forEach((img, i) => {
        const fx = [ -10, 12, -6 ][i] || 6;
        const fy = [ -6, 8, -4 ][i] || 4;
        img.style.setProperty('--tx', `${x * fx}px`);
        img.style.setProperty('--ty', `${y * fy}px`);
      });
    });
    collage.addEventListener('mouseleave', () => {
      imgs.forEach(img => {
        img.style.setProperty('--tx', `0px`);
        img.style.setProperty('--ty', `0px`);
      });
    });
  }

  // Lightbox para imagens (collage e galeria)
  const lightbox = document.getElementById('imageLightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  function bindLightbox(selector) {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener('click', () => {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = el.src;
        lightbox.showModal();
      });
    });
  }
  bindLightbox('.collage-img');
  bindLightbox('.gallery-grid img');
})();