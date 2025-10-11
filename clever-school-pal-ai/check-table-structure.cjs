const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTableStructure() {
  try {
    const tables = ['contents', 'classes', 'students', 'subjects', 'admin_users'];
    
    for (const table of tables) {
      console.log(`\n=== ${table.toUpperCase()} TABLE STRUCTURE ===`);
      
      try {
        // Try to select from the table to see what columns exist
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`Error accessing ${table}:`, error.message);
        } else {
          if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`Columns found: ${columns.join(', ')}`);
            
            // Check specifically for school_id
            if (columns.includes('school_id')) {
              console.log('✅ HAS school_id column');
            } else {
              console.log('❌ NO school_id column');
            }
          } else {
            console.log('Table exists but is empty - trying to get structure differently');
            
            // Try inserting and rolling back to see structure
            const { error: insertError } = await supabase
              .from(table)
              .insert({});
            
            if (insertError) {
              console.log('Insert error (shows required columns):', insertError.message);
            }
          }
        }
      } catch (tableError) {
        console.error(`Error with table ${table}:`, tableError.message);
      }
    }
    
    console.log('\n=== TABLE STRUCTURE CHECK COMPLETE ===');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTableStructure();