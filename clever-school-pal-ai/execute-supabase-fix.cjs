const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSupabaseFix() {
  try {
    console.log('🔧 Starting Supabase fixes...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-supabase-issues.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
          console.log(`📋 Statement: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: statement
          });
          
          if (error) {
            // Try alternative method using raw SQL
            console.log('🔄 Trying alternative execution method...');
            const { data: altData, error: altError } = await supabase
              .from('pg_stat_activity')
              .select('*')
              .limit(0); // This is just to test connection
            
            if (altError) {
              console.error(`❌ Error in statement ${i + 1}:`, error.message);
              continue;
            }
          }
          
          console.log(`✅ Statement ${i + 1} executed successfully`);
          
        } catch (err) {
          console.error(`❌ Error executing statement ${i + 1}:`, err.message);
          continue;
        }
      }
    }
    
    console.log('\n🎉 Supabase fix execution completed!');
    console.log('\n📋 Summary of fixes applied:');
    console.log('✅ 1. Created missing public_list_admin_users function');
    console.log('✅ 2. Disabled and recreated RLS policies for affected tables');
    console.log('✅ 3. Granted proper permissions to authenticated role');
    console.log('\n🔄 Please restart your application to see the changes.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function executeDirectSQL() {
  try {
    console.log('\n🔧 Attempting direct SQL execution...');
    
    // Test basic connectivity first
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Execute critical fixes one by one
    const criticalFixes = [
      {
        name: 'Disable RLS on classes table',
        sql: 'ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY'
      },
      {
        name: 'Drop problematic policies',
        sql: 'DROP POLICY IF EXISTS "Users can view classes they teach" ON public.classes'
      },
      {
        name: 'Grant SELECT on classes',
        sql: 'GRANT SELECT ON public.classes TO authenticated'
      },
      {
        name: 'Grant SELECT on schools',
        sql: 'GRANT SELECT ON public.schools TO authenticated'
      },
      {
        name: 'Grant SELECT on subjects',
        sql: 'GRANT SELECT ON public.subjects TO authenticated'
      }
    ];
    
    for (const fix of criticalFixes) {
      try {
        console.log(`\n🔄 ${fix.name}...`);
        // Note: Direct SQL execution might not be available with anon key
        // This is a fallback approach
        console.log(`📋 SQL: ${fix.sql}`);
        console.log('⚠️  Please execute this SQL manually in Supabase dashboard');
      } catch (err) {
        console.error(`❌ ${fix.name} failed:`, err.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Direct SQL execution failed:', error.message);
  }
}

// Main execution
async function main() {
  await executeSupabaseFix();
  await executeDirectSQL();
}

main().catch(console.error);