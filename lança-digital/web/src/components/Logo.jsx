// Logo principal da Lança Digital
// Baseado no Logo 2 escolhido pelo cliente

export const Logo = ({ className = "", width = 140, height = 40 }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 140 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="20" cy="20" r="18" fill="#0F172A"/>
    <path d="M12 28L12 12L16 12L16 24L24 24L24 28L12 28Z" fill="white"/>
    <path d="M28 20L36 12L36 28L28 20Z" fill="#0EA5E9"/>
    <text x="45" y="16" fontSize="12" fontWeight="700" fill="#0F172A">LANÇA</text>
    <text x="45" y="28" fontSize="12" fontWeight="400" fill="#64748B">DIGITAL</text>
    <rect x="120" y="16" width="16" height="8" rx="4" fill="#0EA5E9"/>
    <circle cx="132" cy="20" r="2" fill="white"/>
  </svg>
);

// Versão compacta (só o ícone circular)
export const LogoIcon = ({ className = "", size = 40 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="20" cy="20" r="18" fill="#0F172A"/>
    <path d="M12 28L12 12L16 12L16 24L24 24L24 28L12 28Z" fill="white"/>
    <path d="M28 20L36 12L36 28L28 20Z" fill="#0EA5E9"/>
  </svg>
);

// Versão para fundos escuros
export const LogoLight = ({ className = "", width = 140, height = 40 }) => (
  <svg 
    width={width} 
    height={height} 
    viewBox="0 0 140 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="20" cy="20" r="18" fill="white"/>
    <path d="M12 28L12 12L16 12L16 24L24 24L24 28L12 28Z" fill="#0F172A"/>
    <path d="M28 20L36 12L36 28L28 20Z" fill="#0EA5E9"/>
    <text x="45" y="16" fontSize="12" fontWeight="700" fill="white">LANÇA</text>
    <text x="45" y="28" fontSize="12" fontWeight="400" fill="#94A3B8">DIGITAL</text>
    <rect x="120" y="16" width="16" height="8" rx="4" fill="#0EA5E9"/>
    <circle cx="132" cy="20" r="2" fill="white"/>
  </svg>
);

export default Logo;