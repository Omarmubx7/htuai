import re
import json

INPUT_FILE = "cs study plan.txt"
OUTPUT_FILE = "computer_science_full_courses_fixed.json"

def clean_text(text):
    text = re.sub(r'\b(HTU|HNC|HND|Pearson)\b', '', text)
    text = text.replace("Corequisite", "").replace("Prerequisite", "")
    return " ".join(text.split())

def parse_official_plan():
    print(f"Parsing {INPUT_FILE}...")
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    data = {
        "computer_science": {
            "source": "Official Study Plan",
            "total_credits": 135,
            "university_requirements": [],
            "college_requirements": [],
            "department_requirements": [],
            "electives": []
        }
    }
    
    current_section = None
    course_pattern = re.compile(r'^\s*(\d{8,10})')
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Detect Sections
        lower = line.lower()
        if "table 1" in lower and "university" in lower:
            current_section = "university_requirements"
            continue
        elif "table 2" in lower and "college" in lower:
            current_section = "college_requirements"
            continue
        elif "table 3" in lower and "department" in lower:
            current_section = "department_requirements"
            continue
        elif "table 4" in lower and "elective" in lower:
            current_section = "electives"
            continue
            
        if not current_section: continue
        
        match = course_pattern.match(line)
        if match:
            raw_code = match.group(1)
            code = raw_code[2:] if (raw_code.startswith("00") and len(raw_code) == 10) else raw_code
            
            rest = line[match.end():].strip()
            
            ch = 3 # Default
            name = rest
            prereq = ""
            
            # Improved Heuristic: Look for TYPE followed immediately by DIGITS
            target_match = re.search(r'\b(HTU|HNC|HND)\s+(\d+)\b', rest)
            
            if target_match:
                name = rest[:target_match.start()].strip()
                ch = int(target_match.group(2))
                prereq = rest[target_match.end():].strip()
            else:
                 # Fallback: Try to find just the type
                 type_match = re.search(r'\b(HTU|HNC|HND)\b', rest)
                 if type_match:
                     name = rest[:type_match.start()].strip()
                     after = rest[type_match.end():].strip()
                     ch_match = re.match(r'^(\d+)', after)
                     if ch_match:
                         ch = int(ch_match.group(1))
                         prereq = after[ch_match.end():].strip()
                     else:
                         prereq = after
                 else:
                     # No type marker found. 
                     # Check if we can find a CH number (single/double digit surrounded by spaces)
                     ch_matches = list(re.finditer(r'\s(\d{1,2})\s', rest))
                     if ch_matches:
                         # Heuristic: The last one is likely CH if followed by Prereq, or first?
                         # Usually: Code Name CH Prereq
                         # Let's assume the one closest to the end of name logic?
                         # Safe default: 3
                         pass

            # Clean up Name
            name = clean_text(name)
            
            # Clean up Prereq
            prereq = clean_text(prereq)
            # Extract codes from Prereq
            p_codes = re.findall(r'\b\d{8,10}\b', prereq)
            p_codes_clean = []
            for pc in p_codes:
                 if pc.startswith("00") and len(pc) == 10:
                     p_codes_clean.append(pc[2:])
                 else:
                     p_codes_clean.append(pc)
            
            final_prereq = ""
            if p_codes_clean:
                final_prereq = " AND ".join(set(p_codes_clean))
            elif "approval" in prereq.lower():
                final_prereq = "Department Approval"
            elif ">=" in prereq:
                 final_prereq = prereq 
            
            entry = {
                "code": code,
                "name": name,
                "ch": ch
            }
            if final_prereq:
                entry['prereq'] = final_prereq
                
            data['computer_science'][current_section].append(entry)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    total_uni = len(data['computer_science']['university_requirements'])
    total_col = len(data['computer_science']['college_requirements'])
    total_dep = len(data['computer_science']['department_requirements'])
    total_ele = len(data['computer_science']['electives'])
    
    print(f"Generated JSON from Official Plan.")
    print(f"Uni Reqs: {total_uni}")
    print(f"College Reqs: {total_col}")
    print(f"Dept Reqs: {total_dep}")
    print(f"Electives: {total_ele}")
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    parse_official_plan()
