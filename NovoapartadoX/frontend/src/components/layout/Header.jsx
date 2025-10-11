import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../LanguageSelector';
import NotificationBell from '../notifications/NotificationBell';
import { useEffect, useState, useRef } from 'react';

function Header() {
  const { token, user, logout } = useAuth();
  const { t } = useTranslation();
  const nav = useNavigate();

  // Dark mode toggle state (default = 'dark', persist via localStorage)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  // Mobile nav toggle
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  // Estado para colapsar o header ao rolar
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const onClickOutside = (e) => {
      const navEl = navRef.current;
      if (!navEl) return;
      const isToggle = e.target.closest('.menu-toggle');
      const isNavLinks = e.target.closest('#primary-navigation');
      if (!isToggle && !isNavLinks) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY || 0;
      const goingDown = y > lastScrollY.current;
      if (y <= 10) {
        setCollapsed(false);
      } else if (goingDown && y > 100) {
        setCollapsed(true);
      } else if (!goingDown) {
        setCollapsed(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-header ${collapsed ? 'collapsed' : ''}`}>
      <div className="nav" ref={navRef}>
        <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
          NovoApartado
        </NavLink>

        <button
          className="menu-toggle"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {/* Ícone Hamburguer */}
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <nav id="primary-navigation" className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Navegação principal">
          <NavLink to="/" className={({isActive}) => isActive ? 'active' : ''} aria-current={({isActive}) => isActive ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/lisboa" className={({isActive}) => isActive ? 'active' : ''} aria-current={({isActive}) => isActive ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
            Lisboa
          </NavLink>
          <NavLink to="/porto" className={({isActive}) => isActive ? 'active' : ''} aria-current={({isActive}) => isActive ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
            Porto
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({isActive}) => isActive ? 'active' : ''} aria-current={({isActive}) => isActive ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
              Dashboard Admin
            </NavLink>
          )}
        </nav>

        <div className="actions">
          {/* Dark mode toggle */}
          <button className="btn btn-outline btn-icon-only" onClick={toggleTheme} aria-label="Alternar tema" aria-pressed={theme === 'dark'}>
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
            <span className="btn-label" aria-hidden="true">Tema</span>
          </button>

          <LanguageSelector />
          {token ? (
            <div className="user-menu">
              <NotificationBell />
              <NavLink to="/reservada" className="btn btn-outline btn-icon-only" onClick={() => setMenuOpen(false)} aria-label="Área Reservada">
                {/* Ícone de escudo/área reservada */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="btn-label" aria-hidden="true">Área Reservada</span>
              </NavLink>
              {/* O dropdown do utilizador pode ser refatorado aqui */}
              <button 
                className="btn btn-icon-only" 
                onClick={() => {
                  logout();
                  nav('/login');
                  setMenuOpen(false);
                }}
                aria-label="Sair"
              >
                {/* Ícone Logout */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span className="btn-label" aria-hidden="true">Sair</span>
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="btn btn-primary btn-icon-only" onClick={() => setMenuOpen(false)} aria-label={t('nav.login')}>
              {/* Ícone Utilizador/Entrar */}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
              </svg>
              <span className="btn-label" aria-hidden="true">{t('nav.login')}</span>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;