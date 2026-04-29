
const fs = require('fs');
const path = require('path');

const curriculumPath = path.join(__dirname, '../public/data/curriculum.json');

function validate() {
    console.log("Starting curriculum validation...");
    
    if (!fs.existsSync(curriculumPath)) {
        console.error("Curriculum file not found at:", curriculumPath);
        return;
    }

    const data = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
    const allCourses = new Map();
    const errors = [];
    const warnings = [];

    // Helper to process course lists
    function processList(list, category) {
        if (!Array.isArray(list)) return;
        list.forEach(c => {
            if (!c.code) {
                errors.push(`Missing code for course: ${c.name} in ${category}`);
                return;
            }
            if (allCourses.has(c.code)) {
                warnings.push(`Duplicate course code: ${c.code} (${c.name} vs ${allCourses.get(c.code).name})`);
            }
            allCourses.set(c.code, { ...c, category });
        });
    }

    // Load all courses
    if (data.shared) {
        Object.keys(data.shared).forEach(cat => processList(data.shared[cat], `shared.${cat}`));
    }
    if (data.majors) {
        Object.keys(data.majors).forEach(major => {
            const m = data.majors[major];
            Object.keys(m).forEach(cat => {
                if (Array.isArray(m[cat])) {
                    processList(m[cat], `majors.${major}.${cat}`);
                }
            });
        });
    }

    console.log(`Loaded ${allCourses.size} unique courses.`);

    // Validate prerequisites
    allCourses.forEach((c, code) => {
        if (c.prereq) {
            // Prereq can be "CODE1 and CODE2" or "CODE1 or CODE2"
            const prereqCodes = c.prereq.match(/\b\d{8,10}\b/g) || [];
            prereqCodes.forEach(pCode => {
                // Strip 00 if 10 digits
                let normalized = pCode;
                if (normalized.length === 10 && normalized.startsWith("00")) normalized = normalized.slice(2);
                
                if (!allCourses.has(normalized)) {
                    errors.push(`Orphan prerequisite: Course ${code} (${c.name}) requires ${pCode} but it's missing from curriculum.`);
                }
            });
        }
    });

    // Check for 8-digit consistency
    allCourses.forEach((c, code) => {
        if (code.length !== 8) {
            warnings.push(`Course code ${code} is not 8 digits (length: ${code.length}).`);
        }
    });

    // Output results
    console.log("\n--- ERRORS ---");
    if (errors.length === 0) console.log("None");
    else errors.forEach(e => console.log("❌ " + e));

    console.log("\n--- WARNINGS ---");
    if (warnings.length === 0) console.log("None");
    else warnings.forEach(w => console.log("⚠️ " + w));

    console.log("\nValidation complete.");
}

validate();
