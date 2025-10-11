# Configuração de Bucket na Nuvem com AWS S3

## 📋 Visão Geral

Este documento explica como configurar e usar o AWS S3 para armazenamento de fotos na nuvem, integrado com o MongoDB.

## 🚀 Resposta à Pergunta: MongoDB aceita fotos?

**Não**, o MongoDB **NÃO** é ideal para armazenar fotos diretamente. Aqui está o porquê:

### ❌ Problemas com armazenamento direto no MongoDB:
- **Limite de 16MB** por documento (BSON)
- **Performance ruim** com arquivos grandes
- **Custo elevado** de armazenamento na database
- **Dificuldade** em streaming e CDN

### ✅ Solução Recomendada:
Armazenar as fotos no **AWS S3** e guardar apenas as **URLs** no MongoDB.

---

## 🛠️ Configuração do AWS S3

### 1. Criar Conta AWS
- Acesse https://aws.amazon.com
- Crie uma conta (free tier disponível)

### 2. Criar Bucket S3
1. Acesse o **AWS Console** → **S3**
2. Clique em **"Create bucket"**
3. Configure:
   - **Bucket name**: `seu-nome-de-bucket-unico`
   - **Region**: `us-east-1` (ou mais próxima)
   - **Block Public Access**: Desmarque para permitir acesso público
   - **Bucket Versioning**: Opcional
   - **Default encryption**: Ative (SSE-S3)

### 3. Configurar Políticas de Acesso
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::seu-bucket-nome/*"
        }
    ]
}
```

### 4. Criar Usuário IAM
1. AWS Console → **IAM** → **Users**
2. **Create user**
3. Nome: `s3-upload-user`
4. Selecionar: **Programmatic access**
5. Permissions: **Attach existing policies**
6. Adicionar política: `AmazonS3FullAccess`
7. **Salvar Access Key ID e Secret Access Key**

---

## 🔧 Configuração no Projeto

### Variáveis de Ambiente (.env)
```bash
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=seu-bucket-nome
AWS_CLOUDFRONT_URL=https://d12345.cloudfront.net  # Opcional
```

### Instalação de Dependências
```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Script de Configuração Automática
```bash
node setup-s3.js
```

---

## 📁 Estrutura de Armazenamento

### No MongoDB (apenas metadados):
```javascript
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Model Name",
  "photos": [
    {
      "url": "https://bucket.s3.amazonaws.com/profiles/image1.jpg",
      "thumbnail": "https://bucket.s3.amazonaws.com/thumbnails/image1.jpg",
      "key": "profiles/image1.jpg",
      "storage": "s3",
      "uploadedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### No AWS S3 (arquivos reais):
```
s3://seu-bucket-nome/
├── profiles/
│   ├── image1.jpg
│   ├── image2.png
│   └── ...
├── thumbnails/
│   ├── image1-thumb.jpg
│   └── ...
└── documents/
    └── ...
```

---

## 🔄 Fluxo de Upload

### 1. Upload Tradicional (Multipart)
```javascript
// Frontend
const formData = new FormData()
formData.append('photos', file)

const response = await fetch('/api/upload-s3', {
  method: 'POST',
  body: formData
})
```

### 2. Upload Direto (Presigned URL) - Mais eficiente
```javascript
// 1. Gerar URL assinada
const { signedUrl, publicUrl } = await fetch('/api/generate-upload-url', {
  method: 'POST',
  body: JSON.stringify({ fileName: 'foto.jpg', folder: 'profiles' })
})

// 2. Upload direto para S3
await fetch(signedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
})

// 3. Salvar URL no MongoDB
await saveToDatabase(publicUrl)
```

---

## ⚡ Vantagens do AWS S3

### ✅ Benefícios:
- **Escalabilidade infinita**
- **Alta disponibilidade** (99.99% SLA)
- **Baixo custo** (~$0.023/GB)
- **CDN integrado** (CloudFront)
- **Segurança** avançada
- **Versionamento** de arquivos

### 💰 Custo Estimado (Free Tier):
- 5GB de armazenamento gratuitos
- 20.000 PUT requests gratuitos/mês
- 200.000 GET requests gratuitos/mês

### 📊 Comparativo:
| Feature | MongoDB (GridFS) | AWS S3 |
|---------|-----------------|--------|
| Limite | 16MB/doc | ∞ |
| Custo | Alto | Baixo |
| Performance | Lenta | Rápida |
| CDN | Não | Sim |
| Backup | Manual | Automático |

---

## 🔒 Segurança

### Melhores Práticas:
1. **Never store credentials in code**
2. **Use IAM Roles** quando possível
3. **Bucket policies** restritivas
4. **CORS configuration** adequada
5. **Enable encryption** (SSE-S3/AES-256)
6. **Enable versioning** para recovery
7. **Enable logging** para auditoria

### Configuração CORS:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
</CORSRule>
</CORSConfiguration>
```

---

## 🚨 Troubleshooting

### Erros Comuns:
1. **Access Denied** → Verificar políticas IAM
2. **CORS errors** → Configurar CORS no bucket
3. **Bucket not found** → Verificar nome e região
4. **Invalid credentials** → Verificar .env

### Comandos Úteis AWS CLI:
```bash
# Listar buckets
aws s3 ls

# Criar bucket
aws s3 mb s3://nome-bucket

# Upload de arquivo
aws s3 cp local.jpg s3://bucket/profiles/

# Configurar CORS
aws s3api put-bucket-cors --bucket nome-bucket --cors-configuration file://cors.json
```

---

## 🌐 Alternativas ao AWS S3 - Opções Baratas e Locais

### 🏆 Melhores Alternativas Baratas:

#### 1. **Cloudinary** (Recomendado - Mais Fácil)
- **Preço**: Free tier generoso (25 créditos/mês)
- **Vantagens**: Transformações automáticas, CDN incluído
- **Dificuldade**: ⭐☆☆☆☆ (Muito fácil)
- **Custo estimado**: Grátis para pequenos projetos

#### 2. **DigitalOcean Spaces** (Mais Barato que AWS)
- **Preço**: $5/mês (250GB + 1TB transfer)
- **Vantagens**: Preço fixo, interface simples
- **Dificuldade**: ⭐⭐☆☆☆ (Fácil)
- **Custo**: ~60% mais barato que AWS

#### 3. **Backblaze B2** (O Mais Barato)
- **Preço**: $0.005/GB (armazenamento) + $0.01/GB (download)
- **Vantagens**: Preço muito baixo, API compatível com S3
- **Dificuldade**: ⭐⭐⭐☆☆ (Moderado)

#### 4. **Google Cloud Storage** (Alternativa Sólida)
- **Preço**: Similar ao S3, mas com free tier diferente
- **Vantagens**: Integração com ecossistema Google
- **Dificuldade**: ⭐⭐⭐☆☆ (Moderado)

### 💻 Opções Locais (Para Desenvolvimento):

#### 5. **Armazenamento Local** (Já Implementado!)
- **Preço**: Grátis (usa seu próprio disco)
- **Configuração**: Já funciona no seu sistema
- **Como usar**: Basta não configurar as variáveis AWS
- **Rotas disponíveis**: `/api/upload` e `/api/upload-multiple`

#### 6. **MinIO** (S3 Local - Open Source)
- **Preço**: Grátis
- **Vantagens**: API compatível com S3, pode rodar localmente
- **Setup**: Docker simples
```bash
docker run -p 9000:9000 minio/minio server /data
```

#### 7. **LocalStack** (AWS Local - Para Testing)
- **Preço**: Grátis
- **Vantagens**: Emula todos serviços AWS localmente
- **Uso**: Ótimo para desenvolvimento e testes

### 📊 Comparativo de Preços (Exemplo 100GB):
| Serviço | Custo Mensal | Dificuldade |
|---------|-------------|------------|
| **Local** | Grátis | ⭐☆☆☆☆ |
| **Cloudinary** | Grátis* | ⭐☆☆☆☆ |
| **Backblaze B2** | ~$0.50 | ⭐⭐☆☆☆ |
| **DigitalOcean** | $5 | ⭐⭐☆☆☆ |
| **AWS S3** | ~$2.30 | ⭐⭐⭐☆☆ |
| **Google Cloud** | ~$2.00 | ⭐⭐⭐☆☆ |

*Até 25 créditos/mês no free tier

### Cloudinary (Recomendado para iniciantes):
```bash
# Mais fácil de configurar
# Upload diretamente do frontend
# Transformações automáticas (thumbnails, resize)
# Free tier generoso
```

---

## 📞 Suporte

### Links Úteis:
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [IAM Best Practices](https://aws.amazon.com/iam/features/)
- [S3 Pricing Calculator](https://calculator.aws/)
- [Cloudinary Free Tier](https://cloudinary.com/pricing)

### Suporte Técnico:
- AWS Support: https://aws.amazon.com/contact-us/
- Cloudinary Docs: https://cloudinary.com/documentation
- Issues do Projeto: [GitHub Issues]

---

## 🎯 Próximos Passos

1. [ ] Criar conta AWS
2. [ ] Criar bucket S3
3. [ ] Configurar usuário IAM
4. [ ] Configurar variáveis .env
5. [ ] Testar upload
6. [ ] Configurar CDN (Opcional)
7. [ ] Configurar backups (Opcional)

**Status**: ✅ Sistema implementado - Pronto para configurar!