import re
import json
import os

CONFIGS = [
    {
        "input": "cs study plan.txt",
        "output": "computer_science_full_courses_fixed.json",
        "root_key": "computer_science",
        "name": "Computer Science"
    },
    {
        "input": "aistudtyplan.txt",
        "output": "data_science_ai_full_courses_fixed.json",
        "root_key": "data_science_ai",
        "name": "Data Science & AI"
    },
    {
        "input": "cyberstudyplan.txt",
        "output": "cybersecurity_full_courses_fixed.json",
        "root_key": "cybersecurity",
        "name": "Cybersecurity"
    }
]

def clean_text(text):
    text = re.sub(r'\b(HTU|HNC|HND|Pearson)\b', '', text)
    text = text.replace("Corequisite", "").replace("Prerequisite", "")
    return " ".join(text.split())

def parse_plan(config):
    input_file = config["input"]
    output_file = config["output"]
    root_key = config["root_key"]
    
    if not os.path.exists(input_file):
        print(f"Skipping {config['name']}: {input_file} not found.")
        return

    print(f"Parsing {input_file} for {config['name']}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    data = {
        root_key: {
            "source": f"Official {config['name']} Study Plan",
            "total_credits": 135,
            "university_requirements": [],
            "college_requirements": [],
            "department_requirements": [],
            "electives": []
        }
    }
    
    current_section = None
    course_pattern = re.compile(r'^\s*(\d{8,10})')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        i += 1
        
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

            # --- Fix for Multi-line Records ---
            # If rest is empty or likely just a prefix, peek ahead immediately
            # We want to capture the full line that contains Name/Type/CH
            
            # Check if rest contains enough info (e.g. at least a framework or name)
            # If it's short, let's peek.
            if len(rest) < 5 or not any(x in rest for x in ["HTU", "HNC", "HND"]):
                saved_i = i
                # Peek up to 6 lines (some courses span many lines)
                for _ in range(6):
                    if i < len(lines):
                        next_line = lines[i].strip()
                        
                        # Stop if next line is a new course or section
                        if course_pattern.match(next_line):
                           break
                        if "table" in next_line.lower():
                           break
                        
                        # If next_line is clearly the start of a definition (Name Type CH...)
                        # Append it.
                        rest += " " + next_line
                        i += 1
            
            # Now parse 'rest' which should contain the full info
            ch = 3 # Default
            name = rest
            prereq = ""
            
            # Improved Heuristic: Look for TYPE followed immediately by DIGITS
            target_match = re.search(r'\b(HTU|HNC|HND)\s+(\d+)\b', rest)
            
            framework = "HTU" # Default if not found (mostly HTU anyway)
            
            if target_match:
                name = rest[:target_match.start()].strip()
                framework = target_match.group(1)
                ch = int(target_match.group(2))
                prereq = rest[target_match.end():].strip()
            else:
                 # Fallback: Try to find just the type
                 type_match = re.search(r'\b(HTU|HNC|HND)\b', rest)
                 if type_match:
                     name = rest[:type_match.start()].strip()
                     framework = type_match.group(1)
                     after = rest[type_match.end():].strip()
                     ch_match = re.match(r'^(\d+)', after)
                     if ch_match:
                         ch = int(ch_match.group(1))
                         prereq = after[ch_match.end():].strip()
                     else:
                         prereq = after
                 else:
                     # No type marker found. Using fallback split.
                     # Find all numbers
                     tokens = re.split(r'(\s\d{1,2}\s)', rest)
                     # If we found splitters
                     if len(tokens) >= 3:
                         # tokens[0] = Name
                         # tokens[1] = " 3 " (CH)
                         # tokens[2] = Prereq
                         # We take the first one that looks like a CH
                         name_token = tokens[0].strip()
                         # Ensure name isn't empty (if invalid split)
                         if name_token:
                             name = name_token
                             try:
                                 val = int(tokens[1].strip())
                                 ch = val
                                 prereq = "".join(tokens[2:]).strip()
                             except:
                                 pass

            # Clean up Name
            name = clean_text(name)
            
            # Clean up Prereq
            prereq = clean_text(prereq)
            
            # Infer Level (Year)
            # Heuristic: 3rd digit from the end (e.g., 10203180 -> 1, 491 -> 4)
            try:
                if len(code) >= 3:
                    level_digit = int(code[-3])
                    if level_digit in [1, 2, 3, 4]:
                        level = level_digit
                    else:
                        level = 1 
                else:
                    level = 1
            except:
                level = 1

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
                "ch": ch,
                "framework": framework,
                "level": level
            }
            if final_prereq:
                entry['prereq'] = final_prereq
                
            data[root_key][current_section].append(entry)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    total = (len(data[root_key]['university_requirements']) + 
             len(data[root_key]['college_requirements']) +
             len(data[root_key]['department_requirements']) +
             len(data[root_key]['electives']))
             
    print(f"[{config['name']}] Generated {total} courses -> {output_file}")


if __name__ == "__main__":
    for config in CONFIGS:
        parse_plan(config)
