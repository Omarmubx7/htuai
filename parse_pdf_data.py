import re
import json
import os

def parse_study_plan(file_path):
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return {}
        
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    courses = {}
    current_course = None
    
    # Pattern to match lines starting with a course code (e.g., 0030301121)
    # The codes in PDF seem to be 10 digits starting with 00 typically.
    code_pattern = re.compile(r'^\s*(\d{8,10})\s+(.+)$')
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        match = code_pattern.match(line)
        if match:
            # Save previous course
            if current_course:
                # Clean up prereqs
                current_course['prereq_raw'] = " ".join(current_course['prereq_raw'].split())
                courses[current_course['raw_code']] = current_course
            
            raw_code = match.group(1)
            # Normalize code to match JSON (remove leading 00 if present, unless JSON has them)
            # JSON codes are mostly 8 digits, e.g. "30301121". PDF has "0030301121".
            if raw_code.startswith("00") and len(raw_code) == 10:
                normalized_code = raw_code[2:]
            else:
                normalized_code = raw_code
                
            remainder = match.group(2)
            
            # Helper to extract CH (Credit Hours)
            # Look for " HTU " or " HNC " or " HND " type markers which usually precede CH
            # Or just look for the last digit?
            # Example: "English Pre-Intermediate Intensive + Lab HTU 4"
            # Example: "Professional Skills HTU 1"
            
            # Regex for Type and CH: (HTU|HNC|HND)\s+(\d)
            # But sometimes Type is missing?
            
            type_match = re.search(r'\b(HTU|HNC|HND)\b', remainder)
            ch_match = re.search(r'\b(\d)\b', remainder)
            
            course_type = ""
            ch = 0
            name = remainder
            prereq = ""
            
            # If we find Type and CH
            if type_match and ch_match:
                # Assuming Name < Type < CH < Prereq
                # But sometimes CH is before Type? Unlikely.
                # Usually: Name Type CH Prereq
                
                # Check if CH is after Type
                if ch_match.start() > type_match.start():
                    name = remainder[:type_match.start()].strip()
                    ch = int(ch_match.group(1))
                    prereq = remainder[ch_match.end():].strip()
                    course_type = type_match.group(1)
                else:
                    # Maybe "HNC 3" where 3 is CH
                    pass
            elif ch_match:
                # assume Name CH Prereq
                 name = remainder[:ch_match.start()].strip()
                 ch = int(ch_match.group(1))
                 prereq = remainder[ch_match.end():].strip()
            
            current_course = {
                "raw_code": raw_code,
                "code": normalized_code,
                "name": name,
                "ch": ch,
                "type": course_type,
                "prereq_raw": prereq
            }
        else:
            # Append to prereq of current course
            if current_course:
                 current_course['prereq_raw'] += " " + line

    if current_course:
        current_course['prereq_raw'] = " ".join(current_course['prereq_raw'].split())
        courses[current_course['raw_code']] = current_course
        
    return courses

# List files to verify
print("Files in directory:")
for f in os.listdir('.'):
    if f.endswith('.txt'):
        print(f" - {f}")

files_to_check = [
    "aistudyplan.txt",
    "csstudyplan.txt", 
    "cyberstudyplan.txt"
]

for fp in files_to_check:
    print(f"\n--- Parsing {fp} ---")
    data = parse_study_plan(fp)
    print(f"Found {len(data)} courses")
    if len(data) > 0:
        first_code = list(data.keys())[0]
        print(f"Sample: {data[first_code]}")
        
