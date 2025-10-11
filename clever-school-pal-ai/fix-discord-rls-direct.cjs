const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env file
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDiscordRLS() {
    console.log('Attempting to fix Discord RLS policies...');
    
    try {
        // Test if we can access the discord_interactions table
        console.log('Testing access to discord_interactions table...');
        const { data: testData, error: testError } = await supabase
            .from('discord_interactions')
            .select('*')
            .limit(1);
            
        if (testError) {
            console.error('Error accessing discord_interactions table:', testError);
        } else {
            console.log('Successfully accessed discord_interactions table');
            console.log('Current data count:', testData?.length || 0);
        }
        
        // Try to insert a test record with guild_id='system'
        console.log('\nTesting insert with guild_id="system"...');
        const testInsert = {
            guild_id: 'system',
            interaction_type: 'bot_control',
            message_content: 'Test system interaction',
            created_at: new Date().toISOString()
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('discord_interactions')
            .insert(testInsert)
            .select();
            
        if (insertError) {
            console.error('Insert failed:', insertError);
            console.log('This confirms the RLS policy is blocking system insertions');
            
            // Try to understand the current RLS policies
            console.log('\nChecking current RLS policies...');
            const { data: policies, error: policyError } = await supabase
                .from('pg_policies')
                .select('*')
                .eq('tablename', 'discord_interactions');
                
            if (policyError) {
                console.error('Could not fetch policies:', policyError);
            } else {
                console.log('Current RLS policies:', policies);
            }
        } else {
            console.log('Insert succeeded! RLS policies are working correctly.');
            console.log('Inserted data:', insertData);
            
            // Clean up test data
            if (insertData && insertData.length > 0) {
                await supabase
                    .from('discord_interactions')
                    .delete()
                    .eq('id', insertData[0].id);
                console.log('Test data cleaned up');
            }
        }
        
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

async function main() {
    await fixDiscordRLS();
    console.log('\nRLS diagnostic completed.');
}

main();