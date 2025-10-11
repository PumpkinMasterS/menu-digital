# Guia do Sidebar Mobile - Clever School Pal AI

## 📱 Funcionalidades Implementadas

### 1. **Auto-collapse em Dispositivos Móveis**
- O sidebar detecta automaticamente quando está em uma tela pequena (< 768px)
- Colapsa automaticamente em dispositivos móveis
- Usa o modo "offcanvas" para criar um overlay em telas pequenas

### 2. **Botão Hambúrguer no Header**
- Visível apenas em telas móveis (< 768px)
- Localizado no canto superior esquerdo do header
- Permite abrir/fechar o sidebar facilmente

### 3. **Fechamento Automático após Navegação**
- Em dispositivos móveis, o sidebar fecha automaticamente após clicar em um item de menu
- Melhora a experiência do usuário evitando que o sidebar fique aberto

### 4. **Melhorias de CSS para Mobile**
- Sidebar ocupa toda a altura da tela em mobile
- Overlay com z-index apropriado
- Largura otimizada para telas pequenas (18rem)
- Conteúdo principal não é coberto pelo sidebar

## 🔧 Arquivos Modificados

### 1. `src/components/layout/Sidebar.tsx`
- Adicionado hook `useMobileSidebar()`
- Implementado fechamento automático após navegação
- Configurado modo "offcanvas" para mobile

### 2. `src/components/layout/Header.tsx`
- Já tinha o `SidebarTrigger` configurado para mobile
- Botão hambúrguer visível apenas em telas < 768px

### 3. `src/hooks/use-mobile-sidebar.ts` (NOVO)
- Hook personalizado para gerenciar comportamento mobile
- Auto-collapse em dispositivos móveis
- Função para fechar sidebar após navegação

### 4. `src/index.css`
- Adicionadas regras CSS específicas para mobile
- Melhorias no overlay e posicionamento
- Garantia de que o conteúdo principal não seja coberto

## 📋 Como Testar

### 1. **Teste em Desktop**
1. Abra o aplicativo em uma tela grande
2. O sidebar deve estar expandido por padrão
3. Use o botão de collapse para alternar entre expandido/colapsado

### 2. **Teste em Mobile (Simulação)**
1. Abra as ferramentas de desenvolvedor (F12)
2. Ative o modo de dispositivo móvel
3. Escolha um dispositivo como iPhone ou Android
4. Recarregue a página

### 3. **Comportamentos Esperados em Mobile**
- ✅ Sidebar deve estar fechado por padrão
- ✅ Botão hambúrguer deve aparecer no header
- ✅ Clicar no hambúrguer abre o sidebar como overlay
- ✅ Clicar em qualquer item do menu fecha o sidebar automaticamente
- ✅ Clicar fora do sidebar também deve fechá-lo

### 4. **Teste de Responsividade**
1. Redimensione a janela do navegador
2. Observe a transição entre desktop e mobile em 768px
3. Verifique se o comportamento muda adequadamente

## 🎯 Breakpoints

- **Desktop**: >= 768px (md e acima)
  - Sidebar com modo "icon" (colapsível)
  - Botão hambúrguer oculto
  - Sidebar pode ficar expandido

- **Mobile**: < 768px
  - Sidebar com modo "offcanvas" (overlay)
  - Botão hambúrguer visível
  - Sidebar fechado por padrão
  - Fechamento automático após navegação

## 🚀 Próximas Melhorias Possíveis

1. **Gestos Touch**: Implementar swipe para abrir/fechar
2. **Animações**: Adicionar transições mais suaves
3. **Configuração Persistente**: Lembrar preferência do usuário
4. **Modo Tablet**: Comportamento específico para tablets

---

**Desenvolvido para Clever School Pal AI** 🎓