const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./public/data/curriculum.json', 'utf8'));

console.log("Course Analysis per Major:\n");

for (const [majorKey, majorData] of Object.entries(data.majors)) {
    console.log(`=== ${majorKey.toUpperCase()} ===`);
    
    let sumCH = 0;

    const countCH = (arr) => {
        if (!arr) return { count: 0, ch: 0 };
        const ch = arr.reduce((acc, c) => acc + (c.ch || 0), 0);
        return { count: arr.length, ch };
    };

    const dept = countCH(majorData.department_requirements);
    const elec = countCH(majorData.electives);
    const uni = countCH(majorData.university_requirements);
    const col = countCH(majorData.college_requirements);
    const work = countCH(majorData.work_market_requirements);
    const basic = countCH(majorData.basic_sciences); // maybe some engineering majors have this?
    
    console.log(`Expected Total Credits: ${majorData.total_credits || 'N/A'}`);
    if (majorData.core_credits) console.log(`Expected Core Credits: ${majorData.core_credits}`);
    
    console.log(`- Department Requirements: ${dept.count} courses, ${dept.ch} CH`);
    console.log(`- Electives Offered: ${elec.count} courses, ${elec.ch} CH total available`);
    if (uni.count) console.log(`- University Requirements: ${uni.count} courses, ${uni.ch} CH`);
    if (col.count) console.log(`- College Requirements: ${col.count} courses, ${col.ch} CH`);
    if (work.count) console.log(`- Work Market Requirements: ${work.count} courses, ${work.ch} CH`);
    if (basic.count) console.log(`- Basic Sciences: ${basic.count} courses, ${basic.ch} CH`);

    // Let's look for anomalies
    // If the expected core credits is defined, check how it relates to department requirements
    if (majorData.core_credits) {
        if (dept.ch > majorData.core_credits) {
            console.log(`  ⚠️ ERROR: Department CH sum (${dept.ch}) exceeds expected Core Credits (${majorData.core_credits})`);
        } else {
            let requiredElectivesCH = majorData.core_credits - dept.ch;
            console.log(`  -> Student needs ${requiredElectivesCH} CH from electives.`);
            if (elec.ch < requiredElectivesCH) {
                console.log(`  ⚠️ ERROR: Not enough electives offered (${elec.ch} CH) to fulfill the remaining ${requiredElectivesCH} CH for Core Requirements.`);
            }
        }
    }
    
    // Engineering majors don't seem to define core_credits or total might be directly sums.
    // Check total sum of required (assuming all uni, col, work, basic are required)
    const totalRequiredCH = dept.ch + uni.ch + col.ch + work.ch + basic.ch;
    if (majorData.total_credits) {
        if (totalRequiredCH > majorData.total_credits) {
            console.log(`  ⚠️ ERROR: Total required CH (${totalRequiredCH}) exceeds expected Total Credits (${majorData.total_credits}) without even counting electives.`);
        } else if (majorData.total_credits - totalRequiredCH > elec.ch) {
             console.log(`  ⚠️ ERROR: Total required CH (${totalRequiredCH}) + All Offered Electives (${elec.ch}) = ${totalRequiredCH + elec.ch}, which is LESS than expected Total Credits (${majorData.total_credits}).`);
        }
    }

    console.log('');
}
