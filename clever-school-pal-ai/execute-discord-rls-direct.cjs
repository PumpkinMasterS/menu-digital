const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function executeRLSFix() {
    console.log('🔧 Applying Discord RLS policies directly...');
    
    const policies = [
        // Drop existing policies for discord_interactions
        `DROP POLICY IF EXISTS "discord_interactions_admin_access" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "System can insert discord_interactions" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_service_role" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_system_access" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_select_policy" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_insert_policy" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_update_policy" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_user_select" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_admin_manage" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_service_role_access" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_authenticated_select" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_authenticated_insert" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_authenticated_update" ON discord_interactions;`,
        `DROP POLICY IF EXISTS "discord_interactions_authenticated_delete" ON discord_interactions;`,
        
        // Enable RLS
        `ALTER TABLE discord_interactions ENABLE ROW LEVEL SECURITY;`,
        
        // Create new policies
        `CREATE POLICY "discord_interactions_service_role_access" ON discord_interactions FOR ALL USING (auth.role() = 'service_role');`,
        `CREATE POLICY "discord_interactions_authenticated_select" ON discord_interactions FOR SELECT USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');`,
        `CREATE POLICY "discord_interactions_authenticated_insert" ON discord_interactions FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');`,
        `CREATE POLICY "discord_interactions_authenticated_update" ON discord_interactions FOR UPDATE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');`,
        `CREATE POLICY "discord_interactions_authenticated_delete" ON discord_interactions FOR DELETE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');`
    ];
    
    for (let i = 0; i < policies.length; i++) {
        const sql = policies[i];
        console.log(`Executing policy ${i + 1}/${policies.length}...`);
        
        try {
            const { data, error } = await supabase.rpc('exec', { sql });
            
            if (error) {
                console.log(`⚠️ Policy ${i + 1} failed (might be expected):`, error.message);
            } else {
                console.log(`✅ Policy ${i + 1} executed successfully`);
            }
        } catch (err) {
            console.log(`⚠️ Policy ${i + 1} failed:`, err.message);
        }
    }
    
    console.log('\n🧪 Testing frontend access after policy changes...');
    
    // Test with anon key (like frontend)
    const anonSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY);
    
    try {
        const { data, error } = await anonSupabase
            .from('discord_interactions')
            .select('id, created_at')
            .limit(1);
            
        if (error) {
            console.log('❌ Frontend access still blocked:', error.message);
            console.log('\n📋 Manual Fix Required:');
            console.log('1. Go to Supabase Dashboard > SQL Editor');
            console.log('2. Execute the contents of apply-discord-frontend-rls.sql');
            console.log('3. This will properly set up the RLS policies');
        } else {
            console.log('✅ Frontend access working! Found', data?.length || 0, 'records');
        }
    } catch (err) {
        console.log('❌ Test failed:', err.message);
    }
}

executeRLSFix();