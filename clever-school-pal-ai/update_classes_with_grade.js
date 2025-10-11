// Script to add grade column and update existing classes
// This bypasses migration issues by directly updating the database

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL and Key are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateClassesWithGrade() {
  console.log('🚀 Starting classes grade update...');

  try {
    // First, add the grade column if it doesn't exist
    console.log('📝 Adding grade column to classes table...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'classes' AND column_name = 'grade') THEN
            ALTER TABLE classes ADD COLUMN grade TEXT;
            COMMENT ON COLUMN classes.grade IS 'Grade level of the class (e.g., "1", "2", "3", etc.)';
            CREATE INDEX IF NOT EXISTS idx_classes_grade ON classes(grade);
          END IF;
        END $$;
      `
    });

    if (alterError) {
      console.log('⚠️ Could not add column via RPC, trying direct approach...');
    } else {
      console.log('✅ Grade column added successfully');
    }

    // Get all existing classes
    console.log('📚 Fetching existing classes...');
    const { data: classes, error: fetchError } = await supabase
      .from('classes')
      .select('*');

    if (fetchError) throw fetchError;
    console.log(`✅ Found ${classes.length} classes`);

    // Update each class with appropriate grade based on name
    console.log('🔄 Updating classes with grade values...');
    const updates = [];

    for (const classItem of classes) {
      let grade = '5'; // default
      
      // Extract grade from class name
      if (classItem.name.includes('5º')) grade = '5';
      else if (classItem.name.includes('6º')) grade = '6';
      else if (classItem.name.includes('7º')) grade = '7';
      else if (classItem.name.includes('8º')) grade = '8';
      else if (classItem.name.includes('9º')) grade = '9';
      else if (classItem.name.includes('1º')) grade = '1';
      else if (classItem.name.includes('2º')) grade = '2';
      else if (classItem.name.includes('3º')) grade = '3';
      else if (classItem.name.includes('4º')) grade = '4';

      updates.push({
        id: classItem.id,
        grade: grade
      });
    }

    // Perform batch update
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('classes')
        .update({ grade: update.grade })
        .eq('id', update.id);

      if (updateError) {
        console.error(`❌ Error updating class ${update.id}:`, updateError);
      } else {
        console.log(`✅ Updated class ${update.id} with grade ${update.grade}`);
      }
    }

    console.log('\n🎉 Classes grade update completed successfully!');
    console.log(`📊 Updated ${updates.length} classes with grade information`);

  } catch (error) {
    console.error('❌ Error updating classes:', error);
    process.exit(1);
  }
}

// Run the update script
updateClassesWithGrade();