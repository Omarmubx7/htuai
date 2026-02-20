import json
import re
import os

def verify_major(major_key, json_path, txt_path):
    report = []
    report.append(f"\n{'='*20} Verifying {major_key} {'='*20}")
    
    if not os.path.exists(json_path):
        report.append(f"Error: JSON path {json_path} not found.")
        return report
    if not os.path.exists(txt_path):
        report.append(f"Error: TXT path {txt_path} not found.")
        return report

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    with open(txt_path, 'r', encoding='utf-8') as f:
        txt_content = f.read()

    # Get the inner major object
    major_data = data.get(major_key, data)
    
    courses = []
    for cat in ['university_requirements', 'college_requirements', 'department_requirements', 'electives', 'work_market_requirements']:
        if cat in major_data:
            courses.extend(major_data[cat])

    found_count = 0
    mismatches = 0

    for course in courses:
        code = course['code']
        json_ch = course['ch']
        name = course['name']
        
        # UE/Elective placeholders skip
        if code.startswith('UE-') or name.lower().startswith('elective'):
            continue

        # Pattern to find code (possibly with leading zeros)
        # We look for the code as a whole word, maybe prefixed by 0s
        pattern = re.compile(rf'\b0*{code}\b')
        matches = list(pattern.finditer(txt_content))
        
        if not matches:
            # try without leading zeros if code is 8 digits but plan has it as something else
            continue
        
        found_count += 1
        
        matched_plan_ch = None
        best_context = ""

        for match in matches:
            start = match.start()
            end = match.end()
            # Look ahead for a digit.
            # In these tables, it's often [Code] [Name] [Some junk] [CH]
            # Let's look for the first single or double digit after the code name area
            # We'll search in the next 150 characters
            lookahead = txt_content[end: end + 150]
            
            # Find numbers in lookahead. Usually CH is a 1, 2, 3, 4, 6, 12.
            # Engineering plans have columns. Let's look for digits that aren't parts of codes.
            nums = re.findall(r'\b(\d{1,2})\b', lookahead)
            if nums:
                # The first number after the name is usually the CH
                # (unless there's a level number)
                for n in nums:
                    val = int(n)
                    if val in [1, 2, 3, 4, 6, 12, 18]: # Possible CH values
                        matched_plan_ch = val
                        best_context = txt_content[max(0, start - 20): min(len(txt_content), end + 60)].replace('\n', ' ')
                        break
            if matched_plan_ch is not None:
                break

        if matched_plan_ch is not None and matched_plan_ch != json_ch:
            mismatches += 1
            report.append(f"Mismatch: [{code}] {name}")
            report.append(f"  - JSON: {json_ch}")
            report.append(f"  - Plan: {matched_plan_ch}")
            report.append(f"  - Context: ...{best_context}...")
            report.append("-" * 40)

    report.append(f"Summary: Found {found_count} courses, {mismatches} mismatches.")
    return report

mapping = [
    ('shared', 'smart-advisor-ui/public/data/shared.json', 'cs study plan.txt'),
    ('computer_science', 'smart-advisor-ui/public/data/computer_science.json', 'cs study plan.txt'),
    ('cybersecurity', 'smart-advisor-ui/public/data/cybersecurity.json', 'cyberstudyplan.txt'),
    ('data_science', 'smart-advisor-ui/public/data/data_science.json', 'aistudtyplan.txt'),
    ('game_design', 'smart-advisor-ui/public/data/game_design.json', 'gamedesignstudyplan.txt'),
    ('electrical_engineering', 'smart-advisor-ui/public/data/electrical_engineering.json', 'Electrical Engineeringstudyplan.txt'),
    ('energy_engineering', 'smart-advisor-ui/public/data/energy_engineering.json', 'Energy Engineeringstudyplan.txt'),
    ('industrial_engineering', 'smart-advisor-ui/public/data/industrial_engineering.json', 'Industrial Engineeringstudyplan.txt'),
    ('mechanical_engineering', 'smart-advisor-ui/public/data/mechanical_engineering.json', 'Mechanical Engineeringstudyplan.txt'),
]

full_report = []
for major, json_p, txt_p in mapping:
    full_report.extend(verify_major(major, json_p, txt_p))

with open('audit_report.txt', 'w', encoding='utf-8') as f:
    f.write("\n".join(full_report))

print("Audit complete. Report written to audit_report.txt")
