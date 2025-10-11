# Configuração SSL/TLS para Produção

## 📋 Pré-requisitos

1. **Certificado SSL válido** - Obtenha um certificado de uma autoridade certificadora (Let's Encrypt, DigiCert, etc.)
2. **Domínio configurado** - Seu domínio deve apontar para o IP do servidor
3. **Portas abertas** - Porta 443 (HTTPS) deve estar aberta no firewall

## 📁 Estrutura de Arquivos

```
backend/
├── ssl/
│   ├── private.key          # Chave privada do certificado
│   ├── certificate.crt       # Certificado principal
│   └── ca_bundle.crt        # Bundle da autoridade certificadora (opcional)
├── server-https.js           # Servidor HTTPS para produção
└── .env.production          # Variáveis de ambiente de produção
```

## 🔧 Configuração Passo a Passo

### 1. Obter Certificado SSL

#### Opção A: Let's Encrypt (Gratuito)
```bash
# Instalar certbot
sudo apt-get update
sudo apt-get install certbot

# Obter certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Os arquivos serão gerados em:
# /etc/letsencrypt/live/seu-dominio.com/
# - privkey.pem    -> private.key
# - fullchain.pem  -> certificate.crt
# - chain.pem      -> ca_bundle.crt
```

#### Opção B: Certificado Comercial
- Compre de provedores como DigiCert, GlobalSign, etc.
- Siga as instruções do provedor para gerar CSR e obter certificado

### 2. Configurar Arquivos SSL

Copie os arquivos do certificado para a pasta `ssl/`:

```bash
# Para Let's Encrypt
cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem backend/ssl/private.key
cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem backend/ssl/certificate.crt
cp /etc/letsencrypt/live/seu-dominio.com/chain.pem backend/ssl/ca_bundle.crt

# Configure permissões
chmod 600 backend/ssl/private.key
chmod 644 backend/ssl/certificate.crt
chmod 644 backend/ssl/ca_bundle.crt
```

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env.production`:

```env
# Configurações SSL
SSL_PORT=443
SSL_CA_CHAIN=ca_bundle.crt
ENABLE_HTTP_REDIRECT=true

# Domínios permitidos (CORS)
FRONTEND_URL=https://seusite.com,https://www.seusite.com

# Outras configurações de produção
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=seu-jwt-secret-super-seguro
```

### 4. Iniciar Servidor HTTPS

```bash
# Usando PM2 (recomendado para produção)
npm install -g pm2

# Iniciar servidor HTTPS
pm2 start server-https.js --name "compostos-https"

# Ou executar diretamente
node server-https.js
```

## 🔒 Configurações de Segurança SSL

O servidor HTTPS está configurado com:

- **TLS 1.2+ apenas** - Versões mais antigas desabilitadas
- **Cipher suites seguros** - Only modern, secure ciphers
- **HSTS habilitado** - HTTP Strict Transport Security
- **Helmet.js** - Headers de segurança
- **CORS restritivo** - Apenas domínios autorizados

## 🚀 Scripts Úteis

### Renew SSL Certificate (Let's Encrypt)
```bash
#!/bin/bash
# renew-ssl.sh

# Renovar certificado
certbot renew --quiet

# Recarregar certificados no servidor
cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem backend/ssl/private.key
cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem backend/ssl/certificate.crt

# Reiniciar servidor para carregar novos certificados
pm2 restart compostos-https
```

### Verificar Configuração SSL
```bash
# Testar configuração SSL
openssl s_client -connect localhost:443 -servername seu-dominio.com

# Verificar cipher suites
nmap --script ssl-enum-ciphers -p 443 seu-dominio.com
```

## 📊 Monitoramento

### Logs de Segurança SSL
O sistema registra eventos SSL no security logger:
- `HTTPS_SERVER_STARTED` - Servidor HTTPS iniciado
- `SSL_HANDSHAKE_ERROR` - Erros durante handshake SSL
- `CORS_BLOCKED` - Tentativas de acesso de origens não autorizadas

### Health Check
```bash
# Verificar status do servidor
curl -k https://localhost:443/api/health
```

## ⚠️ Troubleshooting

### Erro: "Cannot find module 'https'"
```bash
npm install https
```

### Erro: "ENOENT: no such file or directory"
- Verifique se os arquivos SSL existem na pasta `ssl/`
- Verifique permissões dos arquivos

### Erro: "SSL routines:ssl3_get_record:wrong version number"
- Cliente tentando conectar via HTTP na porta HTTPS
- Configure redirecionamento HTTP→HTTPS

## 🔄 Atualização Automática (Let's Encrypt)

Adicione ao crontab para renovação automática:

```bash
# Editar crontab
crontab -e

# Adicionar linha para renovar diariamente às 2:30 AM
30 2 * * * /path/to/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

## 📞 Suporte

Para problemas com SSL/TLS:
1. Verifique logs: `pm2 logs compostos-https`
2. Teste conexão: `openssl s_client -connect seu-dominio.com:443`
3. Verifique certificado: `openssl x509 -in ssl/certificate.crt -text -noout`