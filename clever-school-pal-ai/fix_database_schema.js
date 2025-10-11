// Script to fix database schema issues
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabaseSchema() {
  console.log('🚀 Fixing database schema issues...');

  try {
    // Fix 1: Add grade column to classes table
    console.log('📝 Adding grade column to classes table...');
    
    const addGradeColumnSQL = `
      DO $$ 
      BEGIN
        -- Add grade column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'classes' AND column_name = 'grade'
        ) THEN
          ALTER TABLE classes ADD COLUMN grade TEXT DEFAULT '5';
          COMMENT ON COLUMN classes.grade IS 'Grade level of the class';
          CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);
        END IF;
        
        -- Update existing classes with grade based on name
        UPDATE classes SET grade = '5' WHERE name LIKE '%5º%';
        UPDATE classes SET grade = '6' WHERE name LIKE '%6º%';
        UPDATE classes SET grade = '7' WHERE name LIKE '%7º%';
        UPDATE classes SET grade = '8' WHERE name LIKE '%8º%';
        UPDATE classes SET grade = '9' WHERE name LIKE '%9º%';
        
      END $$;
    `;

    const { error: gradeError } = await supabase.rpc('exec_sql', {
      sql: addGradeColumnSQL
    });

    if (gradeError) {
      console.error('❌ Error adding grade column:', gradeError);
    } else {
      console.log('✅ Grade column added and updated successfully');
    }

    // Fix 2: Add last_updated_by_name column to global_preferences table
    console.log('📝 Adding last_updated_by_name column to global_preferences...');
    
    const addLastUpdatedColumnSQL = `
      DO $$ 
      BEGIN
        -- Add last_updated_by_name column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'global_preferences' AND column_name = 'last_updated_by_name'
        ) THEN
          ALTER TABLE global_preferences ADD COLUMN last_updated_by_name TEXT;
          COMMENT ON COLUMN global_preferences.last_updated_by_name IS 'Name of the user who last updated the preference';
        END IF;
      END $$;
    `;

    const { error: lastUpdatedError } = await supabase.rpc('exec_sql', {
      sql: addLastUpdatedColumnSQL
    });

    if (lastUpdatedError) {
      console.error('❌ Error adding last_updated_by_name column:', lastUpdatedError);
    } else {
      console.log('✅ last_updated_by_name column added successfully');
    }

    // Fix 3: Ensure bot_active column exists in students table
    console.log('📝 Adding bot_active column to students table...');
    
    const addBotActiveColumnSQL = `
      DO $$ 
      BEGIN
        -- Add bot_active column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'students' AND column_name = 'bot_active'
        ) THEN
          ALTER TABLE students ADD COLUMN bot_active BOOLEAN DEFAULT true;
          COMMENT ON COLUMN students.bot_active IS 'Whether the bot is active for this student';
        END IF;
      END $$;
    `;

    const { error: botActiveError } = await supabase.rpc('exec_sql', {
      sql: addBotActiveColumnSQL
    });

    if (botActiveError) {
      console.error('❌ Error adding bot_active column:', botActiveError);
    } else {
      console.log('✅ bot_active column added successfully');
    }

    console.log('\n🎉 Database schema fixes completed!');
    console.log('📊 Summary:');
    console.log('  - Added grade column to classes table');
    console.log('  - Added last_updated_by_name column to global_preferences table');
    console.log('  - Added bot_active column to students table');
    console.log('\n✨ The application should now work without schema errors!');

  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
    process.exit(1);
  }
}

// Run the fix script
fixDatabaseSchema();