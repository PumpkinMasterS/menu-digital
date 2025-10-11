#!/bin/bash

# 🚀 SCRIPT DE DEPLOY VERCEL - CLEVER SCHOOL PAL AI
# Autor: Assistente IA
# Data: Janeiro 2025

set -e

echo "🎯 INICIANDO DEPLOY VERCEL - CLEVER SCHOOL PAL AI"
echo "=================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    log_error "Vercel CLI não encontrado!"
    log_info "Instalando Vercel CLI..."
    npm install -g vercel
fi

# Verificar se está logado no Vercel
if ! vercel whoami &> /dev/null; then
    log_warning "Não está logado no Vercel"
    log_info "Fazendo login..."
    vercel login
fi

# Limpar build anterior
log_info "Limpando build anterior..."
rm -rf dist/

# Instalar dependências
log_info "Instalando dependências..."
npm install

# Build do projeto
log_info "Fazendo build do projeto..."
npm run build

# Verificar se build foi bem-sucedido
if [ ! -d "dist" ]; then
    log_error "Build falhou! Diretório 'dist' não encontrado."
    exit 1
fi

log_success "Build concluído com sucesso!"

# Deploy para Vercel
log_info "Fazendo deploy para Vercel..."

# Primeiro deploy (desenvolvimento)
log_info "Deploying ambiente de desenvolvimento..."
vercel --prod --yes

# Obter URL do deployment
DEPLOYMENT_URL=$(vercel --prod --yes 2>/dev/null | grep -o 'https://[^[:space:]]*')

if [ -z "$DEPLOYMENT_URL" ]; then
    log_error "Falha ao obter URL do deployment"
    exit 1
fi

log_success "Deploy concluído!"
log_info "URL do deployment: $DEPLOYMENT_URL"

# Instruções pós-deploy
echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo "================================="
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configurar domínio personalizado no dashboard Vercel"
echo "2. Configurar variáveis de ambiente"
echo "3. Configurar proteção de deployment"
echo ""
echo "🔗 Links úteis:"
echo "• Dashboard Vercel: https://vercel.com/dashboard"
echo "• Seu projeto: https://vercel.com/dashboard"
echo "• URL atual: $DEPLOYMENT_URL"
echo ""

# Abrir dashboard automaticamente (opcional)
if command -v open &> /dev/null; then
    read -p "Abrir dashboard Vercel? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://vercel.com/dashboard"
    fi
fi

log_success "Script concluído!" 