import path from 'path';
import fs from 'fs/promises';
import { CourseData, Course } from '@/types';

export async function getCourseData(): Promise<CourseData> {
    const dataDir = path.join(process.cwd(), 'public/data');

    const files = {
        cs: 'computer_science.json',
        ai: 'data_science.json',
        cyber: 'cybersecurity.json'
    };

    // Default to Data Science/AI for now (or make it dynamic)
    const filePath = path.join(dataDir, files.ai);

    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        const jsonData = JSON.parse(fileContents);
        // The JSON structure has a root key like "data_science_ai"
        const rootKey = Object.keys(jsonData)[0];
        return jsonData[rootKey] as CourseData;
    } catch (error) {
        console.error("Error loading course data:", error);
        return {
            university_requirements: [],
            college_requirements: [],
            department_requirements: [],
            electives: []
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
