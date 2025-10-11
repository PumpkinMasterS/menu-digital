const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function getConnectionString() {
  const direct = (process.env.SUPABASE_DB_CONNECTION_STRING || process.env.DATABASE_URL || '').trim();
  if (direct) return direct;

  const poolerTemplatePath = path.resolve('supabase/.temp/pooler-url');
  if (!fs.existsSync(poolerTemplatePath)) {
    console.error('❌ Arquivo de template do pooler não encontrado: supabase/.temp/pooler-url');
    console.error('   Dica: copie sua "Pooled connection string" do dashboard do Supabase para esse arquivo OU defina SUPABASE_DB_CONNECTION_STRING no .env');
    return null;
  }

  const template = fs.readFileSync(poolerTemplatePath, 'utf8').trim();

  // Se o template já veio com a senha (sem placeholder), use-o diretamente
  if (!template.includes('[YOUR-PASSWORD]')) {
    return template;
  }

  const pwd = process.env.SUPABASE_DB_PASSWORD;
  if (!pwd) {
    console.error('❌ Variável de ambiente SUPABASE_DB_PASSWORD ausente no .env');
    console.error('   Dica: use a senha do banco (Database password), NÃO a service role key.');
    console.error('   Alternativa: defina SUPABASE_DB_CONNECTION_STRING diretamente no .env ou substitua [YOUR-PASSWORD] no arquivo supabase/.temp/pooler-url.');
    return null;
  }

  const encodedPwd = encodeURIComponent(pwd);
  return template.replace('[YOUR-PASSWORD]', encodedPwd);
}

async function executeSQLFixes() {
  // Allow passing a custom SQL file path via CLI arg, fallback to supabase-manual-fixes.sql
  const cliArgPath = process.argv[2];
  const sqlFilePath = cliArgPath
    ? path.resolve(cliArgPath)
    : path.resolve('supabase-manual-fixes.sql');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ SQL file not found: ${sqlFilePath}`);
    console.error('Usage: node execute-sql-fixes.cjs <path-to-sql-file>');
    process.exit(1);
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    process.exit(1);
  }

  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to Supabase database (pooler)...');
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log(`📄 Loading SQL file: ${sqlFilePath}`);
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🔧 Executing SQL (entire file in a single session)...');

    try {
      await client.query(sqlContent);
      console.log('✅ SQL file executed successfully');
    } catch (error) {
      console.log('⚠️  Execution error (some statements may still have run):', error.message);
    }

    console.log('🎉 SQL processing completed!');

    console.log('\n🧪 Verifying storage.objects policies for content_files...');
    const verifyQuery = `
      SELECT 
        p.polname AS policy,
        p.polcmd AS command,
        pg_get_userbyid(role_oid) AS role,
        pg_get_expr(p.polqual, p.polrelid) AS using_expr,
        pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      CROSS JOIN LATERAL unnest(p.polroles) AS role_oid
      WHERE n.nspname = 'storage'
        AND c.relname = 'objects'
        AND p.polname LIKE 'content_files%'
      ORDER BY p.polname, command;
    `;

    try {
      const res = await client.query(verifyQuery);
      if (res.rows.length === 0) {
        console.log('❌ No content_files policies found on storage.objects');
      } else {
        console.log('✅ Policies found:');
        for (const row of res.rows) {
          console.log(` - ${row.policy} [${row.command}] role=${row.role}`);
          if (row.using_expr) console.log(`   USING: ${row.using_expr}`);
          if (row.with_check_expr) console.log(`   WITH CHECK: ${row.with_check_expr}`);
        }
      }
    } catch (err) {
      console.log('⚠️  Could not verify policies:', err.message);
    }

    console.log('\n🧪 Quick sanity checks...');
    try {
      const schoolsResult = await client.query('SELECT COUNT(*) as count FROM schools');
      console.log(`✅ Schools table: ${schoolsResult.rows[0].count} records`);
    } catch (error) {
      console.log('❌ Schools table error:', error.message);
    }

    try {
      const classesResult = await client.query('SELECT COUNT(*) as count FROM classes');
      console.log(`✅ Classes table: ${classesResult.rows[0].count} records`);
    } catch (error) {
      console.log('❌ Classes table error:', error.message);
    }

    try {
      const subjectsResult = await client.query('SELECT COUNT(*) as count FROM subjects');
      console.log(`✅ Subjects table: ${subjectsResult.rows[0].count} records`);
    } catch (error) {
      console.log('❌ Subjects table error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

executeSQLFixes();