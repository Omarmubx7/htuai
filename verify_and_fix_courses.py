import re
import json
import os
import difflib

# Configuration
FILES = {
    "AI": {
        "text": "aistudyplan.txt",
        "json": "data_science_ai_full_courses.json",
        "major_key": "data_science_ai"
    },
    "CS": {
        "text": "csstudyplan.txt",
        "json": "computer_science_full_courses.json",
        "major_key": "computer_science"
    },
    "Cyber": {
        "text": "cyberstudyplan.txt",
        "json": "cybersecurity_full_courses.json",
        "major_key": "cybersecurity"
    }
}

def clean_prereq_string(input_str):
    stop_words = ["Table", "Total", "University Elective", "College Requirements", "Department Requirements", "List of Elective"]
    for word in stop_words:
        if word in input_str:
            input_str = input_str.split(word)[0]
    input_str = re.sub(r'\b(HTU|HNC|HND)\b', '', input_str)
    return " ".join(input_str.split())

def extract_codes_from_string(text):
    if not text: return set()
    matches = re.findall(r'\b(00\d{8}|\d{8})\b', text)
    codes = set()
    for m in matches:
        if m.startswith('00') and len(m) == 10:
            codes.add(m[2:])
        else:
            codes.add(m)
    return codes

def parse_study_plan(file_path):
    print(f"Parsing {file_path}...")
    if not os.path.exists(file_path):
        return {}
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    courses = {}
    lines = content.split('\n')
    current_course = None
    code_start_pattern = re.compile(r'^\s*(\d{8,10})\b')
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped: continue
        
        match = code_start_pattern.match(line_stripped)
        if match:
            if current_course:
                current_course['prereq_raw'] = clean_prereq_string(current_course['prereq_raw'])
                current_course['prereq_codes'] = extract_codes_from_string(current_course['prereq_raw'])
                courses[current_course['code']] = current_course
            
            raw_code = match.group(1)
            normalized_code = raw_code[2:] if (raw_code.startswith("00") and len(raw_code) == 10) else raw_code
                
            remainder = line_stripped[match.end():].strip()
            
            type_match = re.search(r'\b(HTU|HNC|HND)\b', remainder)
            
            ch = 0
            course_type = ""
            name = ""
            prereq = ""
            
            if type_match:
                course_type = type_match.group(1)
                name = remainder[:type_match.start()].strip()
                after_type = remainder[type_match.end():].strip()
                
                ch_match = re.match(r'^(\d+)\b', after_type)
                if ch_match:
                    ch = int(ch_match.group(1))
                    prereq = after_type[ch_match.end():].strip()
                else:
                    prereq = after_type 
            else:
                name = remainder

            current_course = {
                "raw_code": raw_code,
                "code": normalized_code,
                "name": name,
                "ch": ch,
                "type": course_type,
                "prereq_raw": prereq,
                "prereq_codes": set()
            }
        else:
            if "Table" in line_stripped or "Page" in line_stripped or "School of Computing" in line_stripped:
                continue
                
            if current_course:
                if current_course['ch'] == 0:
                     # Check if line is JUST a number (CH)
                     # Robust check: starts with digit, maybe space, nothing else significant
                     if re.match(r'^\d+$', line_stripped):
                         current_course['ch'] = int(line_stripped)
                         continue
                         
                     # Check for Type/CH in THIS line
                     type_match = re.search(r'\b(HTU|HNC|HND)\b', line_stripped)
                     if type_match:
                         current_course['type'] = type_match.group(1)
                         remainder = line_stripped[type_match.end():].strip()
                         ch_match = re.match(r'^(\d+)', remainder)
                         if ch_match:
                             current_course['ch'] = int(ch_match.group(1))
                             prereq_part = remainder[ch_match.end():].strip()
                             current_course['prereq_raw'] += " " + prereq_part
                         
                         text_before = line_stripped[:type_match.start()].strip()
                         if text_before:
                             current_course['name'] += " " + text_before
                     else:
                         # Heuristic: If line contains "Corequisite" or "Prerequisite" or "(" it's likely part of prereq, NOT name
                         if "Corequisite" in line_stripped or "Prerequisite" in line_stripped or "(" in line_stripped:
                             current_course['prereq_raw'] += " " + line_stripped
                         elif len(line_stripped) < 2 and line_stripped.isdigit(): # Single digit fallback
                             current_course['ch'] = int(line_stripped)
                         else:
                             current_course['name'] += " " + line_stripped
                else:
                    current_course['prereq_raw'] += " " + line_stripped

    if current_course:
        current_course['prereq_raw'] = clean_prereq_string(current_course['prereq_raw'])
        current_course['prereq_codes'] = extract_codes_from_string(current_course['prereq_raw'])
        courses[current_course['code']] = current_course
        
    return courses

def compare_and_fix(major_name, config):
    print(f"\n--- Processing {major_name} ---")
    
    json_path = config['json']
    major_key = config['major_key']
    
    with open(json_path, 'r', encoding='utf-8') as f:
        full_json = json.load(f)
        
    json_data = full_json[major_key]
    json_courses = {}
    
    categories = ["university_requirements", "college_requirements", "department_requirements", "electives"]
    
    for cat in categories:
        if cat in json_data:
            for course in json_data[cat]:
                if not course: continue
                code = str(course.get('code', ''))
                if code.startswith('00') and len(code) == 10:
                    code = code[2:]
                json_courses[code] = {"data": course, "category": cat}

    pdf_courses = parse_study_plan(config['text'])
    
    updates_made = 0
    course_updates_log = []
    
    sorted_codes = sorted(pdf_courses.keys())
    
    for code in sorted_codes:
        pdf_course = pdf_courses[code]
        
        if code in json_courses:
            json_entry = json_courses[code]['data']
            
            # Update Name
            pdf_name = pdf_course['name'].replace("&", "and")
            pdf_name = " ".join(pdf_name.split())
            if len(pdf_name) > 3:
                if json_entry.get('name') != pdf_name:
                    course_updates_log.append(f"{code}: Name update '{json_entry.get('name')}' -> '{pdf_name}'")
                    json_entry['name'] = pdf_name
            
            # Update CH
            if pdf_course['ch'] > 0:
                if json_entry.get('ch') != pdf_course['ch']:
                    course_updates_log.append(f"{code}: CH update {json_entry.get('ch')} -> {pdf_course['ch']}")
                    json_entry['ch'] = pdf_course['ch']
            
            # Update Prereq
            # Use raw string from PDF if non-empty
            if pdf_course['prereq_raw'].strip():
                # Check formatting: "Name (Code)" -> "Code"?
                # Let's try to normalize it to just codes if it matches perfectly
                # But keep it as text if complex logic
                if json_entry.get('prereq') != pdf_course['prereq_raw']:
                     course_updates_log.append(f"{code}: Prereq update")
                     json_entry['prereq'] = pdf_course['prereq_raw']
            else:
                 pass
            
            updates_made += 1
        else:
             print(f"Course {code} found in PDF but not in JSON.")

    with open(json_path.replace('.json', '_fixed.json'), 'w', encoding='utf-8') as f:
        json.dump(full_json, f, indent=2)
        print(f"Saved fixed JSON to {json_path.replace('.json', '_fixed.json')}")
        
    # Print distinct logs limited
    print(f"Total updates made: {updates_made}")
    print("Sample updates:")
    for log in course_updates_log[:5]:
        print(f"  - {log}")

for key, conf in FILES.items():
    compare_and_fix(key, conf)
