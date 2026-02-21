import path from 'path';
import fs from 'fs/promises';
import { CourseData, Course } from '@/types';

export async function getCourseData(majorKey: string = 'data_science'): Promise<CourseData> {
    const dataDir = path.join(process.cwd(), 'public/data');
    const filePath = path.join(dataDir, 'curriculum.json');

    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContents);

        // Structure is { majors: { [key]: { ... } }, shared: { ... } }
        const majorData = jsonData.majors[majorKey] || jsonData.majors['data_science'];

        return majorData as CourseData;
    } catch (error) {
        console.error("Error loading course data:", error);
        return {
            university_requirements: [],
            college_requirements: [],
            department_requirements: [],
            electives: [],
            university_electives: []
        };
    }
}

export function getAllCourses(data: CourseData): Course[] {
    return [
        ...data.university_requirements,
        ...data.college_requirements,
        ...data.department_requirements,
        ...data.electives
    ];
}
