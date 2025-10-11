# 🚨 Database Restoration Guide - Emergency Recovery

## Overview
This guide will help you restore your Supabase database after data loss. The restoration includes all core tables, relationships, security policies, and sample data.

## ⚠️ Important Notes
- **Backup First**: If any data still exists, export it before proceeding
- **Complete Restoration**: This script recreates the entire database structure
- **Time Required**: 5-10 minutes for complete restoration

## 📋 Step-by-Step Restoration Process

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Login to your account
3. Select your project: `nsaodmuqjtabfblrrdqv`
4. Navigate to **SQL Editor** in the left sidebar

### Step 2: Execute Restoration Script
1. Open the file `DATABASE_RESTORATION_COMPLETE.sql` in this project
2. Copy the entire content (Ctrl+A, then Ctrl+C)
3. In Supabase SQL Editor, paste the script
4. Click **"Run"** button
5. Wait for execution to complete (should show success message)

### Step 3: Verify Core Tables
After running the script, verify these tables exist in **Table Editor**:

#### ✅ Core Tables
- `schools` - School information
- `subjects` - Academic subjects
- `classes` - School classes/grades
- `students` - Student records
- `contents` - Educational content

#### ✅ Junction Tables
- `class_subjects` - Class-Subject relationships
- `content_classes` - Content-Class assignments
- `teacher_class_subjects` - Teacher assignments

#### ✅ System Tables
- `admin_users` - Admin user management
- `bot_config` - AI bot configuration
- `chat_logs` - Chat interaction logs
- `school_context` - School contextual information

### Step 4: Execute Additional Resources
For enhanced functionality, also execute these files:

1. **Educational Resources**:
   ```sql
   -- Copy and paste content from: EXECUTE_NO_SUPABASE.sql
   ```

2. **Media System**:
   ```sql
   -- Copy and paste content from: SISTEMA_MEDIA_EDUCACIONAL.sql
   ```

### Step 5: Verify Sample Data
Check that sample data was created:
- **School**: "Escola Teste EduConnect"
- **Subjects**: Matemática, Português, Ciências, etc.
- **Class**: "9º Ano A"
- **Sample Contents**: Basic lessons for each subject

### Step 6: Test Application
1. Return to your application: `http://localhost:5173`
2. Try logging in or accessing content
3. Verify that data loads correctly
4. Test AI chat functionality

## 🔧 Additional Recovery Options

### Option 1: Point-in-Time Recovery (if available)
If you have Supabase Pro plan:
1. Go to **Settings** → **Database**
2. Look for **Point-in-time Recovery**
3. Select a restore point from before the data loss
4. Follow Supabase's recovery process

### Option 2: Backup Restoration (if available)
If you have database backups:
1. Go to **Settings** → **Database**
2. Look for **Backups** section
3. Restore from the most recent backup

### Option 3: Migration Re-run
If you prefer to use migrations:
1. Navigate to your project's `supabase/migrations` folder
2. Run: `supabase db reset` (if using local development)
3. Run: `supabase db push` to apply all migrations

## 🚨 Troubleshooting

### Error: "relation does not exist"
- **Solution**: Run the complete restoration script first
- **Cause**: Core tables are missing

### Error: "permission denied"
- **Solution**: Make sure you're logged in as project owner
- **Alternative**: Use service_role key in API calls

### Error: "function does not exist"
- **Solution**: Re-run the restoration script completely
- **Cause**: Database functions weren't created

### Tables exist but no data
- **Solution**: Run the sample data insertion part of the script
- **Check**: Verify RLS policies aren't blocking access

## 📊 Post-Restoration Checklist

- [ ] All core tables exist and are accessible
- [ ] Sample school and subjects are created
- [ ] RLS policies are active and working
- [ ] Application can connect to database
- [ ] AI chat functionality works
- [ ] User authentication works
- [ ] Content search and display works

## 🔐 Security Notes

- **RLS Enabled**: All tables have Row Level Security enabled
- **Policies Created**: Appropriate access policies for different user roles
- **Super Admin**: Can access all data across schools
- **School Admin**: Can access only their school's data
- **Teachers**: Can access only their assigned classes

## 📞 Support

If you encounter issues during restoration:
1. Check the Supabase logs in Dashboard → Logs
2. Verify your project's database URL and keys
3. Ensure you have sufficient database resources
4. Contact Supabase support if needed

## 🎯 Next Steps After Restoration

1. **Update Environment Variables**: Ensure your `.env` file has correct database credentials
2. **Test All Features**: Verify each part of your application works
3. **Setup Backups**: Configure regular backups to prevent future data loss
4. **Monitor Usage**: Check database usage and performance
5. **User Training**: Inform users about any changes or downtime

---

**⚡ Quick Recovery Command**
For fastest recovery, simply:
1. Copy `DATABASE_RESTORATION_COMPLETE.sql`
2. Paste in Supabase SQL Editor
3. Click Run
4. Wait for "Database restoration completed successfully!" message

**🎉 You're back online!**