import json
import re

STUDENT_JSON = "computer_science_full_courses_fixed.json"
OFFICIAL_TEXT = "cs study plan.txt"

def normalize_code(code):
    clean = code.strip()
    if clean.startswith("00") and len(clean) == 10:
        return clean[2:]
    return clean

def parse_official_txt():
    """Parses the official study plan text to get a dict of code -> {name, ch}"""
    try:
        with open(OFFICIAL_TEXT, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: {OFFICIAL_TEXT} not found. Did extraction work?")
        return {}

    courses = {}
    code_pattern = re.compile(r'^\s*(\d{5,10})')
    
    current_course = None
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        match = code_pattern.match(line)
        if match:
            # Save previous
            if current_course:
                courses[current_course['code']] = current_course
            
            raw_code = match.group(1)
            code = normalize_code(raw_code)
            
            # Simple Name Extraction (heuristic)
            # usually: Code Type Name CH...
            remainder = line[match.end():].strip()
            
            # Remove HTU/HNC
            remainder = re.sub(r'\b(HTU|HNC|HND|Pearson)\b', '', remainder)
            
            # extract CH if possible (digits at end or start of remainder)
            ch = 0
            # Try to find digit 
            ch_match = re.search(r'\b(\d)\b', remainder)
            if ch_match:
                ch = int(ch_match.group(1))
                # Name is before the digit?
                name = remainder[:ch_match.start()].strip()
            else:
                name = remainder
                
            current_course = {
                "code": code,
                "name": name,
                "ch": ch
            }
        else:
             if current_course:
                # Append to name if it looks like name continuation
                if "Table" not in line and "Page" not in line:
                    current_course['name'] += " " + line

    if current_course:
         courses[current_course['code']] = current_course
         
    return courses

def compare():
    print(f"Comparing Student Data ({STUDENT_JSON}) vs Official Plan ({OFFICIAL_TEXT})...\n")
    
    # Load Student Data
    with open(STUDENT_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    student_courses = {}
    # Flatten
    # data['computer_science']['department_requirements'] is a list
    # Need to handle if structurally different?
    # Verify structure
    root = data.get('computer_science', {})
    
    # It might be in 'department_requirements' OR the old structure 'university_requirements' etc
    # The generator put everything in 'department_requirements' for the StudentPlan parse.
    
    all_lists = []
    if 'department_requirements' in root: all_lists.extend(root['department_requirements'])
    if 'university_requirements' in root: all_lists.extend(root['university_requirements'])
    if 'college_requirements' in root: all_lists.extend(root['college_requirements'])
    if 'electives' in root: all_lists.extend(root['electives'])

    for c in all_lists:
        code = normalize_code(str(c['code']))
        student_courses[code] = c

    # Load Official Data
    official_courses = parse_official_txt()
    
    # Comparison Logic
    s_codes = set(student_courses.keys())
    o_codes = set(official_courses.keys())
    
    missing_in_student = o_codes - s_codes
    extra_in_student = s_codes - o_codes
    common = s_codes.intersection(o_codes)
    
    with open("comparison_report.txt", "w", encoding="utf-8") as f:
        f.write(f"Comparision Report: Student Plan vs Official Plan\n")
        f.write("-" * 50 + "\n")
        f.write(f"Total Student Courses: {len(s_codes)}\n")
        f.write(f"Total Official Courses: {len(o_codes)}\n")
        f.write("-" * 50 + "\n")
        
        if missing_in_student:
            f.write(f"\n[MISSING] Courses in Official Plan but NOT in your Student Plan ({len(missing_in_student)}):\n")
            for c in missing_in_student:
                f.write(f"  - {c} : {official_courses[c]['name']}\n")
                
        if extra_in_student:
            f.write(f"\n[EXTRA] Courses in your Student Plan but NOT in Official Plan ({len(extra_in_student)}):\n")
            for c in extra_in_student:
                f.write(f"  - {c} : {student_courses[str(c)]['name']}\n")
                
        f.write("\n[DIFFERENCES] Attribute mismatches in common courses:\n")
        for c in common:
            s_data = student_courses[str(c)]
            o_data = official_courses[c]
            
            # Credit Mismatch
            if s_data.get('ch') != o_data.get('ch') and o_data.get('ch') != 0:
                f.write(f"  - {c}: Credits differ (Student: {s_data.get('ch')} vs Official: {o_data.get('ch')})\n")
    
    print("Report saved to comparison_report.txt")

if __name__ == "__main__":
    compare()
