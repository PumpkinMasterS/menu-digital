import { supabase } from '@/integrations/supabase/client';
import { authorizedFetch } from '@/lib/http-client';

// Tipos para a API de professores
export interface TeacherApiResponse {
  teachers: Array<{
    teacher_id: string;
    teacher_email: string;
    teacher_name: string;
    class_count: number;
    subject_count: number;
    total_assignments: number;
  }>;
}

export interface TeacherAssignmentResponse {
  assignments: Array<{
    assignment_id: string;
    class_id: string;
    class_name: string;
    subject_id: string;
    subject_name: string;
    assigned_at: string;
    notes?: string;
  }>;
}

export interface AssignmentReportResponse {
  report: Array<{
    class_name: string;
    subject_name: string;
    teacher_name: string;
    teacher_email: string;
    student_count: number;
    assigned_date: string;
    notes?: string;
  }>;
}

// Função helper para chamadas à API usando fetch autorizado padronizado
const callTeacherAPI = async (endpoint: string, options: RequestInit = {}) => {
  const response = await authorizedFetch(`/teacher-management${endpoint}`, options);
  return response.json();
};

// Funções da API de professores
export const teacherAPI = {
  // Obter professores de uma escola
  async getSchoolTeachers(schoolId: string): Promise<TeacherApiResponse> {
    return callTeacherAPI(`/teachers/${schoolId}`);
  },

  // Obter atribuições de um professor
  async getTeacherAssignments(teacherId: string): Promise<TeacherAssignmentResponse> {
    return callTeacherAPI(`/teacher/${teacherId}/assignments`);
  },

  // Atribuir professor a uma turma/disciplina
  async assignTeacher(teacherId: string, classId: string, subjectId: string, notes?: string): Promise<{ success: boolean; assignment_id: string }> {
    return callTeacherAPI('/assign-teacher', {
      method: 'POST',
      body: JSON.stringify({
        teacherId,
        classId,
        subjectId,
        notes
      })
    });
  },

  // Remover atribuição de professor
  async removeAssignment(teacherId: string, classId: string, subjectId: string): Promise<{ success: boolean }> {
    return callTeacherAPI('/remove-assignment', {
      method: 'POST',
      body: JSON.stringify({
        teacherId,
        classId,
        subjectId
      })
    });
  },

  // Obter relatório de atribuições da escola
  async getSchoolAssignmentsReport(schoolId: string): Promise<AssignmentReportResponse> {
    return callTeacherAPI(`/school/${schoolId}/assignments-report`);
  },

  // Obter estatísticas de um professor
  async getTeacherStatistics(teacherId: string): Promise<{
    teacher_id: string;
    teacher_email: string;
    teacher_name: string;
    school_id: string;
    school_name: string;
    total_classes: number;
    total_subjects: number;
    total_assignments: number;
    total_students: number;
    active_assignments: number;
  }> {
    return callTeacherAPI(`/teacher/${teacherId}/statistics`);
  },

  // Obter combinações disponíveis de turma-disciplina para um professor
  async getAvailableClassSubjects(teacherId: string): Promise<{
    available: Array<{
      class_id: string;
      class_name: string;
      subject_id: string;
      subject_name: string;
      school_id: string;
      school_name: string;
    }>;
  }> {
    return callTeacherAPI(`/teacher/${teacherId}/available-assignments`);
  }
};

// Função para verificar se a API está funcionando
export const testTeacherAPI = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }

    const functionsBase = import.meta.env.DEV ? '' : import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${functionsBase}/functions/v1/teacher-management/health`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Health Check failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Teacher API Test failed:', error);
    throw error;
  }
};