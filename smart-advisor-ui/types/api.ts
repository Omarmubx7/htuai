// NextRequest removed - unused

/** Common API request/response types */

export interface ApiError {
  error: string;
  message: string;
  status?: number;
}

export interface ApiSuccess<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/** Auth/Session Types */
export interface UserSession {
  user?: {
    id?: string;
    email?: string;
    name?: string;
    image?: string;
  };
}

/** Course Types */
export interface CourseEntry {
  code: string;
  name: string;
  ch: number;
  level?: number;
  prereq?: string;
  framework?: string;
}

export interface CourseData {
  [key: string]: CourseEntry[];
}

/** Student Progress Types */
export interface StudentProgress {
  studentId: string;
  completedCourses: string[];
  grades: Record<string, string>;
  currentGPA: number;
  completedCredits: number;
}

/** Planner/Semester Types */
export interface SemesterData {
  id: string;
  name: string;
  courses: string[];
  status: "planned" | "current" | "completed";
}

/** Profile Types */
export interface StudentProfile {
  studentId: string;
  name: string;
  email: string;
  majorKey: string;
  gpa: number;
  completedCredits: number;
}

/** Gamification Types */
export interface GamificationProfile {
  studentId: string;
  points: number;
  level: number;
  badges: string[];
  streak: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
  completedAt?: string;
}

/** Study Session Types */
export interface StudySession {
  id: string;
  courseCode: string;
  duration: number;
  date: string;
  notes?: string;
}

/** Course Notes Types */
export interface CourseNote {
  id: string;
  courseId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface SemesterNote {
  id: string;
  semesterId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** Google Integration Types */
export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  courseCode?: string;
}

export interface IntegrationToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope: string;
}

/** Response data structures */
export interface StatsResponse {
  totalStudents: number;
  courseCompletion: Record<string, number>;
  averageGPA: number;
  semester: string;
  timestamp: string;
}

export interface ProfileResponse extends StudentProfile {
  lastUpdated: string;
}

export interface ProgressResponse extends StudentProgress {
  lastUpdated: string;
}
