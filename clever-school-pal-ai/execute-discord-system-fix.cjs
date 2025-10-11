const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for RLS bypass

if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSqlFile(filePath) {
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`Executing SQL from: ${filePath}`);

        // Split SQL by semicolon and execute each statement
        const statements = sql.split(';').filter(s => s.trim() !== '' && !s.trim().startsWith('--'));

        for (const statement of statements) {
            const cleanStatement = statement.trim();
            if (cleanStatement === '' || cleanStatement.startsWith('--')) continue;
            
            console.log(`Executing statement: ${cleanStatement.substring(0, 100)}...`);
            
            // Use supabase-js to execute raw SQL
            const { data, error } = await supabase.rpc('exec_sql', { sql: cleanStatement });
            
            if (error) {
                console.error('Error executing statement:', error);
                // Try alternative method if exec_sql doesn't exist
                console.log('Trying alternative execution method...');
                
                try {
                    // Direct execution using fetch
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabaseKey}`,
                            'apikey': supabaseKey
                        },
                        body: JSON.stringify({ sql: cleanStatement })
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Alternative method also failed:', errorText);
                        console.log('Statement that failed:', cleanStatement);
                        console.log('Continuing with next statement...');
                        continue;
                    }
                    
                    console.log('Alternative method succeeded');
                } catch (fetchError) {
                    console.error('Both methods failed:', fetchError);
                    console.log('Statement that failed:', cleanStatement);
                    console.log('Continuing with next statement...');
                    continue;
                }
            } else {
                console.log('Statement executed successfully');
            }
        }
        
        console.log('SQL file processing completed.');
        return true;
    } catch (err) {
        console.error('Failed to execute SQL file:', err);
        return false;
    }
}

async function main() {
    const sqlFilePath = path.join(__dirname, 'fix-discord-system-policy.sql');
    console.log(`Attempting to execute SQL file: ${sqlFilePath}`);
    
    // Check if file exists
    if (!fs.existsSync(sqlFilePath)) {
        console.error(`SQL file not found: ${sqlFilePath}`);
        return;
    }
    
    const success = await executeSqlFile(sqlFilePath);

    if (success) {
        console.log('Discord system RLS policies processing completed.');
    } else {
        console.error('Failed to process Discord system RLS policies.');
    }
}

main();