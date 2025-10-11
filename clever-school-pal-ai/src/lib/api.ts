
import { School, Class, Student, Subject, Content, WebhookConfig, DashboardStats, Activity } from "@/types";

// This file previously contained mock data that has been removed
// All data now comes directly from Supabase

// Empty placeholder for compatibility with existing imports
export const mockData = {
  dashboardStats: {
    totalSchools: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalSubjects: 0,
    totalContents: 0,
    activeStudents: 0,
    recentActivities: [] as Activity[],
  } as DashboardStats,
  activities: [] as Activity[],
  webhooks: [] as WebhookConfig[],
  schools: [] as School[],
  classes: [] as Class[],
  students: [] as Student[],
  contents: [] as Content[],
};
