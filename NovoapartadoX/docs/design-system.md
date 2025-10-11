# Design System - NovoApartadoX

Este documento define as diretrizes de design e UI para a plataforma NovoApartadoX, com o objetivo de criar uma experiência de utilizador premium, coesa e luxuosa.

## 1. Filosofia de Design

- **Sofisticação e Luxo:** O design deve transmitir uma sensação de exclusividade e alta qualidade.
- **Simplicidade e Clareza:** A interface deve ser intuitiva e fácil de navegar, sem elementos desnecessários.
- **Consistência:** Todos os componentes e páginas devem seguir as diretrizes aqui definidas para garantir uma experiência unificada.

## 2. Paleta de Cores

A paleta de cores foi escolhida para ser moderna, sofisticada e premium.

### Cores Primárias
- `primary-black`: `#1A1A1A` - O novo "preto". Um tom profundo e rico, para ser usado em fundos principais, texto e elementos de destaque.
- `primary-gold`: `#D4AF37` - O "dourado" de destaque. Usado para botões de ação principais (CTAs), links importantes, ícones e detalhes que precisam de atenção.
- `primary-white`: `#FFFFFF` - Branco puro, para texto sobre fundos escuros e áreas de respiro.

### Cores Secundárias
- `secondary-dark-gray`: `#2C2C2C` - Um cinza muito escuro para fundos de secções secundárias ou cartões.
- `secondary-light-gray`: `#F5F5F5` - Um cinza muito claro para fundos de página, proporcionando um contraste suave.
- `secondary-border-gray`: `#444444` - Cor para bordas subtis em inputs e contentores.

### Cores de Feedback
- `feedback-success`: `#28a745` - Verde para mensagens de sucesso.
- `feedback-error`: `#dc3545` - Vermelho para mensagens de erro.
- `feedback-warning`: `#ffc107` - Amarelo para avisos.

## 3. Tipografia

A tipografia foi selecionada para ser elegante, legível e versátil.

- **Fonte Principal:** `Inter` (ou uma alternativa sans-serif como `Helvetica Neue`, `Arial`). É uma fonte moderna e limpa, excelente para UI.
- **Fonte de Destaque (Opcional):** `Playfair Display` (ou uma alternativa serifada como `Georgia`, `Times New Roman`). Pode ser usada em títulos principais (H1) para um toque de classe.

### Hierarquia de Texto
- **H1 (Títulos de Página):** `Playfair Display`, 36px, Bold (700)
- **H2 (Subtítulos):** `Inter`, 28px, Semi-Bold (600)
- **H3 (Títulos de Secção):** `Inter`, 22px, Semi-Bold (600)
- **Corpo de Texto (Padrão):** `Inter`, 16px, Regular (400)
- **Texto Pequeno / Legendas:** `Inter`, 14px, Regular (400)
- **Botões:** `Inter`, 16px, Medium (500)

## 4. Componentes

### Botões
- **Botão Primário (CTA):**
  - Fundo: `primary-gold` (`#D4AF37`)
  - Texto: `primary-white` (`#FFFFFF`)
  - Hover: Um tom de dourado ligeiramente mais escuro.
  - Border-radius: 4px (cantos subtilmente arredondados).
- **Botão Secundário:**
  - Fundo: Transparente
  - Texto: `primary-gold` (`#D4AF37`)
  - Borda: 1px solid `primary-gold` (`#D4AF37`)
  - Hover: Fundo `primary-gold` com texto `primary-white`.

### Campos de Input (Formulários)
- Fundo: `secondary-dark-gray` (`#2C2C2C`)
- Borda: 1px solid `secondary-border-gray` (`#444444`)
- Texto: `primary-white` (`#FFFFFF`)
- Placeholder: Um tom de cinza claro.
- Focus: Borda com a cor `primary-gold` (`#D4AF37`).

## 5. Layout e Espaçamento

- **Base de Espaçamento:** Múltiplos de 8px (8, 16, 24, 32, 40, etc.) para manter um ritmo visual consistente.
- **Contentores Principais:** Devem ter um `max-width` para garantir a legibilidade em ecrãs grandes.
- **Grelha (Grid):** Recomenda-se o uso de Flexbox ou CSS Grid para layouts complexos.