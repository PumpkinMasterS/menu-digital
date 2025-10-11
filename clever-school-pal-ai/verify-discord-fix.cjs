const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('Missing required environment variables');
    process.exit(1);
}

async function verifyDiscordFix() {
    console.log('🔍 Verifying Discord RLS fix...');
    
    // Test with anon key (frontend simulation)
    const anonSupabase = createClient(supabaseUrl, anonKey);
    const serviceSupabase = createClient(supabaseUrl, serviceKey);
    
    console.log('\n1️⃣ Testing unauthenticated access (should work now)...');
    try {
        const { data, error } = await anonSupabase
            .from('discord_interactions')
            .select('id, user_id, guild_id, created_at')
            .limit(3);
            
        if (error) {
            console.log('❌ Unauthenticated access failed:', error.message);
            console.log('   Error code:', error.code);
            return false;
        } else {
            console.log('✅ Unauthenticated access successful!');
            console.log('   Records found:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('   Sample record:', {
                    id: data[0].id,
                    guild_id: data[0].guild_id,
                    created_at: data[0].created_at
                });
            }
        }
    } catch (err) {
        console.log('❌ Test failed:', err.message);
        return false;
    }
    
    console.log('\n2️⃣ Testing service role access (Discord bot)...');
    try {
        const { data, error } = await serviceSupabase
            .from('discord_interactions')
            .select('count')
            .single();
            
        if (error && error.code !== 'PGRST116') {
            console.log('❌ Service role access failed:', error.message);
            return false;
        } else {
            console.log('✅ Service role access working!');
        }
    } catch (err) {
        console.log('❌ Service role test failed:', err.message);
        return false;
    }
    
    console.log('\n3️⃣ Testing INSERT operation (frontend simulation)...');
    try {
        // Try to insert a test record
        const testRecord = {
            user_id: 'test_frontend_user',
            guild_id: 'test_frontend_guild',
            channel_id: 'test_frontend_channel',
            message_content: 'Test from frontend verification',
            interaction_type: 'message'
        };
        
        const { data: insertData, error: insertError } = await anonSupabase
            .from('discord_interactions')
            .insert(testRecord)
            .select()
            .single();
            
        if (insertError) {
            console.log('❌ Frontend INSERT failed:', insertError.message);
            console.log('   This might be expected if RLS policies restrict inserts');
        } else {
            console.log('✅ Frontend INSERT successful!');
            console.log('   Inserted record ID:', insertData.id);
            
            // Clean up test record
            await serviceSupabase
                .from('discord_interactions')
                .delete()
                .eq('id', insertData.id);
            console.log('   Test record cleaned up');
        }
    } catch (err) {
        console.log('❌ INSERT test failed:', err.message);
    }
    
    console.log('\n📋 Summary:');
    console.log('✅ Discord RLS fix verification completed!');
    console.log('\n🎯 Expected Results:');
    console.log('  - Frontend can now READ discord_interactions (no more 403 errors)');
    console.log('  - Discord bot continues to work with service role');
    console.log('  - Users with proper authentication can access Discord data');
    
    console.log('\n🔄 Next Steps:');
    console.log('  1. Refresh your frontend application');
    console.log('  2. The 403 Forbidden errors should be resolved');
    console.log('  3. Discord management features should work properly');
    
    return true;
}

verifyDiscordFix();