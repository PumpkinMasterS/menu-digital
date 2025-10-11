const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables:');
    console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
    console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeServiceRoleFix() {
    console.log('Executing Discord service role RLS fix...');
    
    try {
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'fix-discord-service-role-policy.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('SQL file loaded successfully');
        
        // Split SQL into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim() === '') continue;
            
            console.log(`Executing statement ${i + 1}/${statements.length}...`);
            console.log(`Statement: ${statement.substring(0, 100)}...`);
            
            try {
                // Use the REST API directly to execute SQL
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey
                    },
                    body: JSON.stringify({ sql: statement })
                });
                
                if (!response.ok) {
                    // Try alternative approach using query parameter
                    const altResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec?sql=${encodeURIComponent(statement)}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${supabaseServiceKey}`,
                            'apikey': supabaseServiceKey
                        }
                    });
                    
                    if (!altResponse.ok) {
                        console.error(`Failed to execute statement ${i + 1}:`, await response.text());
                        continue;
                    }
                }
                
                console.log(`✓ Statement ${i + 1} executed successfully`);
                
            } catch (error) {
                console.error(`Error executing statement ${i + 1}:`, error.message);
            }
        }
        
        console.log('\n✅ Discord service role RLS fix completed!');
        console.log('The Discord bot should now be able to insert into discord_interactions table.');
        
    } catch (error) {
        console.error('❌ Failed to execute service role fix:', error);
    }
}

// Test the fix by attempting an insert
async function testFix() {
    console.log('\nTesting the fix...');
    
    try {
        const testInsert = {
            user_id: 'test_user_123',
            guild_id: 'test_guild_123', 
            channel_id: 'test_channel_123',
            message_content: 'Test message from service role',
            interaction_type: 'message'
        };
        
        const { data, error } = await supabase
            .from('discord_interactions')
            .insert(testInsert)
            .select();
            
        if (error) {
            console.error('❌ Test insert failed:', error);
        } else {
            console.log('✅ Test insert successful! Data:', data);
            
            // Clean up test data
            if (data && data[0]) {
                await supabase
                    .from('discord_interactions')
                    .delete()
                    .eq('id', data[0].id);
                console.log('✅ Test data cleaned up');
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function main() {
    await executeServiceRoleFix();
    await testFix();
}

main();