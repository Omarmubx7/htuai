import re
import json

INPUT_FILE = "StudentPlan.txt"
OUTPUT_FILE = "computer_science_full_courses_fixed.json"

def clean_name(name):
    # Remove junk prefixes/suffixes
    name = re.sub(r'\b(HTU|HNC|HND|Pearson)\b', '', name)
    # Remove "Plan Course" and everything after it if it leaked in
    if "Plan Course" in name:
        name = name.split("Plan Course")[0]
    return " ".join(name.split())

def parse_student_plan():
    print(f"Parsing {INPUT_FILE}...")
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    courses = []
    
    # regex for line starting with code
    # Code is 8-10 digits.
    # We want to capture the line to process it.
    code_pattern = re.compile(r'^\s*(\d{5,10})\s+(.+)')
    
    # Regex to find "Plan Course [Name][Code]" block
    # Logic: If "Plan Course" exists, the real Name is BEFORE it. The Prereq is AFTER the repeated code.
    
    university_req_start = False
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Filter Personal Data
        if "Major Computer Science" in line or "Student Number" in line or "OMAR" in line or "ALMUBAIDIN" in line:
            continue

        # Match Code
        match = code_pattern.match(line)
        if match:
            code_raw = match.group(1)
            rest = match.group(2)
            
            # Normalize Code
            code = code_raw[2:] if (code_raw.startswith("00") and len(code_raw) == 10) else code_raw
            
            # Parse Name and Prereqs
            name = ""
            prereq_raw = ""
            ch = 3 # Default
            
            # check for "Plan Course" pattern
            if "Plan Course" in rest:
                parts = rest.split("Plan Course")
                name_part = parts[0]
                after_part = parts[1] # "NameCode Prereq..."
                
                # The after_part usually starts with Name then Repeated Code.
                # We can try to skip the name and find the code.
                # Heuristic: Find the first occurrence of code_raw in after_part
                if code_raw in after_part:
                    post_code_part = after_part.split(code_raw)[-1] # Take everything after repeated code
                    prereq_raw = post_code_part
                else:
                    # Fallback
                    prereq_raw = after_part
                    
                name = name_part
                
            else:
                # No "Plan Course". 
                # Name is everything up to the first digits (Prereq or Semester or Year)?
                # Or up to "Fall"/"Spring"
                
                # split by Semester keywords
                sem_split = re.split(r'\b(Fall|Spring|Summer|Equivalent)\b', rest)
                name_part = sem_split[0]
                
                # Check for Prereq code in name_part?
                # Usually Prereq is line ended.
                # "Planning a Computing Project 40302211"
                # Check if last word is a number
                tokens = name_part.split()
                if tokens and tokens[-1].isdigit() and len(tokens[-1]) > 5:
                    prereq_raw = tokens[-1]
                    name_part = " ".join(tokens[:-1])
                elif tokens and tokens[-1] == "OR":
                     # "Course ... OR" -> Prereq on next line?
                     pass
                     
                name = name_part

            # Credit Hour Inference
            ch_match = re.search(r'[A-Za-z]+(\d)\1$', line)
            if ch_match:
                ch = int(ch_match.group(1))
            else:
                lower_name = name.lower()
                if "lab" in lower_name: ch = 1
                elif "skills" in lower_name: ch = 1
                elif "writing" in lower_name: ch = 1 
                elif "project" in lower_name and "planning" not in lower_name: ch = 4 
                elif "english" in lower_name and "pre" in lower_name: ch = 4
                
            # Clean Name
            final_name = clean_name(name)
            
            # Clean Prereq
            # Remove Semesters/Marks from prereq string
            # Also remove adhering text like "Spring" "Fall"
            prereq_clean = re.sub(r'(Fall|Spring|Summer)\s*\d{4}.*', '', prereq_raw)
            prereq_clean = re.sub(r'[A-Za-z]+\d+$', '', prereq_clean) # Remove suffix
            prereq_clean = clean_name(prereq_clean) 
            
            # Extract codes only from Prereq
            p_codes = re.findall(r'\b00\d{8}\b|\b\d{8}\b', prereq_clean)
            p_codes = [c[2:] if (c.startswith("00") and len(c)==10) else c for c in p_codes]
            
            course_entry = {
                "code": code,
                "name": final_name,
                "ch": ch
            }
            if p_codes:
                course_entry["prereq"] = " AND ".join(set(p_codes)) # Join unique codes
            elif prereq_clean.strip():
                 # Only keep if it looks like useful text, not garbage
                 cleaned_text = prereq_clean.strip()
                 if len(cleaned_text) > 3 and not re.match(r'^\d+$', cleaned_text):
                     course_entry["prereq"] = cleaned_text

            courses.append(course_entry)

    # Save to JSON structure
    # We put them all in 'major_requirements' or split?
    # Simple split based on ID?
    # 3xxxx -> Uni? 4xxxx -> Major?
    # User just wants "full courses".
    
    data = {
        "computer_science": {
            "source": "StudentPlan.pdf",
            "department_requirements": courses
        }
    }
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"Saved {len(courses)} courses to {OUTPUT_FILE}")

if __name__ == "__main__":
    parse_student_plan()
