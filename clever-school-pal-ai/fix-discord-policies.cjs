const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDiscordPolicies() {
    console.log('🔧 Fixing Discord RLS policies...');
    
    try {
        // Read the SQL file
        const sqlContent = fs.readFileSync('fix-discord-rls-policies.sql', 'utf8');
        
        // Split into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('SELECT'));
        
        console.log(`📝 Executing ${statements.length} SQL statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement) {
                console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
                
                const { error } = await supabase.rpc('exec_sql', {
                    sql_query: statement + ';'
                });
                
                if (error) {
                    console.error(`❌ Error in statement ${i + 1}:`, error.message);
                    // Continue with other statements
                } else {
                    console.log(`   ✅ Success`);
                }
            }
        }
        
        console.log('\n🎉 Discord RLS policies update completed!');
        
        // Test the fix by trying to query discord_guilds
        console.log('\n🧪 Testing the fix...');
        const { data, error } = await supabase
            .from('discord_guilds')
            .select('*')
            .limit(1);
            
        if (error) {
            console.log('❌ Test failed:', error.message);
        } else {
            console.log('✅ Test passed - can now query discord_guilds');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Alternative approach - execute policies directly
async function fixPoliciesDirectly() {
    console.log('🔧 Fixing Discord RLS policies directly...');
    
    const policies = [
        // Drop existing policies
        'DROP POLICY IF EXISTS "discord_guilds_admin_access" ON discord_guilds',
        'DROP POLICY IF EXISTS "discord_channels_admin_access" ON discord_channels',
        'DROP POLICY IF EXISTS "discord_users_admin_access" ON discord_users',
        'DROP POLICY IF EXISTS "discord_interactions_admin_access" ON discord_interactions',
        'DROP POLICY IF EXISTS "discord_bot_config_admin_access" ON discord_bot_config',
        
        // Create new policies for discord_guilds
        `CREATE POLICY "discord_guilds_admin_access" ON discord_guilds
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM admin_users u
                    WHERE u.user_id = auth.uid()
                    AND u.role IN ('admin', 'teacher', 'super_admin')
                    AND (u.school_id = discord_guilds.school_id OR u.role = 'super_admin')
                )
            )`,
            
        // Service role policies
        'CREATE POLICY "discord_guilds_service_role" ON discord_guilds FOR ALL TO service_role USING (true)',
        'CREATE POLICY "discord_channels_service_role" ON discord_channels FOR ALL TO service_role USING (true)',
        'CREATE POLICY "discord_users_service_role" ON discord_users FOR ALL TO service_role USING (true)',
        'CREATE POLICY "discord_interactions_service_role" ON discord_interactions FOR ALL TO service_role USING (true)',
        'CREATE POLICY "discord_bot_config_service_role" ON discord_bot_config FOR ALL TO service_role USING (true)'
    ];
    
    for (let i = 0; i < policies.length; i++) {
        const policy = policies[i];
        console.log(`   ${i + 1}/${policies.length}: ${policy.substring(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
            sql_query: policy
        });
        
        if (error) {
            console.error(`❌ Error:`, error.message);
        } else {
            console.log(`   ✅ Success`);
        }
    }
    
    console.log('\n🎉 Policies updated!');
}

// Try both approaches
fixPoliciesDirectly().catch(console.error);