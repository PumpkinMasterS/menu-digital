# 📊 Plano de Desenvolvimento - App Educativa de Juros Compostos

## 🎯 Objetivo Principal
Criar uma aplicação educativa que simula o funcionamento de juros compostos através de uma interface gamificada com robôs investidores, sistema de referrals e cliques diários.

## 🏗️ Arquitetura do Projeto

### Tecnologias Principais
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ou React)
- **Backend**: Node.js com Express (opcional para versão web)
- **Database**: LocalStorage (para versão web) ou SQLite (para app nativa)
- **Framework UI**: Bootstrap ou Tailwind CSS

### Estrutura de Pastas
```
compostos-app/
├── index.html              # Página principal
├── css/
│   ├── style.css           # Estilos principais
│   ├── components.css       # Componentes UI
│   └── responsive.css       # Media queries
├── js/
│   ├── app.js              # Lógica principal
│   ├── auth.js             # Autenticação
│   ├── calculator.js       # Cálculos financeiros
│   ├── robots.js           # Sistema de robôs
│   ├── referrals.js        # Sistema de referrals
│   └── storage.js          # Persistência de dados
├── assets/
│   ├── images/             # Imagens e ícones
│   └── sounds/              # Efeitos sonoros
└── docs/
    └── educational/        # Conteúdo educativo
```

## 📋 Funcionalidades Principais

### 1. Sistema de Autenticação
- Registro com email/senha
- Login com código de convite
- Perfil de usuário
- Recuperação de senha

### 2. Engine de Juros Compostos
```javascript
// Fórmula: A = P(1 + r/n)^(nt)
function calcularJurosCompostos(principal, taxa, periodos, tempo) {
    return principal * Math.pow(1 + (taxa / periodos), periodos * tempo);
}
```

### 3. Sistema de Robôs Investidores

#### Tipos de Robôs:
| Nível | Nome | Taxa Juros | Preço | Rendimento Diário |
|-------|------|------------|-------|-------------------|
| 1 | Robô Básico | 0.5% | € 100 | € 0.50 |
| 2 | Robô Interm. | 1.0% | € 500 | € 5.00 |
| 3 | Robô Avanç. | 2.0% | € 2.000 | € 40.00 |
| 4 | Robô Premium | 5.0% | € 10.000 | € 500.00 |

### 4. Sistema de Referrals Multinível

#### Estrutura de Comissões:
- **Nível 1**: 10% dos ganhos do referral direto
- **Nível 2**: 5% dos ganhos dos referrals do nível 2
- **Nível 3**: 2% dos ganhos dos referrals do nível 3

### 5. Mecanismo de Cliques Diários
- 3 cliques permitidos por dia
- Bônus progressivo por sequência de dias
- Recompensas variáveis

### 6. Conteúdo Educativo
- Tutoriais sobre juros compostos
- Calculadora interativa
- Exemplos práticos
- Comparativos de investimentos

## 🎮 Fluxo do Usuário

### Primeiro Acesso:
1. Tela de boas-vindas
2. Registro com código opcional de convite
3. Tutorial inicial
4. Recebe robô básico gratuito

### Rotina Diária:
1. Fazer 3 cliques para acumular rendimentos
2. Verificar rendimentos dos robôs
3. Analisar rede de referrals
4. Acessar conteúdo educativo

## 📊 Modelo de Dados

### Usuário:
```javascript
{
    id: "uuid",
    email: "user@email.com",
    nome: "Nome Usuário",
    saldo: 152.75,
    referrals: ["ref1", "ref2"],
    dataRegisto: "2024-01-15",
    ultimoLogin: "2024-01-20"
}
```

### Robô:
```javascript
{
    id: "robot-uuid",
    tipo: "basico",
    nivel: 1,
    taxaJuros: 0.005,
    valorCompra: 100,
    dataAquisição: "2024-01-15",
    rendimentoAcumulado: 25.50
}
```

### Transação:
```javascript
{
    id: "tx-uuid",
    usuarioId: "user-uuid",
    tipo: "clique|compra|rendimento|referral",
    valor: 5.25,
    data: "2024-01-20T10:30:00",
    descricao: "Clique diário #2"
}
```

## 🎨 Design e UX

### Paleta de Cores:
- Primária: Azul (#2563EB) - Confiança, financeiro
- Secundária: Verde (#10B981) - Crescimento, sucesso
- Neutra: Cinza (#6B7280) - Profissionalismo
- Destaque: Laranja (#F59E0B) - Ações, alertas

### Componentes UI:
- Cards informativos
- Progress bars para cliques
- Gráficos de evolução
- Modais educativos
- Notificações push

## 🔢 Cálculos Financeiros

### 1. Rendimento Diário por Robô:
```javascript
function calcularRendimentoDiario(robot) {
    return robot.valorCompra * robot.taxaJuros;
}
```

### 2. Comissões de Referral:
```javascript
function calcularComissaoReferral(rendimentoReferral, nivel) {
    const taxas = [0.10, 0.05, 0.02]; // 10%, 5%, 2%
    return rendimentoReferral * taxas[nivel - 1];
}
```

### 3. Juros Compostos (Simulação):
```javascript
function simularInvestimento(principal, taxaMensal, meses) {
    let resultados = [];
    let montante = principal;
    
    for (let i = 1; i <= meses; i++) {
        montante *= (1 + taxaMensal);
        resultados.push({
            mes: i,
            montante: Math.round(montante * 100) / 100,
            rendimento: Math.round((montante - principal) * 100) / 100
        });
    }
    
    return resultados;
}
```

## 📱 Telas Principais

### 1. Login/Registro
- Campos: email, senha, código convite
- Validações em tempo real
- Links: esqueci senha, novo registro

### 2. Dashboard Principal
- Saldo atual
- Progresso diário de cliques
- Resumo de robôs ativos
- Rede de referrals
- Notificações

### 3. Loja de Robôs
- Catálogo de robôs disponíveis
- Informações detalhadas de cada robô
- Simulador de rentabilidade
- Histórico de compras

### 4. Rede de Referrals
- Árvore de referrals
- Estatísticas de comissões
- Ferramentas de convite
- Ranking de performance

### 5. Perfil Educativo
- Progresso de aprendizagem
- Conquistas e badges
- Estatísticas pessoais
- Configurações

## 🛠️ Cronograma de Desenvolvimento

### Fase 1: MVP Básico (1-2 semanas)
- [ ] Estrutura HTML/CSS básica
- [ ] Sistema de autenticação local
- [ ] Engine de cálculos financeiros
- [ ] Interface do dashboard

### Fase 2: Funcionalidades Core (2-3 semanas)
- [ ] Sistema de robôs completo
- [ ] Mecanismo de cliques diários
- [ ] Persistência com LocalStorage
- [ ] Conteúdo educativo básico

### Fase 3: Features Avançadas (1-2 semanas)
- [ ] Sistema de referrals multinível
- [ ] Gráficos e visualizações
- [ ] Responsividade mobile
- [ ] Efeitos e animações

### Fase 4: Polimento (1 semana)
- [ ] Testes e validações
- [ ] Otimizações de performance
- [ ] Documentação final
- [ ] Deploy (se aplicável)

## 🧪 Estratégia de Testes

### Testes Unitários:
- Cálculos financeiros
- Validações de formulários
- Lógica de negócio

### Testes de Integração:
- Fluxo de autenticação
- Persistência de dados
- Interações entre módulos

### Testes de Usabilidade:
- Experiência mobile/desktop
- Tempos de resposta
- Clareza das informações

## 📚 Conteúdo Educativo

### Módulos de Aprendizagem:
1. **Juros Simples vs Compostos**
   - Diferenças fundamentais
   - Exemplos práticos
   - Impacto no longo prazo

2. **Power of Compounding**
   - Efeito bola de neve
   - Importância do tempo
   - Casos reais

3. **Aplicações Práticas**
   - Poupança
   - Investimentos
   - Empréstimos

4. **Riscos e Precauções**
   - Inflação
   - Diversificação
   - Assessoria profissional

## ⚠️ Aspectos Legais e Éticos

### Disclaimer Educativo:
> "Esta aplicação é uma ferramenta educativa e de simulação. Os valores apresentados são virtuais e não representam investimentos reais. Para assessoria financeira profissional, consulte um especialista qualificado."

### Proteção de Dados:
- Dados armazenados localmente
- Sem coleta de informações sensíveis
- Transparência no uso de dados

### Prevenção à Fraude:
- Mecanismos contra automação
- Limites de ganhos virtuais
- Comunicação clara sobre natureza educativa

## 🚀 Próximos Passos Imediatos

1. **Configurar estrutura básica do projeto**
2. **Criar arquivos HTML principais**
3. **Implementar sistema de autenticação**
4. **Desenvolver engine de cálculos**
5. **Criar interface do dashboard**

---

*Este plano serve como guia completo para o desenvolvimento da aplicação educativa de juros compostos. Todas as funcionalidades estão organizadas por prioridade e complexidade.*