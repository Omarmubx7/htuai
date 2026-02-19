import re
import json
import os

# Configuration
FILES = {
    "AI": {
        "text": "aistudyplan.txt",
        "json": "data_science_ai_full_courses_fixed.json",
        "major_key": "data_science_ai",
        "source_files": ["aistudyplan.pdf", "aiprogrammap.pdf"]
    },
    "CS": {
        "text": "csstudyplan.txt",
        "json": "computer_science_full_courses_fixed.json",
        "major_key": "computer_science",
        "source_files": ["csstudyplan.pdf", "cs program map.pdf"]
    },
    "Cyber": {
        "text": "cyberstudyplan.txt",
        "json": "cybersecurity_full_courses_fixed.json",
        "major_key": "cybersecurity",
        "source_files": ["cyberstudyplan.pdf", "cyberprogrammap.pdf"]
    }
}

def clean_prereq_string(input_str):
    stop_words = ["Table", "Total", "University Elective", "College Requirements", "Department Requirements", "List of Elective"]
    for word in stop_words:
        if word in input_str:
            input_str = input_str.split(word)[0]
    input_str = re.sub(r'\b(HTU|HNC|HND)\b', '', input_str)
    return " ".join(input_str.split())

def parse_study_plan_to_structure(file_path):
    print(f"Parsing {file_path}...")
    if not os.path.exists(file_path):
        return {}
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Structure to hold courses
    # We will try to detect sections based on headers in the text.
    # If headers are missing/messy, we might need a fallback or just dump all in one bucket?
    # The app expects: university_requirements, college_requirements, department_requirements, electives
    
    sections = {
        "university_requirements": [],
        "college_requirements": [],
        "department_requirements": [],
        "electives": []
    }
    
    # Heuristic for current section
    # Default to University, then switch when keywords appear
    current_section = "university_requirements"
    
    lines = content.split('\n')
    current_course = None
    code_start_pattern = re.compile(r'^\s*(\d{8,10})\b')
    
    for line in lines:
        line_stripped = line.strip()
        if not line_stripped: continue
        
        # Section Detection
        lower_line = line_stripped.lower()
        if "university requirement" in lower_line or "table 1" in lower_line:
            current_section = "university_requirements"
            if current_course: save_course(current_course, sections)
            current_course = None
            continue
        elif "college requirement" in lower_line or "table 2" in lower_line:
            current_section = "college_requirements"
            if current_course: save_course(current_course, sections)
            current_course = None
            continue
        elif "department requirement" in lower_line or "table 3" in lower_line:
            current_section = "department_requirements"
            if current_course: save_course(current_course, sections)
            current_course = None
            continue
        elif "elective" in lower_line or "table 4" in lower_line:
            current_section = "electives"
            if current_course: save_course(current_course, sections)
            current_course = None
            continue

        match = code_start_pattern.match(line_stripped)
        if match:
            # Save previous
            if current_course:
                save_course(current_course, sections)
            
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
                "code": normalized_code,
                "name": name,
                "ch": ch,
                "prereq_raw": prereq,
                "section": current_section # Tag it
            }
        else:
            # Skip junk lines
            if "Table" in line_stripped or "Page" in line_stripped or "School of Computing" in line_stripped:
                continue
                
            if current_course:
                if current_course['ch'] == 0:
                     if re.match(r'^\d+$', line_stripped):
                         current_course['ch'] = int(line_stripped)
                         continue
                         
                     type_match = re.search(r'\b(HTU|HNC|HND)\b', line_stripped)
                     if type_match:
                         # Found type/ch on next line
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
                         if "Corequisite" in line_stripped or "Prerequisite" in line_stripped or "(" in line_stripped:
                             current_course['prereq_raw'] += " " + line_stripped
                         elif len(line_stripped) < 2 and line_stripped.isdigit():
                             current_course['ch'] = int(line_stripped)
                         else:
                             current_course['name'] += " " + line_stripped
                else:
                    current_course['prereq_raw'] += " " + line_stripped

    if current_course:
        save_course(current_course, sections)
        
    return sections

def save_course(course, sections):
    # Clean up fields
    course['name'] = " ".join(course['name'].replace("&", "and").split())
    course['prereq'] = clean_prereq_string(course['prereq_raw'])
    
    # Structure for JSON
    entry = {
        "code": course['code'],
        "name": course['name'],
        "ch": course['ch']
    }
    if course['prereq']:
        entry['prereq'] = course['prereq']
        
    # Append to correct section
    sections[course['section']].append(entry)

def generate_json():
    for key, conf in FILES.items():
        print(f"\nGeneratin Data for {key}...")
        sections = parse_study_plan_to_structure(conf['text'])
        
        # Build the full JSON object
        data = {
            conf['major_key']: {
                "source_files": conf['source_files'],
                "total_credits": 135, # Hardcoded for now
                "university_requirements": sections['university_requirements'],
                "college_requirements": sections['college_requirements'],
                "department_requirements": sections['department_requirements'],
                "electives": sections['electives']
            }
        }
        
        with open(conf['json'], 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"Saved {conf['json']}")

if __name__ == "__main__":
    generate_json()
