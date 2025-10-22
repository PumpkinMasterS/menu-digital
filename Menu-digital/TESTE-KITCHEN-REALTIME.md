# Guia de Teste - Kitchen Dashboard Tempo Real

## 🚀 Como Testar as Correções

### Pré-requisitos
- MongoDB rodando (idealmente MongoDB Atlas ou Replica Set local)
- Backend iniciado
- Pelo menos 2 navegadores/abas abertas

---

## Teste 1: Sincronização em Tempo Real ⚡

### Passos:

1. **Iniciar o Backend**
```bash
cd backend
npm run dev
```

2. **Abrir Múltiplos Dashboards**
- **Aba 1:** Abra `http://localhost:5173/kitchen` (ou porta do apps/kitchen)
- **Aba 2:** Abra a mesma URL em outra aba ou navegador
- **Aba 3:** (Opcional) Abra em um navegador diferente

3. **Verificar Indicador de Conexão**
- Procure o indicador no topo do dashboard
- Deve estar **VERDE** com texto "● Tempo real"
- Se estiver vermelho ou amarelo, veja seção de troubleshooting

4. **Criar um Novo Pedido**

Opção A - Via API REST:
```bash
curl -X POST http://localhost:3000/v1/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "Mesa 5",
    "items": [
      {
        "productId": "SEU_PRODUTO_ID",
        "quantity": 2,
        "modifiers": [],
        "variants": []
      }
    ],
    "notes": "Teste de sincronização"
  }'
```

Opção B - Via App de Menu (se disponível):
- Acesse o app do cliente
- Faça um pedido normalmente

5. **Verificar Sincronização**
- O pedido deve aparecer **INSTANTANEAMENTE** em TODAS as abas
- Deve tocar um som de notificação (se habilitado)
- O pedido deve aparecer com status "Pendente"

6. **Atualizar Status do Pedido**
- Em qualquer aba, clique em "Aceitar" em um pedido
- Verifique que o status muda para "Em Preparação" em TODAS as abas
- Teste outros status: "Pronto", "Entregue"

✅ **Teste passou se:** O pedido e suas atualizações aparecem em tempo real em todas as abas

---

## Teste 2: Reconexão Automática 🔄

### Passos:

1. **Abrir Dashboard**
- Abra o kitchen dashboard
- Verifique que está conectado (indicador verde)

2. **Simular Queda do Servidor**
```bash
# No terminal do backend, pressione Ctrl+C para parar
```

3. **Observar Comportamento**
- Indicador deve ficar **AMARELO** "● Reconectando..."
- Console do navegador deve mostrar tentativas de reconexão
- Após algumas tentativas, deve ficar **VERMELHO** "● Offline"
- Sistema deve fazer fallback para polling automático

4. **Reiniciar Servidor**
```bash
cd backend
npm run dev
```

5. **Verificar Reconexão**
- Indicador deve voltar para **VERDE** automaticamente
- Pedidos devem carregar novamente
- Tempo real deve funcionar novamente

✅ **Teste passou se:** Sistema reconecta automaticamente sem intervenção manual

---

## Teste 3: Múltiplas Instâncias do Backend 🔀

### Passos:

1. **Iniciar Primeira Instância**
```bash
cd backend
PORT=3000 npm run dev
```

2. **Iniciar Segunda Instância** (em outro terminal)
```bash
cd backend
PORT=3001 npm run dev
```

3. **Conectar Dashboards a Instâncias Diferentes**
- Configurar Aba 1 para apontar para `http://localhost:3000`
- Configurar Aba 2 para apontar para `http://localhost:3001`

4. **Criar Pedido via Instância 1**
```bash
curl -X POST http://localhost:3000/v1/public/orders \
  -H "Content-Type: application/json" \
  -d '{ ... pedido ... }'
```

5. **Verificar em Ambas**
- Pedido deve aparecer em AMBOS os dashboards
- Mesmo que conectados a instâncias diferentes do backend

✅ **Teste passou se:** Change Streams sincronizam entre instâncias diferentes

---

## Teste 4: Detalhes Completos dos Pedidos 📋

### Passos:

1. **Criar Pedido com Modificadores**
```bash
curl -X POST http://localhost:3000/v1/public/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "Mesa 10",
    "nif": "123456789",
    "items": [
      {
        "productId": "produto123",
        "quantity": 1,
        "modifiers": [
          {"groupId": "tamanho", "optionId": "grande"}
        ],
        "variants": [
          {"groupId": "tipo", "optionId": "picante"}
        ],
        "notes": "Sem cebola"
      }
    ],
    "notes": "Cliente VIP"
  }'
```

2. **Verificar no Dashboard**
- Pedido deve mostrar:
  - ✅ Nome do produto
  - ✅ Quantidade
  - ✅ Modificadores (Tamanho: Grande)
  - ✅ Variantes (Tipo: Picante)
  - ✅ Notas do item (Sem cebola)
  - ✅ Notas do pedido (Cliente VIP)
  - ✅ NIF (123456789)
  - ✅ Mesa (Mesa 10)

✅ **Teste passou se:** Todos os detalhes aparecem corretamente

---

## Teste 5: Notificação Sonora 🔔

### Passos:

1. **Verificar Som Habilitado**
- No dashboard, verificar que opção "Som: On" está ativa
- Pode estar como checkbox ou toggle

2. **Criar Novo Pedido Pendente**
```bash
curl -X POST http://localhost:3000/v1/public/orders \
  -H "Content-Type: application/json" \
  -d '{ ... pedido ... }'
```

3. **Verificar Notificação**
- Deve tocar um beep quando pedido chegar
- Som deve ser curto (120ms), tom 880Hz

4. **Testar Desativação**
- Desativar som no dashboard
- Criar novo pedido
- NÃO deve tocar som

✅ **Teste passou se:** Som toca apenas quando habilitado e para novos pedidos

---

## Troubleshooting 🔧

### Indicador Vermelho (Offline)

**Causa possível:**
- MongoDB não está rodando
- MongoDB não está em Replica Set mode
- Backend não conseguiu conectar ao MongoDB
- Token de autenticação inválido

**Solução:**
```bash
# Verificar logs do backend
# Procurar por:
# "MongoDB Change Stream initialized" ✅ BOM
# "Failed to initialize change stream" ❌ PROBLEMA

# Se MongoDB Atlas: já está OK
# Se MongoDB local: precisa configurar Replica Set
```

### Indicador Amarelo (Reconectando)

**Causa possível:**
- Conexão de rede instável
- Backend reiniciando
- Firewall bloqueando SSE

**Solução:**
- Aguardar reconexão automática
- Verificar console do navegador para erros
- Verificar se backend está acessível

### Pedidos Não Sincronizam

**Causa possível:**
- Change Streams não inicializados
- EventEmitter não propagando eventos
- Múltiplas instâncias sem Replica Set

**Solução:**
```bash
# 1. Verificar logs do backend ao iniciar
# Deve aparecer: "MongoDB Change Stream initialized for orders collection"

# 2. Verificar tipo de MongoDB
# Precisa ser Replica Set ou Atlas

# 3. Testar endpoint SSE diretamente
curl http://localhost:3000/v1/admin/orders/stream?token=SEU_TOKEN
# Deve manter conexão aberta e enviar eventos
```

### Som Não Toca

**Causa possível:**
- Navegador bloqueou autoplay de áudio
- Som desabilitado nas configurações

**Solução:**
1. Clicar em qualquer lugar da página primeiro (para desbloquear áudio)
2. Verificar que "Som: On" está ativo
3. Verificar volume do sistema operacional

---

## Verificação de MongoDB Change Streams

### Verificar se Change Streams estão funcionando:

```javascript
// No MongoDB Shell ou Compass
db.orders.watch().on('change', (change) => {
  console.log('Change detected:', change);
});

// Em outra janela, inserir um pedido
db.orders.insertOne({
  id: 'test123',
  status: 'pending',
  items: [],
  createdAt: new Date().toISOString()
});

// Deve ver o evento no primeiro terminal
```

---

## Checklist Final ✓

Antes de dar como concluído, verificar:

- [ ] Múltiplos dashboards sincronizam em tempo real
- [ ] Indicador de conexão funciona corretamente
- [ ] Reconexão automática funciona
- [ ] Fallback para polling funciona quando SSE falha
- [ ] Detalhes completos dos pedidos aparecem (modifiers, variants, notes, nif)
- [ ] Som de notificação funciona para novos pedidos
- [ ] Atualização de status sincroniza entre dashboards
- [ ] Backend em múltiplas portas sincroniza (se testado)
- [ ] Logs do backend mostram "Change Stream initialized"
- [ ] Console do navegador não mostra erros críticos

---

## Notas Importantes

1. **MongoDB Atlas:** Já vem configurado com Replica Set, funciona out-of-the-box
2. **MongoDB Local:** Precisa configurar Replica Set manualmente
3. **SSE vs WebSockets:** SSE é unidirecional (servidor → cliente), mais simples e confiável
4. **Polling Fallback:** Se SSE falhar 10 vezes, sistema usa polling a cada 5s
5. **Persistência:** Eventos não são perdidos pois vêm direto do MongoDB

---

## Suporte

Se encontrar problemas:
1. Verificar logs do backend (terminal onde `npm run dev` está rodando)
2. Verificar console do navegador (F12 → Console)
3. Verificar arquivo `CORRECOES-KITCHEN-DASHBOARD.md` para detalhes técnicos
4. Verificar se MongoDB está em Replica Set mode

**Logs úteis para procurar:**
- ✅ "MongoDB Change Stream initialized for orders collection"
- ✅ "SSE connected successfully"
- ❌ "Failed to initialize change stream"
- ❌ "Max reconnection attempts reached"

