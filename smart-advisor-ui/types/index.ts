export interface Course {
    code: string;
    name: string;
    ch: number;
    framework: "HTU" | "HNC" | "HND";
    level: 1 | 2 | 3 | 4;
    prereq?: string;
    description?: string;
}

export interface CourseData {
    university_requirements: Course[];
    college_requirements: Course[];
    department_requirements: Course[];
    electives: Course[];
    university_electives: Course[];
    work_market_requirements?: Course[];
}

export type SemesterType = "Regular" | "Summer";

export interface CompletedCourse {
    code: string;
    grade: string;
}

export interface Transcript {
    completed: CompletedCourse[]; // List of course codes with grades
    gpa?: number;
}

export interface PlannerCourse {
    id: string;
    name: string;
    code?: string;
    credits: number;
    hasMidterm: boolean;
    midtermDate?: string;
    finalDate?: string;
    professor?: string;
    location?: string;
    status: "In Progress" | "Completed" | "At Risk";
    grade?: string | null;
}

export interface StudySession {
    id: string;
    courseId: string;
    date: string;
    hours: number;
    notes?: string;
}

export interface SemesterData {
    id: string;
    name?: string;
    courses: PlannerCourse[];
    studySessions: StudySession[];
}
