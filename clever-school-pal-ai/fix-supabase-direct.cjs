const https = require('https');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Extract the project reference from URL
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

console.log('🔧 Supabase Direct Fix Tool');
console.log('📋 Project:', projectRef);
console.log('🔑 Using API Key:', supabaseKey.substring(0, 20) + '...');

// Critical SQL statements to execute manually
const criticalFixes = `
-- CRITICAL FIXES FOR SUPABASE ISSUES
-- Execute these statements manually in your Supabase SQL Editor

-- 1. Create missing public_list_admin_users function
CREATE OR REPLACE FUNCTION public.public_list_admin_users()
RETURNS TABLE(
  id uuid,
  email text,
  full_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role
  FROM auth.users au
  JOIN public.profiles p ON au.id = p.id
  WHERE p.role IN ('admin', 'super_admin')
  ORDER BY p.full_name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_list_admin_users() TO anon;

-- 2. Fix RLS policies for classes table (remove infinite recursion)
ALTER TABLE IF EXISTS public.classes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view classes they teach" ON public.classes;
DROP POLICY IF EXISTS "Teachers can view their classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view their classes" ON public.classes;

-- Create simple RLS policy for classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view classes" ON public.classes
  FOR SELECT TO authenticated
  USING (true);

-- 3. Fix schools table access
ALTER TABLE IF EXISTS public.schools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view schools" ON public.schools;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view schools" ON public.schools
  FOR SELECT TO authenticated
  USING (true);

-- 4. Grant necessary permissions
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT ON public.schools TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT ON public.contents TO authenticated;

-- 5. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  role text DEFAULT 'student',
  school_id uuid REFERENCES public.schools(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

GRANT SELECT ON public.profiles TO authenticated;

SELECT 'All critical fixes completed successfully!' as result;
`;

// Write the SQL to a file for manual execution
fs.writeFileSync('supabase-manual-fixes.sql', criticalFixes);

console.log('\n📝 Critical SQL fixes have been written to: supabase-manual-fixes.sql');
console.log('\n🚨 IMPORTANT: You need to execute these SQL statements manually!');
console.log('\n📋 Steps to apply the fixes:');
console.log('1. Open your Supabase dashboard: https://supabase.com/dashboard');
console.log('2. Navigate to your project:', projectRef);
console.log('3. Go to SQL Editor');
console.log('4. Copy and paste the contents of supabase-manual-fixes.sql');
console.log('5. Click "Run" to execute the SQL');
console.log('\n✅ This will fix:');
console.log('   - Missing public_list_admin_users function');
console.log('   - Infinite recursion in classes RLS policies');
console.log('   - Access issues with schools and other tables');
console.log('   - Missing profiles table');
console.log('\n🔄 After executing the SQL, restart your application.');

// Test current API connectivity
console.log('\n🔍 Testing current API connectivity...');

const testEndpoints = [
  '/rest/v1/schools?select=id,name&limit=1',
  '/rest/v1/classes?select=id,name&limit=1',
  '/rest/v1/subjects?select=id,name&limit=1'
];

function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: projectRef + '.supabase.co',
      path: endpoint,
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          endpoint,
          status: res.statusCode,
          success: res.statusCode === 200,
          error: res.statusCode !== 200 ? data : null
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 'ERROR',
        success: false,
        error: error.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        endpoint,
        status: 'TIMEOUT',
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function testAllEndpoints() {
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${endpoint}: ${result.status}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error.substring(0, 100)}...`);
    }
  }
}

testAllEndpoints().then(() => {
  console.log('\n🏁 API connectivity test completed.');
  console.log('\n⚠️  Remember to execute the SQL fixes manually in Supabase dashboard!');
});