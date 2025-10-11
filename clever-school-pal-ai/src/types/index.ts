export interface School {
  id: string;
  name: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  numberOfClasses: number;
  numberOfStudents: number;
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  grade: string;
  academicYear: string;
  generalContext?: string;
  numberOfStudents: number;
  subjects: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  className: string;
  schoolId: string;
  schoolName: string;
  phoneNumber: string; // Mantido para compatibilidade
  whatsappNumber: string;
  discord_id?: string;
  email: string;
  active: boolean;
  botActive?: boolean;
  specialContext?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  grade: string;
  teacherName?: string;
  numberOfContents: number;
  createdAt: string;
  updatedAt: string;
  schoolId: string;
  schoolName: string;
}

export interface ClassSubject {
  id: string;
  classId: string;
  subjectId: string;
  subjectName: string;
}

// New Topic structure for organizing content
export interface Topic {
  id: string;
  name: string;
  description?: string;
  yearLevel: 5 | 6 | 7 | 8 | 9; // School years
  subjectId: string;
  parentTopicId?: string; // For subtopics
  order: number; // For ordering topics
  createdAt: string;
  updatedAt: string;
  // Additional properties for filtering
  subjectName?: string;
  schoolId?: string;
}

// Content assignment to multiple classes
export interface ContentAssignment {
  id: string;
  contentId: string;
  classId: string;
  assignedAt: string;
  assignedBy: string;
  dueDate?: string;
  isRequired: boolean;
}

// Class assignment metadata for content preview
export interface ClassAssignmentMetadata {
  classId: string;
  className: string;
  assignedAt: string;
  dueDate?: string;
  isRequired: boolean;
  status: string;
}

// Enhanced Content interface with year and topic support
export interface Content {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  schoolId: string;
  schoolName: string;
  classId: string[]; // Multiple classes
  className: string[];
  
  // Year and topic organization
  yearLevel: 5 | 6 | 7 | 8 | 9;
  topicId?: string;
  topicName?: string;
  subtopicId?: string;
  subtopicName?: string;
  
  // Content details
  contentType: "text" | "pdf" | "image" | "video" | "link" | "file" | "topic";
  contentData: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedDuration?: number;
  
  // Learning objectives field
  learningObjectives?: string;
  
  // Organization and metadata
  tags: string[];
  status: "ativo" | "desativado";
  views?: number;
  lastViewed?: string;
  
  // Class assignment metadata
  classAssignments?: ClassAssignmentMetadata[];
  
  // Timestamps and audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// Image handling and media management
export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  contentId?: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Year-based content organization
export interface YearContent {
  year: 5 | 6 | 7 | 8 | 9;
  subjects: {
    [subjectId: string]: {
      name: string;
      topics: Topic[];
      contents: Content[];
    };
  };
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSchools: number;
  totalClasses: number;
  totalStudents: number;
  totalSubjects: number;
  totalContents: number;
  activeStudents: number;
  recentActivities: Activity[];
}

export interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'login' | 'message';
  entity: 'school' | 'class' | 'student' | 'subject' | 'content' | 'user' | 'system';
  entityId: string;
  description: string;
  createdAt: string;
  createdBy: string;
}
