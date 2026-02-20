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

export interface Transcript {
    completed: string[]; // List of course codes
    gpa?: number;
}
