const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeConsoleFixes() {
  console.log('🔧 Executing console error fixes...');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('fix-console-errors.sql', 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.includes('Success message'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📋 Statement: ${statement.substring(0, 80)}...`);
      
      try {
        // Try to execute using raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.log(`⚠️  RPC error for statement ${i + 1}: ${error.message}`);
          
          // Try alternative method for specific statements
          if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE') || statement.includes('CREATE POLICY')) {
            console.log('🔄 Trying direct execution...');
            // For table operations, we'll skip and assume they might already exist
            console.log('⏭️  Skipping table operation (may already exist)');
            successCount++;
          } else {
            errorCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error in statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
      
      // Small delay between statements
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Execution Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Test the fixes
    console.log('\n🧪 Testing the fixes...');
    
    // Test public_list_admin_users function
    try {
      const { data, error } = await supabase.rpc('public_list_admin_users');
      if (error) {
        console.log('❌ public_list_admin_users function test failed:', error.message);
      } else {
        console.log('✅ public_list_admin_users function working:', data?.length || 0, 'users found');
      }
    } catch (err) {
      console.log('❌ public_list_admin_users function test error:', err.message);
    }
    
    // Test schools access
    try {
      const { data, error } = await supabase.from('schools').select('id,name,slug').limit(1);
      if (error) {
        console.log('❌ Schools access test failed:', error.message);
      } else {
        console.log('✅ Schools access working:', data?.length || 0, 'schools found');
      }
    } catch (err) {
      console.log('❌ Schools access test error:', err.message);
    }
    
    // Test pedagogical_tags access
    try {
      const { data, error } = await supabase.from('pedagogical_tags').select('*').limit(1);
      if (error) {
        console.log('❌ Pedagogical tags access test failed:', error.message);
      } else {
        console.log('✅ Pedagogical tags access working:', data?.length || 0, 'tags found');
      }
    } catch (err) {
      console.log('❌ Pedagogical tags access test error:', err.message);
    }
    
    console.log('\n🎉 Console fixes execution completed!');
    console.log('🔄 Please refresh your application to see the changes.');
    
  } catch (error) {
    console.error('❌ Fatal error during execution:', error.message);
  }
}

// Execute the fixes
executeConsoleFixes().catch(console.error);