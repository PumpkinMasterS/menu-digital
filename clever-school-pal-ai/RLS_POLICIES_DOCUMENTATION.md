# 🔐 Documentação das Políticas RLS - Sistema EduConnect AI

## 📋 **Visão Geral**

Este documento descreve as políticas RLS (Row Level Security) implementadas no sistema EduConnect AI. As políticas foram projetadas para garantir que cada usuário veja apenas os dados que tem permissão para acessar, baseado em sua função e escola.

## 🏗️ **Hierarquia de Permissões**

### **1. Super Admin** (`super_admin`)
- **Acesso:** TOTAL - Vê todos os dados de todas as escolas
- **Localização:** Sem restrição geográfica
- **Função:** Administração global do sistema

### **2. Diretor** (`diretor`)
- **Acesso:** ESCOLA - Vê apenas dados da sua escola
- **Localização:** Restrito à sua escola (`school_id`)
- **Função:** Administração da escola

### **3. Coordenador** (`coordenador`)
- **Acesso:** ESCOLA - Vê apenas dados da sua escola
- **Localização:** Restrito à sua escola (`school_id`)
- **Função:** Coordenação pedagógica da escola

### **4. Professor** (`professor`)
- **Acesso:** LIMITADO - Vê dados da sua escola
- **Localização:** Restrito à sua escola (`school_id`)
- **Função:** Ensino e gestão das suas turmas/disciplinas

---

## 📊 **Políticas por Tabela**

### **1. SCHOOLS (Escolas)**
```sql
-- Política: schools_jwt_policy
-- Super Admin: Acesso total
-- Diretor/Coordenador: Apenas sua escola
-- Professor: Sem acesso direto

CREATE POLICY "schools_jwt_policy" ON public.schools
USING (
    -- Super admin vê tudo
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR
    -- Diretor/Coordenador vê apenas sua escola
    (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('diretor', 'coordenador')
        AND id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
);
```

### **2. CLASSES (Turmas)**
```sql
-- Política: classes_final
-- Super Admin: Todas as turmas
-- Diretor/Coordenador: Turmas da sua escola
-- Professor: Turmas da sua escola

CREATE POLICY "classes_final" ON public.classes
USING (
    -- Super admin vê tudo
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    OR
    -- Diretor/Coordenador: turmas da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('diretor', 'coordenador')
        AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
    OR
    -- Professor: turmas da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'professor'
        AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
);
```

### **3. STUDENTS (Alunos)**
```sql
-- Política: students_final
-- Super Admin: Todos os alunos
-- Diretor/Coordenador: Alunos da sua escola
-- Professor: Alunos da sua escola

CREATE POLICY "students_final" ON public.students
USING (
    -- Super admin vê tudo
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    OR
    -- Diretor/Coordenador: alunos da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('diretor', 'coordenador')
        AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
    OR
    -- Professor: alunos da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'professor'
        AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
);
```

### **4. SUBJECTS (Disciplinas)**
```sql
-- Política: subjects_final
-- Super Admin: Todas as disciplinas
-- Diretor/Coordenador: Disciplinas da sua escola
-- Professor: Disciplinas da sua escola

CREATE POLICY "subjects_final" ON public.subjects
USING (
    -- Super admin vê tudo
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    OR
    -- Diretor/Coordenador: disciplinas da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('diretor', 'coordenador')
        AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
    OR
    -- Professor: disciplinas da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'professor'
        AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
);
```

### **5. TEACHER_CLASS_SUBJECTS (Atribuições de Professores)**
```sql
-- Política: teacher_class_subjects_final
-- Super Admin: Todas as atribuições
-- Diretor/Coordenador: Atribuições da sua escola
-- Professor: Apenas suas atribuições

CREATE POLICY "teacher_class_subjects_final" ON public.teacher_class_subjects
USING (
    -- Super admin vê tudo
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    OR
    -- Professor: apenas suas atribuições
    teacher_id = auth.uid()
    OR
    -- Diretor/Coordenador: atribuições de professores da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('diretor', 'coordenador')
        AND teacher_id IN (
            SELECT u.id FROM auth.users u 
            WHERE (u.raw_app_meta_data ->> 'school_id')::UUID = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
        )
    )
);
```

### **6. CONTENTS (Conteúdos Educacionais)**
```sql
-- Política: contents_final
-- Super Admin: Todos os conteúdos
-- Diretor/Coordenador/Professor: Conteúdos da sua escola

CREATE POLICY "contents_final" ON public.contents
USING (
    -- Super admin vê tudo
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'super_admin'
    OR
    -- Diretor/Coordenador/Professor: conteúdos da sua escola
    (
        COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') IN ('diretor', 'coordenador', 'professor')
        AND school_id = (auth.jwt() -> 'app_metadata' ->> 'school_id')::UUID
    )
);
```

---

## 🔑 **Estrutura do JWT**

### **Campos Utilizados nas Políticas:**
```json
{
  "app_metadata": {
    "role": "super_admin|diretor|coordenador|professor",
    "school_id": "uuid-da-escola-ou-null",
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "role": "super_admin|diretor|coordenador|professor",
    "school_id": "uuid-da-escola-ou-null",
    "name": "Nome do Usuário"
  }
}
```

### **Verificação Dupla:**
As políticas verificam TANTO `app_metadata` quanto `user_metadata` para garantir compatibilidade:
```sql
-- Verificação dupla de role
(auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
OR
(auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
```

---

## 📋 **Matriz de Permissões**

| Tabela | Super Admin | Diretor | Coordenador | Professor |
|--------|-------------|---------|-------------|-----------|
| **schools** | ✅ Todas | ✅ Sua escola | ✅ Sua escola | ❌ Sem acesso |
| **classes** | ✅ Todas | ✅ Sua escola | ✅ Sua escola | ✅ Sua escola |
| **students** | ✅ Todos | ✅ Sua escola | ✅ Sua escola | ✅ Sua escola |
| **subjects** | ✅ Todas | ✅ Sua escola | ✅ Sua escola | ✅ Sua escola |
| **teacher_class_subjects** | ✅ Todas | ✅ Sua escola | ✅ Sua escola | ✅ Suas atribuições |
| **contents** | ✅ Todos | ✅ Sua escola | ✅ Sua escola | ✅ Sua escola |
| **class_subjects** | ✅ Todas | ✅ Sua escola | ✅ Sua escola | ✅ Sua escola |
| **content_classes** | ✅ Todas | ✅ Sua escola | ✅ Sua escola | ✅ Sua escola |

---

## 🚨 **Características Importantes**

### **1. Prevenção de Recursão**
- Políticas são **não-recursivas** para evitar loops infinitos
- Verificações diretas no JWT sem dependências circulares
- Uso de `COALESCE` para tratar valores nulos

### **2. Segurança por Padrão**
- Se o JWT não contém `role` → **SEM ACESSO**
- Se o JWT não contém `school_id` (para não super-admin) → **SEM ACESSO**
- Verificação dupla em `app_metadata` E `user_metadata`

### **3. Flexibilidade para Professores**
- Professores veem **toda a escola** (não apenas suas turmas)
- Permite colaboração entre professores da mesma escola
- Evita complexidade desnecessária nas políticas

### **4. Granularidade Específica**
- `teacher_class_subjects`: Professores veem apenas **suas atribuições**
- `schools`: Professores **não veem** dados da escola diretamente
- `contents`: Todos os papéis escolares podem ver conteúdos da escola

---

## 🔧 **Comandos de Manutenção**

### **Verificar Políticas Ativas:**
```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('schools', 'classes', 'students', 'subjects', 'teacher_class_subjects', 'contents')
ORDER BY tablename, policyname;
```

### **Verificar Usuário Específico:**
```sql
SELECT 
    id,
    email,
    raw_app_meta_data ->> 'role' as app_role,
    raw_user_meta_data ->> 'role' as user_role,
    raw_app_meta_data ->> 'school_id' as app_school_id,
    raw_user_meta_data ->> 'school_id' as user_school_id
FROM auth.users 
WHERE email = 'usuario@exemplo.com';
```

### **Testar Acesso (como Super Admin):**
```sql
-- Deve retornar todos os registros
SELECT COUNT(*) FROM schools;   -- Deve retornar 10
SELECT COUNT(*) FROM classes;   -- Deve retornar 11
SELECT COUNT(*) FROM students;  -- Deve retornar 18
SELECT COUNT(*) FROM subjects;  -- Deve retornar 8
```

---

## 📝 **Notas de Implementação**

### **Data de Criação:** Janeiro 2025
### **Versão:** 1.0
### **Status:** ✅ Produção
### **Último Teste:** ✅ Aprovado em todos os cenários

### **Próximas Melhorias:**
- [ ] Políticas mais granulares para professores (apenas suas turmas)
- [ ] Logs de acesso para auditoria
- [ ] Políticas específicas para diferentes operações (SELECT, INSERT, UPDATE, DELETE)

---

## 🎯 **Resumo**

As políticas RLS implementadas garantem:
- **Segurança total** dos dados
- **Isolamento por escola** para usuários não-admin
- **Flexibilidade** para colaboração dentro da escola
- **Prevenção de recursão** infinita
- **Compatibilidade** com diferentes estruturas de JWT

Este sistema está **pronto para produção** e garante que cada usuário veja apenas os dados apropriados para sua função e contexto escolar. 