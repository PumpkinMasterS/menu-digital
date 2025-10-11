const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing required environment variables:');
    console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
    console.error('VITE_SUPABASE_ANON_KEY:', !!supabaseAnonKey);
    process.exit(1);
}

// Create Supabase client with anon key (like frontend)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFrontendAccess() {
    console.log('🧪 Testing Discord frontend access...');
    
    try {
        // Test 1: Try to read discord_interactions without authentication
        console.log('\n1️⃣ Testing unauthenticated access to discord_interactions...');
        const { data: unauthData, error: unauthError } = await supabase
            .from('discord_interactions')
            .select('id, created_at')
            .limit(1);
            
        if (unauthError) {
            console.log('❌ Unauthenticated access failed (expected):', unauthError.message);
        } else {
            console.log('✅ Unauthenticated access successful:', unauthData?.length || 0, 'records');
        }
        
        // Test 2: Try to authenticate with a test user
        console.log('\n2️⃣ Testing authenticated access...');
        
        // First, let's see if we can get any user to test with
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            console.log('❌ Cannot list users with anon key (expected):', usersError.message);
            console.log('💡 This is normal - anon key cannot access admin functions');
        }
        
        // Test 3: Simulate what happens when a user is authenticated
        console.log('\n3️⃣ Testing with service role to simulate authenticated user...');
        
        const serviceSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
        
        const { data: authData, error: authError } = await serviceSupabase
            .from('discord_interactions')
            .select('id, user_id, guild_id, created_at')
            .limit(3);
            
        if (authError) {
            console.log('❌ Service role access failed:', authError.message);
        } else {
            console.log('✅ Service role access successful:', authData?.length || 0, 'records');
            if (authData && authData.length > 0) {
                console.log('   Sample data:', authData[0]);
            }
        }
        
        console.log('\n📋 Test Results Summary:');
        console.log('  - Unauthenticated access:', unauthError ? '❌ Blocked' : '✅ Allowed');
        console.log('  - Service role access:', authError ? '❌ Failed' : '✅ Working');
        
        console.log('\n🔧 Next Steps:');
        console.log('  1. Apply the SQL policies in Supabase Dashboard:');
        console.log('     - Go to Supabase Dashboard > SQL Editor');
        console.log('     - Copy and execute apply-discord-frontend-rls.sql');
        console.log('  2. Test the frontend again after applying policies');
        console.log('  3. Ensure users are properly authenticated in the frontend');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testFrontendAccess();