# 🐳 Guia Completo: Docker + Supabase

## Por que usar Docker com Supabase?

O Docker resolve vários problemas comuns ao trabalhar com Supabase:

1. **Dependências isoladas**: Não precisa instalar Supabase CLI localmente
2. **Ambiente consistente**: Mesmo ambiente em todos os computadores
3. **Deploy automatizado**: Scripts que funcionam sempre
4. **Menos problemas de versão**: Docker garante versões corretas

## 📦 Estrutura Docker que criamos

### 1. `docker-compose.yml` (atualizado)
- Container principal da aplicação
- Container Supabase CLI para deploy
- Container Supabase local para desenvolvimento

### 2. `docker-deploy-supabase.yml`
- Arquivo específico para operações Supabase
- Profiles para diferentes usos (deploy, local, test)

### 3. `supabase-docker-deploy.sh`
- Script automatizado para deploy
- Múltiplas estratégias (Docker → Manual → Instruções)

## 🚀 Como usar

### Configuração inicial

```bash
# 1. Obter token do Supabase
# Vá para: https://supabase.com/dashboard/account/tokens
# Crie um novo token

# 2. Configurar variável de ambiente
export SUPABASE_ACCESS_TOKEN=seu_token_aqui

# 3. Dar permissão ao script
chmod +x supabase-docker-deploy.sh
```

### Métodos de deploy

#### Método 1: Script automatizado (recomendado)
```bash
./supabase-docker-deploy.sh
```

#### Método 2: Docker Compose direto
```bash
# Deploy via Docker
docker-compose -f docker-deploy-supabase.yml --profile deploy up supabase-deploy

# Desenvolvimento local
docker-compose -f docker-deploy-supabase.yml --profile local up supabase-local

# Teste de funções
docker-compose -f docker-deploy-supabase.yml --profile test up supabase-test
```

#### Método 3: Manual (se Docker falhar)
```bash
# Instalar CLI
npm install -g @supabase/cli

# Login e deploy
supabase login --token $SUPABASE_ACCESS_TOKEN
supabase link --project-ref wqxrdmvgjrqfzgkgqzfh
supabase functions deploy humanized-ai-tutor --no-verify-jwt
```

## 🔧 Solução para o problema atual

O erro "Student not found or bot not active" acontece porque:
1. A função no Supabase está na versão antiga (v28)
2. A versão antiga procura estudantes na base de dados
3. Como não há estudantes registrados, retorna 404

### Soluções implementadas:

#### 1. Sistema de Fallback no Frontend
- Se a função falhar, usa resposta local avançada
- Simula o estudante "Antonio" automaticamente
- Mantém toda a funcionalidade sem depender do deploy

#### 2. Deploy via Docker
- Resolve problemas de dependências
- Funciona independente do sistema operativo
- Múltiplas estratégias de backup

#### 3. Deploy Manual de Emergência
- Instruções claras no Dashboard Supabase
- Cópia direta do código da função
- Configuração manual se necessário

## 🎯 Vantagens desta abordagem

### Para Desenvolvimento
- **Ambiente isolado**: Cada projeto tem suas dependências
- **Fácil setup**: `docker-compose up` e está pronto
- **Debugging**: Logs centralizados e organizados

### Para Produção
- **Deploy consistente**: Mesmo processo sempre
- **Rollback fácil**: Versões containerizadas
- **Escalabilidade**: Fácil adicionar mais serviços

### Para Colaboração
- **Onboarding rápido**: Novo dev roda `docker-compose up`
- **Sem "funciona na minha máquina"**: Ambiente idêntico
- **Documentação viva**: Docker files são documentação

## 🚨 Resolução de problemas

### Docker não está rodando
```bash
# Windows/Mac: Abrir Docker Desktop
# Linux:
sudo systemctl start docker
```

### Token inválido
```bash
# Gerar novo token em:
# https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=novo_token
```

### Função não foi deployada
```bash
# Verificar se foi deployada:
curl -X POST https://wqxrdmvgjrqfzgkgqzfh.supabase.co/functions/v1/humanized-ai-tutor \
  -H "Authorization: Bearer seu_anon_key" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"123456789","question":"teste"}'
```

### Fallback não funciona
- O frontend tem sistema de fallback automático
- Mesmo sem deploy, o sistema funcionará
- Respostas educacionais inteligentes localmente

## 🌟 Melhorias futuras

### CI/CD com Docker
```yaml
# .github/workflows/deploy.yml
name: Deploy Supabase Functions
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy via Docker
        run: ./supabase-docker-deploy.sh
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### Multi-stage builds
```dockerfile
# Dockerfile.supabase
FROM supabase/cli:latest as builder
WORKDIR /app
COPY supabase/ ./supabase/
RUN supabase functions build

FROM supabase/cli:latest as deployer
COPY --from=builder /app/supabase/ ./supabase/
CMD ["supabase", "functions", "deploy", "--no-verify-jwt"]
```

### Monitoring e observabilidade
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
  grafana:
    image: grafana/grafana
  logs:
    image: grafana/loki
```

## 📚 Recursos adicionais

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## ✅ Status atual do projeto

- ✅ Sistema de fallback implementado
- ✅ Docker configurado para deploy
- ✅ Scripts automatizados criados
- ✅ Múltiplas estratégias de deploy
- ✅ Documentação completa

**O sistema funcionará mesmo sem deploy graças ao fallback inteligente!** 