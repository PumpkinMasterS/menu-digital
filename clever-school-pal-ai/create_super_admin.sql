-- Script to create the super admin user whiswher@gmail.com
-- This user is referenced in RLS policies but may not exist in the database

-- First, check if the user already exists
SELECT 
    'Checking existing user...' as status,
    email,
    raw_app_meta_data->>'role' as role,
    created_at
FROM auth.users 
WHERE email = 'whiswher@gmail.com';

-- If the user doesn't exist, create it using the create_user_admin function
-- Note: You'll need to run this manually in your Supabase SQL editor

/*
SELECT create_user_admin(
    'whiswher@gmail.com',     -- email
    'admin123',               -- password (change this!)
    'Super Admin',            -- name
    'super_admin',            -- role
    NULL,                     -- school_id (NULL for super_admin)
    'Global'                  -- school_name
);
*/

-- Alternative: Direct INSERT if the function doesn't work
-- WARNING: Only use this if the function above fails

/*
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'whiswher@gmail.com',
    crypt('admin123', gen_salt('bf')),  -- Change password!
    NOW(),
    JSON_BUILD_OBJECT(
        'role', 'super_admin',
        'provider', 'email'
    ),
    JSON_BUILD_OBJECT(
        'name', 'Super Admin'
    ),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
) ON CONFLICT (email) DO NOTHING;
*/

-- Verify the user was created
SELECT 
    'User verification...' as status,
    email,
    raw_app_meta_data->>'role' as role,
    raw_user_meta_data->>'name' as name,
    created_at
FROM auth.users 
WHERE email = 'whiswher@gmail.com';

-- Also check admin_users table
SELECT 
    'Admin users check...' as status,
    email,
    role,
    name,
    is_active,
    created_at
FROM admin_users 
WHERE email = 'whiswher@gmail.com';