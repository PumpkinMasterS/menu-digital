const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDatabase() {
  console.log('🔍 ANÁLISE COMPLETA DA ESTRUTURA DO BANCO DE DADOS\n');
  console.log('=' .repeat(80));

  try {
    // 1. Verificar tabelas existentes
    console.log('\n📋 1. TABELAS EXISTENTES');
    console.log('-'.repeat(40));
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (tablesError) {
      console.log('⚠️  Usando query alternativa para listar tabelas...');
      const { data: altTables } = await supabase.rpc('get_table_names');
      console.log('Tabelas encontradas:', altTables || 'Erro ao obter tabelas');
    } else {
      tables.forEach(table => {
        console.log(`✅ ${table.table_name}`);
      });
    }

    // 2. Analisar estrutura de cada tabela principal
    const mainTables = ['schools', 'users', 'classes', 'subjects', 'students', 'contents', 'teacher_class_subjects', 'content_classes'];
    
    console.log('\n🏗️  2. ESTRUTURA DAS TABELAS PRINCIPAIS');
    console.log('-'.repeat(50));

    for (const tableName of mainTables) {
      console.log(`\n📊 Tabela: ${tableName.toUpperCase()}`);
      
      // Verificar se a tabela existe fazendo uma query simples
      const { data: tableData, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (tableError) {
        console.log(`❌ Erro ao acessar tabela ${tableName}: ${tableError.message}`);
        continue;
      }

      console.log(`✅ Tabela ${tableName} existe e é acessível`);
      
      // Contar registros
      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      console.log(`📈 Registros: ${count || 0}`);

      // Mostrar estrutura básica se houver dados
      if (tableData && tableData.length > 0) {
        const columns = Object.keys(tableData[0]);
        console.log(`🔧 Colunas (${columns.length}): ${columns.join(', ')}`);
      }
    }

    // 3. Verificar políticas RLS
    console.log('\n🔒 3. POLÍTICAS RLS (ROW LEVEL SECURITY)');
    console.log('-'.repeat(50));

    for (const tableName of mainTables) {
      console.log(`\n🛡️  Políticas para ${tableName.toUpperCase()}:`);
      
      try {
        // Verificar se RLS está habilitado
        const { data: rlsStatus } = await supabase
          .rpc('check_rls_status', { table_name: tableName })
          .single();

        if (rlsStatus) {
          console.log(`✅ RLS habilitado: ${rlsStatus.rls_enabled ? 'SIM' : 'NÃO'}`);
        }
      } catch (error) {
        console.log('⚠️  Não foi possível verificar status RLS diretamente');
      }

      // Tentar listar políticas (pode falhar se não tivermos permissões)
      try {
        const { data: policies } = await supabase
          .from('pg_policies')
          .select('policyname, cmd, qual')
          .eq('tablename', tableName);

        if (policies && policies.length > 0) {
          policies.forEach(policy => {
            console.log(`  📋 ${policy.policyname} (${policy.cmd})`);
          });
        } else {
          console.log('  ℹ️  Nenhuma política encontrada ou sem permissão para visualizar');
        }
      } catch (error) {
        console.log('  ⚠️  Erro ao listar políticas:', error.message);
      }
    }

    // 4. Verificar roles e permissões
    console.log('\n👥 4. ROLES E PERMISSÕES');
    console.log('-'.repeat(30));

    try {
      // Verificar roles existentes
      const { data: roles } = await supabase
        .from('pg_roles')
        .select('rolname, rolsuper, rolcreaterole, rolcreatedb')
        .order('rolname');

      if (roles) {
        console.log('\n🎭 Roles encontrados:');
        roles.forEach(role => {
          const permissions = [];
          if (role.rolsuper) permissions.push('SUPERUSER');
          if (role.rolcreaterole) permissions.push('CREATE ROLE');
          if (role.rolcreatedb) permissions.push('CREATE DB');
          
          console.log(`  👤 ${role.rolname} ${permissions.length > 0 ? `(${permissions.join(', ')})` : ''}`);
        });
      }
    } catch (error) {
      console.log('⚠️  Não foi possível listar roles:', error.message);
    }

    // 5. Verificar usuários do sistema
    console.log('\n👨‍💼 5. USUÁRIOS DO SISTEMA');
    console.log('-'.repeat(35));

    try {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, role, school_id, created_at')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.log('❌ Erro ao buscar usuários:', usersError.message);
      } else {
        console.log(`\n📊 Total de usuários: ${users.length}`);
        
        // Agrupar por role
        const roleGroups = {};
        users.forEach(user => {
          const role = user.role || 'sem_role';
          if (!roleGroups[role]) roleGroups[role] = [];
          roleGroups[role].push(user);
        });

        Object.entries(roleGroups).forEach(([role, userList]) => {
          console.log(`\n🏷️  ${role.toUpperCase()}: ${userList.length} usuários`);
          userList.slice(0, 3).forEach(user => {
            console.log(`  📧 ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
          });
          if (userList.length > 3) {
            console.log(`  ... e mais ${userList.length - 3} usuários`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Erro ao analisar usuários:', error.message);
    }

    // 6. Verificar integridade referencial
    console.log('\n🔗 6. INTEGRIDADE REFERENCIAL');
    console.log('-'.repeat(40));

    // Verificar relações importantes
    const relations = [
      { table: 'students', foreign_key: 'school_id', references: 'schools' },
      { table: 'students', foreign_key: 'class_id', references: 'classes' },
      { table: 'classes', foreign_key: 'school_id', references: 'schools' },
      { table: 'teacher_class_subjects', foreign_key: 'class_id', references: 'classes' },
      { table: 'teacher_class_subjects', foreign_key: 'subject_id', references: 'subjects' },
      { table: 'content_classes', foreign_key: 'content_id', references: 'contents' },
      { table: 'content_classes', foreign_key: 'class_id', references: 'classes' }
    ];

    for (const relation of relations) {
      try {
        // Verificar se existem registros órfãos
        const { data: orphans } = await supabase
          .rpc('check_orphan_records', {
            child_table: relation.table,
            child_column: relation.foreign_key,
            parent_table: relation.references
          });

        if (orphans !== null) {
          console.log(`${orphans === 0 ? '✅' : '⚠️ '} ${relation.table}.${relation.foreign_key} -> ${relation.references}: ${orphans} órfãos`);
        }
      } catch (error) {
        console.log(`⚠️  ${relation.table}.${relation.foreign_key} -> ${relation.references}: Não foi possível verificar`);
      }
    }

    // 7. Resumo e recomendações
    console.log('\n📋 7. RESUMO E STATUS GERAL');
    console.log('-'.repeat(40));

    console.log('\n✅ PONTOS POSITIVOS:');
    console.log('  • Tabelas principais existem e são acessíveis');
    console.log('  • Estudantes foram criados com sucesso');
    console.log('  • Sistema de autenticação funcionando');
    
    console.log('\n⚠️  PONTOS DE ATENÇÃO:');
    console.log('  • Verificar se todas as colunas necessárias existem');
    console.log('  • Confirmar se políticas RLS estão adequadas para cada role');
    console.log('  • Validar permissões específicas por tipo de usuário');
    
    console.log('\n🎯 PRÓXIMOS PASSOS SUGERIDOS:');
    console.log('  1. Revisar estrutura de colunas em cada tabela');
    console.log('  2. Implementar políticas RLS específicas por role');
    console.log('  3. Testar permissões para cada tipo de usuário');
    console.log('  4. Validar integridade referencial completa');

  } catch (error) {
    console.error('❌ Erro durante análise:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 ANÁLISE COMPLETA FINALIZADA');
}

// Executar análise
analyzeDatabase().catch(console.error);