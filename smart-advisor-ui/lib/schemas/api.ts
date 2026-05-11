import { z } from "zod";

// Shared schemas
export const dateString = z.string().datetime({ offset: true }).or(z.string());

// Student Profile
export const studentProfileSchema = z.object({
    previous_gpa: z.number().min(0).max(4).optional().nullable(),
    previous_credits: z.number().min(0).max(200).optional().nullable(),
});

// Study Sessions
export const studySessionSchema = z.object({
    course_id: z.number(),
    topic: z.string().min(1),
    duration_minutes: z.number().min(1).max(720), // Max 12 hours
    date: dateString,
});

// Semesters
export const semesterSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    year: z.union([z.string(), z.number()]).optional(),
    start_date: dateString.optional().nullable(),
    end_date: dateString.optional().nullable(),
});

// Semester Notes
export const createSemesterNoteSchema = z.object({
    title: z.string().optional(),
    notes: z.string().optional(),
    content: z.record(z.unknown()).optional().nullable(),
});

export const updateSemesterNoteSchema = createSemesterNoteSchema.extend({
    id: z.union([z.number(), z.string()]),
});

// Courses
export const createCourseSchema = z.object({
    semester_id: z.number(),
    name: z.string().min(1),
    code: z.string().min(1),
    credits: z.number().min(0),
    instructor_name: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
});

export const updateCourseSchema = z.object({
    code: z.string().optional(),
    name: z.string().optional(),
    credits: z.number().optional(),
    status: z.string().optional(),
    grade_letter: z.string().optional().nullable(),
    grade_point: z.number().optional().nullable(),
    final_mark: z.number().optional().nullable(),
    is_completed: z.boolean().optional(),
    instructor_name: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    class_schedule: z.record(z.unknown()).optional().nullable(),
    midterm_date: dateString.optional().nullable(),
    final_date: dateString.optional().nullable(),
});

// Course Notes
export const updateCourseNotesSchema = z.object({
    notes: z.union([z.string(), z.record(z.unknown())]),
});

// Google Preferences
export const googlePreferencesSchema = z.object({
    autoSync: z.boolean(),
});

// Auth Credentials
export const authCredentialsSchema = z.object({
    student_id: z.string().min(5),
    password: z.string().min(6),
    is_claiming: z.union([z.boolean(), z.string()]).optional(),
    redirect: z.boolean().optional(),
});
