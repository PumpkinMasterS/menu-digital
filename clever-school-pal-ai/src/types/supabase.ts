// Updated Supabase types with teacher_class_subjects table
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // ... existing tables ...
      teacher_class_subjects: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          class_id: string
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          subject_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          class_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          subject_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          class_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          subject_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      // ... other tables ...
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // Teacher-related functions
      assign_teacher_to_class_subject: {
        Args: {
          p_teacher_id: string
          p_class_id: string
          p_subject_id: string
          p_notes?: string
        }
        Returns: string
      }
      get_teacher_assignments: {
        Args: { p_teacher_id: string }
        Returns: {
          assignment_id: string
          class_id: string
          class_name: string
          subject_id: string
          subject_name: string
          school_id: string
          school_name: string
          assigned_at: string
          notes: string
        }[]
      }
      get_school_teachers_with_assignments: {
        Args: { p_school_id: string }
        Returns: {
          teacher_id: string
          teacher_email: string
          teacher_name: string
          class_count: number
          subject_count: number
          total_assignments: number
        }[]
      }
      remove_teacher_from_class_subject: {
        Args: { p_teacher_id: string; p_class_id: string; p_subject_id: string }
        Returns: boolean
      }
      get_available_class_subjects_for_teacher: {
        Args: { p_teacher_id: string }
        Returns: {
          class_id: string
          class_name: string
          subject_id: string
          subject_name: string
          school_id: string
          school_name: string
        }[]
      }
      get_teacher_statistics: {
        Args: { p_teacher_id: string }
        Returns: {
          teacher_id: string
          teacher_email: string
          teacher_name: string
          school_id: string
          school_name: string
          total_classes: number
          total_subjects: number
          total_assignments: number
          total_students: number
          active_assignments: number
        }[]
      }
      get_teachers_by_subject: {
        Args: { p_subject_id: string; p_school_id?: string }
        Returns: {
          teacher_id: string
          teacher_email: string
          teacher_name: string
          assignment_count: number
          class_names: string[]
        }[]
      }
      get_classes_without_teacher_for_subject: {
        Args: { p_subject_id: string; p_school_id: string }
        Returns: {
          class_id: string
          class_name: string
          grade: string
          academic_year: string
        }[]
      }
      transfer_teacher_assignments: {
        Args: {
          p_from_teacher_id: string
          p_to_teacher_id: string
          p_class_id?: string
          p_subject_id?: string
        }
        Returns: number
      }
      get_school_assignments_report: {
        Args: { p_school_id: string }
        Returns: {
          class_name: string
          subject_name: string
          teacher_name: string
          teacher_email: string
          student_count: number
          assigned_date: string
          notes: string
        }[]
      }
      teacher_has_class_access: {
        Args: { p_teacher_id: string; p_class_id: string }
        Returns: boolean
      }
      teacher_has_class_subject_access: {
        Args: { p_teacher_id: string; p_class_id: string; p_subject_id: string }
        Returns: boolean
      }
      // ... other existing functions ...
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Teacher-specific types
export type TeacherClassSubject = Database['public']['Tables']['teacher_class_subjects']['Row']
export type TeacherClassSubjectInsert = Database['public']['Tables']['teacher_class_subjects']['Insert']
export type TeacherClassSubjectUpdate = Database['public']['Tables']['teacher_class_subjects']['Update']

export type TeacherAssignment = {
  assignment_id: string
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  school_id: string
  school_name: string
  assigned_at: string
  notes: string
}

export type TeacherWithAssignments = {
  teacher_id: string
  teacher_email: string
  teacher_name: string
  class_count: number
  subject_count: number
  total_assignments: number
}

export type TeacherStatistics = {
  teacher_id: string
  teacher_email: string
  teacher_name: string
  school_id: string
  school_name: string
  total_classes: number
  total_subjects: number
  total_assignments: number
  total_students: number
  active_assignments: number
}

export type AvailableClassSubject = {
  class_id: string
  class_name: string
  subject_id: string
  subject_name: string
  school_id: string
  school_name: string
}

// Helper types for teacher management
export type TeacherRole = 'professor'
export type UserRole = 'super_admin' | 'diretor' | 'coordenador' | 'professor'

export type TeacherUser = {
  id: string
  email: string
  name: string
  role: TeacherRole
  school_id: string
  is_active: boolean
  created_at: string
} 