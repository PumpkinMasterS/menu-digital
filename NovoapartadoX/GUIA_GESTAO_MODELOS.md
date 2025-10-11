# 📋 Guia Completo de Gestão de Perfis de Modelos

## 📊 Sistema Atual de Perfis

### Estrutura de Dados (Schema Model)
```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  category: { type: String, enum: ['fitness', 'fashion', 'beauty', 'lifestyle'], required: true },
  bio: { type: String, maxlength: 500 },
  photos: [{
    url: { type: String, required: true },
    thumbnail: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
  }],
  stats: {
    totalViews: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    totalCalls: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  },
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  socialMedia: {
    instagram: String,
    twitter: String,
    tiktok: String
  }
}
```

## 🚀 Funcionalidades Implementadas

### 1. ✅ Criação de Contas de Modelo
**Endpoint:** `POST /api/admin/users`
**Método:** Administrativo (requer auth admin)
**Parâmetros:**
- `name` (obrigatório)
- `email` (obrigatório, único)

**Funcionalidade:**
- Gera automaticamente senha de 8 caracteres alfanuméricos
- Retorna a senha em texto claro na resposta
- Hash da senha armazenado com bcrypt

### 2. ✅ Reset/Alteração de Senha
**Endpoint:** `PATCH /api/users/:id`
**Método:** Autenticado (próprio usuário ou admin)
**Parâmetros:**
- `password` (mínimo 6 caracteres)

**Frontend:** Página dedicada em `/reset-password/:userId`

### 3. ✅ Gestão de Perfis
**Endpoints Disponíveis:**
- `GET /api/models` - Listar todos os modelos
- `GET /api/my-profile` - Perfil do próprio modelo
- `PATCH /api/users/:id` - Atualizar perfil
- Sistema de permissões com middlewares:
  - `auth('admin')` - Acesso administrativo
  - `auth('model')` - Acesso de modelo
  - `adminOrSelfAuth()` - Admin ou próprio usuário
  - `modelResourceAuth()` - Acesso a recursos específicos

## ✅ Sistema de Slugs/URLs Amigáveis IMPLEMENTADO

**Estado Atual:**
- ✅ **IMPLEMENTADO** - URLs amigáveis com slugs
- ✅ **Sistema completo** de slugs (ex: `/api/models/ana-silva`)
- ✅ URLs aceitam tanto IDs quanto slugs

### Funcionalidades Implementadas:

#### 1. Campo Slug no Schema
```javascript
slug: { 
  type: String, 
  unique: true, 
  sparse: true,
  lowercase: true,
  trim: true
}
```

#### 2. Função de Geração de Slugs
```javascript
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

#### 3. Endpoint Universal de Busca
```javascript
// Aceita tanto ID quanto slug
app.get('/api/models/:identifier', async (req, res) => {
  const { identifier } = req.params;
  
  let model;
  if (ObjectId.isValid(identifier)) {
    model = await Model.findById(identifier);
  } else {
    model = await Model.findOne({ slug: identifier });
  }
  
  if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
  res.json(model);
});
```

#### 4. Geração Automática na Criação/Atualização
- Slugs são gerados automaticamente a partir do nome
- Verificação de unicidade com sufixo numérico se necessário
- Atualização automática quando o nome é alterado

## ✅ Sistema de Exclusão de Contas IMPLEMENTADO

### Endpoint de Exclusão Definitiva (HARD DELETE)
```javascript
// Exclusão permanente para administradores
app.delete('/api/models/:id/permanent', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Encontrar e verificar o modelo
    const model = await Model.findById(id);
    if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
    
    // 2. Encontrar usuário associado
    const user = await User.findOne({ email: model.email });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    // 3. Prevenir exclusão de admin
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Não é possível excluir administradores' });
    }
    
    // 4. Remover dados associados
    await Listing.deleteMany({ email: model.email });
    await Favorite.deleteMany({ $or: [{ modelId: id }, { userId: user._id }] });
    await Review.deleteMany({ modelId: id });
    await ModelStat.deleteMany({ modelId: id });
    
    // 5. Excluir permanentemente
    await Model.findByIdAndDelete(id);
    await User.findByIdAndDelete(user._id);
    
    res.json({ message: 'Conta e dados associados excluídos permanentemente' });
    
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

### Endpoint de Desativação Existente (SOFT DELETE)
```javascript
// Desativação temporária (já existente)
app.delete('/api/models/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const model = await Model.findByIdAndUpdate(
      id, 
      { active: false }, 
      { new: true }
    );
    if (!model) return res.status(404).json({ error: 'Modelo não encontrado' });
    res.json({ message: 'Modelo desativado com sucesso', model });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

## 📋 Fluxo Completo de Gestão

### 1. Criação de Modelo
```bash
# Request
POST /api/admin/users
{
  "name": "Ana Silva",
  "email": "ana@email.com"
}

# Response
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Ana Silva",
  "email": "ana@email.com",
  "role": "model",
  "generatedPassword": "a1b2c3d4"
}
```

### 2. Primeiro Acesso da Modelo
1. Administrador partilha: Email + Senha gerada
2. Modelo faz login em `/login`
3. Modelo acede à área reservada `/reservada`
4. Modelo pode alterar senha em `/reset-password/:userId`

### 3. Gestão Diária
- **Ativar/Desativar:** Alterar campo `active` no perfil
- **Verificar:** Alterar campo `verified` 
- **Destaque:** Alterar campo `featured`
- **Estatísticas:** Monitorizar através do dashboard admin

### 4. Exclusão de Conta (IMPLEMENTADO)
```bash
# Request - Exclusão Definitiva
DELETE /api/models/507f1f77bcf86cd799439011/permanent

# Response
{ "message": "Conta e dados associados excluídos permanentemente" }

# Request - Desativação (Soft Delete)
DELETE /api/models/507f1f77bcf86cd799439011

# Response
{ "message": "Modelo desativado com sucesso", "model": { ... } }
```

## 🔐 Permissões e Segurança

### Middlewares Implementados
- `auth('admin')` - Acesso restrito a administradores
- `auth('model')` - Acesso restrito a modelos  
- `adminOrSelfAuth()` - Admin ou próprio usuário
- `modelResourceAuth()` - Valida acesso a recursos específicos

### Validações de Segurança
- Hash de senhas com bcrypt
- Tokens JWT com expiração
- Rate limiting em endpoints de login
- Validação de email único
- Verificação de permissões em todas as operações

## ✅ Funcionalidades Implementadas

1. **✅ Slugs/URLs amigáveis** - Sistema completo implementado
2. **✅ Exclusão de contas** - Endpoints de hard delete e soft delete
3. **✅ Backup automático** - Sistema diário com retenção de 7 dias
4. **✅ Algoritmo de prioridade de perfis** - Sistema de scoring implementado
5. **❌ Logs de auditoria** - Não implementado

## ✅ Algoritmo de Prioridade de Perfis IMPLEMENTADO

### Sistema de Scoring Automático

O algoritmo calcula automaticamente um score de prioridade para cada perfil de modelo com base em múltiplos fatores:

#### Função de Cálculo de Score
```javascript
// Verificação removida do algoritmo: todos os perfis são verificados
function calculateModelPriorityScore(model, config) {
  let score = 0;
  const cfg = config || {
    timeGrowthPerDay: 1.5,       // benefício de tempo cresce por dia
    timeMaxBoost: 150,           // teto do benefício de tempo
    featuredBoost: 40,
    activeBoost: 20,
    stats: { viewsPerPoint: 200, likesPerPoint: 20, callsPerPoint: 10, engagementMultiplier: 1 },
    content: { photoWeight: 3, maxPhotosWeight: 15, primaryPhotoBonus: 10 },
    completeness: { name: 10, bio: 10, bioMinLength: 50, phone: 10, social: 10, photos: 10, photosMinCount: 3 },
    recentUpdateBonusDays: 3,
    recentUpdateBonus: 10,
  };

  if (model.featured) score += cfg.featuredBoost;
  if (model.active) score += cfg.activeBoost;

  const stats = model.stats || {};
  score += Math.floor((stats.totalViews || 0) / cfg.stats.viewsPerPoint);
  score += Math.floor((stats.totalLikes || 0) / cfg.stats.likesPerPoint);
  score += Math.floor((stats.totalCalls || 0) / cfg.stats.callsPerPoint);
  score += Math.floor((stats.engagementRate || 0) * cfg.stats.engagementMultiplier);

  const numPhotos = Array.isArray(model.photos) ? model.photos.length : 0;
  score += Math.min(numPhotos * cfg.content.photoWeight, cfg.content.maxPhotosWeight);
  const hasPrimaryPhoto = (model.photos || []).some(p => p.isPrimary);
  if (hasPrimaryPhoto) score += cfg.content.primaryPhotoBonus;

  // Benefício de tempo: perfis mais antigos sobem gradualmente
  if (model.createdAt) {
    const days = Math.floor((new Date() - new Date(model.createdAt)) / (1000 * 60 * 60 * 24));
    const timeBoost = Math.min(Math.floor(days * cfg.timeGrowthPerDay), cfg.timeMaxBoost);
    score += Math.max(0, timeBoost);
  }

  if (model.updatedAt) {
    const sinceUpd = Math.floor((new Date() - new Date(model.updatedAt)) / (1000 * 60 * 60 * 24));
    if (sinceUpd < cfg.recentUpdateBonusDays) score += cfg.recentUpdateBonus;
  }

  let completeness = 0;
  if (model.name) completeness += cfg.completeness.name;
  if ((model.bio || '').length >= cfg.completeness.bioMinLength) completeness += cfg.completeness.bio;
  if (model.phone) completeness += cfg.completeness.phone;
  const hasSocial = !!(model.socialMedia && (model.socialMedia.instagram || model.socialMedia.twitter || model.socialMedia.tiktok));
  if (hasSocial) completeness += cfg.completeness.social;
  if (numPhotos >= cfg.completeness.photosMinCount) completeness += cfg.completeness.photos;
  score += completeness;

  return Math.max(0, score);
}
```

### Endpoint de Listagem com Ordenação por Prioridade

**Endpoint:** `GET /api/models`
**Parâmetros:**
- `sortBy` (opcional): `priority` (padrão), `name`, `createdAt`

**Exemplo de Uso:**
```bash
# Listar modelos ordenados por prioridade (padrão)
GET /api/models

# Listar modelos ordenados por nome
GET /api/models?sortBy=name

# Listar modelos ordenados por data de criação
GET /api/models?sortBy=createdAt
```

**Resposta:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Ana Silva",
    "email": "ana@email.com",
    "verified": true,
    "featured": true,
    "priorityScore": 285,
    "stats": {
      "totalViews": 1250,
      "totalLikes": 89,
      "totalCalls": 23,
      "engagementRate": 7.1
    },
    "photos": [
      { "url": "...", "isPrimary": true }
    ]
  },
  {
    "_id": "507f1f77bcf86cd799439012", 
    "name": "Maria Santos",
    "email": "maria@email.com",
    "verified": false,
    "featured": false,
    "priorityScore": 120,
    "stats": {
      "totalViews": 450,
      "totalLikes": 32,
      "totalCalls": 8,
      "engagementRate": 5.2
    },
    "photos": []
  }
]
```

### Fatores de Priorização

| Fator | Peso | Descrição |
|-------|------|-----------|
| **Destaque** | Alto (+40) | Perfis destacados manualmente |
| **Atividade** | Médio (+20) | Perfis ativos no sistema |
| **Estatísticas** | Variável | Views, likes, calls, engagement |
| **Conteúdo** | Médio | Número de fotos e foto principal |
| **Tempo** | Crescente | Perfis mais antigos acumulam benefício diário |
| **Atualização** | Pequeno | Bônus por atualização recente |
| **Completude** | Médio | Nome, bio, telefone, redes, fotos |

### Controlo Administrativo do Algoritmo

Admin pode ajustar os pesos e parâmetros via API:

**Endpoints:**
- `GET /api/admin/priority-config` — obtém configuração atual
- `PUT /api/admin/priority-config` — atualiza configuração (upsert)

**Payload de exemplo (PUT):**
```json
{
  "timeGrowthPerDay": 2,
  "timeMaxBoost": 200,
  "featuredBoost": 50,
  "activeBoost": 20,
  "stats": { "viewsPerPoint": 150, "likesPerPoint": 15, "callsPerPoint": 8, "engagementMultiplier": 1 },
  "content": { "photoWeight": 4, "maxPhotosWeight": 20, "primaryPhotoBonus": 12 },
  "completeness": { "name": 10, "bio": 10, "bioMinLength": 60, "phone": 10, "social": 10, "photos": 10, "photosMinCount": 3 },
  "recentUpdateBonusDays": 3,
  "recentUpdateBonus": 10
}
```

### Benefícios do Sistema

1. **Ranking Automático** - Ordenação inteligente sem intervenção manual
2. **Incentivo à Qualidade** - Perfis completos e engajados são recompensados  
3. **Justiça Algorítmica** - Sistema objetivo baseado em métricas mensuráveis
4. **Flexibilidade** - Diferentes critérios de ordenação disponíveis

## 📈 Próximas Melhorias Sugeridas

### Prioridade Alta
1. **✅ Implementar sistema de slugs** para URLs amigáveis - CONCLUÍDO
2. **✅ Criar endpoint de exclusão** de contas - CONCLUÍDO
3. **✅ Implementar algoritmo de prioridade** de perfis - CONCLUÍDO
4. **Adicionar logs** de todas as operações administrativas

### Prioridade Média  
5. **✅ Sistema de backup** automático de dados - CONCLUÍDO
6. **Validação de dados** mais robusta
7. **API documentation** with Swagger

## ✅ Sistema de Backup Automático IMPLEMENTADO

### Funcionalidades do Sistema de Backup:

#### 1. Backup Diário Automático
- Executa automaticamente às 2h da manhã
- Mantém histórico dos últimos 7 backups
- Diretório: `./backups/`

#### 2. Endpoints Administrativos
```javascript
// Acionar backup manualmente
app.post('/api/admin/backup', auth('admin'), async (req, res) => {
  try {
    const result = await createDatabaseBackup();
    res.json({ message: 'Backup criado com sucesso', backup: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar backups disponíveis
app.get('/api/admin/backups', auth('admin'), async (req, res) => {
  try {
    const backups = await fs.readdir('./backups');
    const backupFiles = backups
      .filter(file => file.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 10);
    res.json({ backups: backupFiles });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

#### 3. Dados Incluídos no Backup
- Model (perfis de modelos)
- User (usuários do sistema)  
- Listing (anúncios/listagens)
- Review (avaliações)
- Stat (estatísticas)
- ModelStat (estatísticas de modelos)
- Favorite (favoritos)

#### 4. Nomeação e Retenção
- Nome do arquivo: `backup-YYYY-MM-DD-HH-MM-SS.json`
- Retenção automática: últimos 7 backups
- Exclusão automática de backups mais antigos

### Prioridade Baixa
7. **Sistema de notificações** por email
8. **Two-factor authentication**
9. **Auditoria de segurança** completa

## 🆘 Suporte Técnico

### URLs Importantes
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Admin Login:** `/login` (admin@site.test / admin123)
- **Área Admin:** `/admin`
- **Reset Password:** `/reset-password/:userId`

### Dados de Teste
```javascript
// Admin
Email: admin@site.test
Password: admin123

// Demo Model  
Email: demo@site.test
Password: demo123
```

### Comandos Úteis
```bash
# Reiniciar servidor backend
cd backend && npm start

# Reiniciar frontend  
cd frontend && npm run dev

# Executar testes
cd backend && npm test

# Repopular base de dados
cd backend && node populate-database.js
```

---
*Documento atualizado em: {{DATA_ATUAL}}*
*Sistema versão: 1.0.0*