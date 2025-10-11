# 🔧 Unificação de Roles - Sistema Deliver Eat Now

## 📅 Data da Unificação
8 de Outubro de 2025

## 🎯 Objetivo
Unificar a nomenclatura de roles no sistema para usar apenas `platform_owner` em vez de `platform_admin`, evitando inconsistências e problemas futuros.

## 📋 Roles Oficiais do Sistema

### ✅ **Roles Padronizados**
1. **`platform_owner`** - Dono da plataforma (acesso total)
2. **`super_admin`** - Administrador global
3. **`restaurant_admin`** - Administrador de restaurante
4. **`kitchen`** - Staff da cozinha
5. **`driver`** - Motorista
6. **`customer`** - Cliente

### ❌ **Role Removido**
- **`platform_admin`** - Removido em favor de `platform_owner`

## 🔧 Alterações Realizadas

### 1. **Edge Functions**
- **Arquivo**: `supabase/functions/admin-create-user/index.ts`
- **Mudança**: Removido `platform_admin` da lista de roles válidos
- **Resultado**: Apenas `platform_owner` é aceito

### 2. **Tipos do Banco de Dados**
- **Arquivo**: `src/lib/database.types.ts`
- **Mudança**: Removido `platform_admin` do enum `app_role`
- **Resultado**: Type safety garantido

### 3. **Validações no Frontend**
- **Arquivos**: Componentes de autenticação e dashboards
- **Mudança**: Todos os checks agora usam apenas `platform_owner`
- **Resultado**: Consistência na validação de permissões

## 📊 Impacto da Mudança

### ✅ **Benefícios**
1. **Consistência** - Um único nome para o role de maior nível
2. **Manutenibilidade** - Menos chances de erros de digitação
3. **Clareza** - Nome mais descritivo (`platform_owner` vs `platform_admin`)
4. **Type Safety** - TypeScript garante uso correto

### ⚠️ **Considerações**
1. **Dados Existentes** - Usuários com `platform_admin` precisam ser migrados
2. **Documentação** - Atualizar toda a documentação para refletir a mudança
3. **Testes** - Verificar que todos os fluxos funcionam com `platform_owner`

## 🔄 Migração de Dados

### **SQL para Migração**
```sql
-- Atualizar usuários existentes com platform_admin para platform_owner
UPDATE profiles 
SET role = 'platform_owner' 
WHERE role = 'platform_admin';

-- Atualizar user_roles se existir
UPDATE user_roles 
SET role_id = (SELECT id FROM roles WHERE name = 'platform_owner')
WHERE role_id = (SELECT id FROM roles WHERE name = 'platform_admin');
```

## 📝 Recomendações

### 1. **Atualizar Credenciais de Teste**
- Usar `platform_owner` em todos os scripts de teste
- Atualizar documentação de desenvolvimento

### 2. **Verificar Dashboards**
- Confirmar que AdminDashboard funciona com `platform_owner`
- Testar fluxos de criação de usuários

### 3. **Atualizar Documentação**
- README.md
- GUIA_INICIALIZACAO.md
- Documentação de API

## ✅ **Status da Unificação**

- [x] Edge Functions atualizadas
- [x] Types do banco de dados corrigidos
- [x] Validações no frontend unificadas
- [ ] Dados existentes migrados
- [ ] Documentação atualizada
- [ ] Testes verificados

## 🚀 **Próximos Passos**

1. **Executar migração SQL** no Supabase
2. **Testar todos os fluxos** com `platform_owner`
3. **Atualizar documentação** restante
4. **Remover referências antigas** ao `platform_admin`

---

**Nota**: Esta unificação melhora a consistência do sistema e reduz a probabilidade de erros futuros relacionados à gestão de permissões.

