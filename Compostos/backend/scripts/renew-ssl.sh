#!/bin/bash

# Script para renovação automática de certificados SSL Let's Encrypt
# e recarregamento no servidor Compostos

# Configurações
DOMAIN="seusite.com"
BACKEND_DIR="/caminho/para/compostos/backend"
SSL_DIR="$BACKEND_DIR/ssl"
CERTBOT_DIR="/etc/letsencrypt/live/$DOMAIN"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log com timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Função para log de sucesso
success() {
    echo -e "${GREEN}$(date '+%Y-%m-%d %H:%M:%S') - ✓ $1${NC}"
}

# Função para log de warning
warning() {
    echo -e "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S') - ⚠ $1${NC}"
}

# Função para log de erro
error() {
    echo -e "${RED}$(date '+%Y-%m-%d %H:%M:%S') - ✗ $1${NC}" >&2
}

# Verificar se script está sendo executado como root
if [ "$EUID" -ne 0 ]; then 
    error "Este script precisa ser executado como root"
    exit 1
fi

log "Iniciando renovação de certificado SSL para $DOMAIN"

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    error "Certbot não está instalado. Instale com: apt-get install certbot"
    exit 1
fi

# Verificar se diretório SSL existe
if [ ! -d "$SSL_DIR" ]; then
    error "Diretório SSL não encontrado: $SSL_DIR"
    exit 1
fi

# Verificar se diretório do certbot existe
if [ ! -d "$CERTBOT_DIR" ]; then
    error "Diretório do certbot não encontrado: $CERTBOT_DIR"
    exit 1
fi

# Tentar renovar certificado
log "Executando certbot renew..."
if certbot renew --quiet; then
    success "Certificado renovado com sucesso"
else
    error "Falha ao renovar certificado"
    exit 1
fi

# Copiar novos certificados
log "Copiando novos certificados..."

# Backup dos certificados antigos (opcional)
BACKUP_DIR="$SSL_DIR/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$SSL_DIR/private.key" "$BACKUP_DIR/" 2>/dev/null || true
cp "$SSL_DIR/certificate.crt" "$BACKUP_DIR/" 2>/dev/null || true
cp "$SSL_DIR/ca_bundle.crt" "$BACKUP_DIR/" 2>/dev/null || true

# Copiar novos certificados
cp "$CERTBOT_DIR/privkey.pem" "$SSL_DIR/private.key"
cp "$CERTBOT_DIR/fullchain.pem" "$SSL_DIR/certificate.crt"
cp "$CERTBOT_DIR/chain.pem" "$SSL_DIR/ca_bundle.crt"

# Ajustar permissões
chmod 600 "$SSL_DIR/private.key"
chmod 644 "$SSL_DIR/certificate.crt"
chmod 644 "$SSL_DIR/ca_bundle.crt"

success "Certificados copiados e permissões ajustadas"

# Verificar validade dos certificados
log "Verificando validade dos certificados..."

CERT_FILE="$SSL_DIR/certificate.crt"
if [ -f "$CERT_FILE" ]; then
    NOT_AFTER=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
    success "Certificado válido até: $NOT_AFTER"
else
    error "Arquivo de certificado não encontrado"
    exit 1
fi

# Reiniciar servidor para carregar novos certificados
log "Reiniciando servidor Compostos..."

# Verificar se PM2 está instalado e servidor está rodando
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "compostos-https"; then
        pm2 restart compostos-https
        success "Servidor reiniciado via PM2"
    else
        warning "Servidor não encontrado no PM2. Reinicie manualmente."
    fi
else
    warning "PM2 não encontrado. Reinicie o servidor manualmente."
fi

# Verificar se servidor está respondendo
log "Testando conexão HTTPS..."
sleep 5 # Dar tempo para o servidor reiniciar

if curl -s -k --max-time 10 "https://localhost:443/api/health" > /dev/null 2>&1; then
    success "Servidor HTTPS respondendo corretamente"
else
    warning "Servidor não respondeu imediatamente. Pode estar reiniciando."
fi

success "Renovação de SSL concluída com sucesso!"
log "Backup dos certificados antigos em: $BACKUP_DIR"

# Limpar backups antigos (manter últimos 7 dias)
find "$SSL_DIR/backup" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

log "Processo de renovação finalizado"