import re
import json
import os

CONFIGS = [
    {
        "input": "Electrical Engineeringstudyplan.txt",
        "output": "electrical_engineering.json",
        "root_key": "electrical_engineering",
        "name": "Electrical Engineering"
    },
    {
        "input": "Energy Engineeringstudyplan.txt",
        "output": "energy_engineering.json",
        "root_key": "energy_engineering",
        "name": "Energy Engineering"
    },
    {
        "input": "Industrial Engineeringstudyplan.txt",
        "output": "industrial_engineering.json",
        "root_key": "industrial_engineering",
        "name": "Industrial Engineering"
    },
    {
        "input": "Mechanical Engineeringstudyplan.txt",
        "output": "mechanical_engineering.json",
        "root_key": "mechanical_engineering",
        "name": "Mechanical Engineering"
    }
]

def clean_text(text):
    if not text: return ""
    text = re.sub(r'[^\x00-\x7F]+', ' ', text) # Remove non-ascii
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_level(code):
    try:
        if len(code) >= 4:
            level = int(code[-4])
            if 1 <= level <= 5: return level
    except:
        pass
    return 1

def parse_prereqs(prereq_raw):
    if not prereq_raw: return ""
    prereq_raw = prereq_raw.strip()
    if any(x in prereq_raw.upper() for x in ["-", "NONE", "HTU -", "N/A"]) and not re.search(r'\d{6,}', prereq_raw):
        return ""
    
    p_codes = re.findall(r'\b\d{6,10}\b', prereq_raw)
    if p_codes:
        clean_pc = [pc[2:] if (pc.startswith("00") and len(pc) == 10) else pc for pc in p_codes]
        # Filter out obviously wrong codes like "30301110" if it's the current course (unlikely but safe)
        return " AND ".join(sorted(set(clean_pc)))
    
    return clean_text(prereq_raw)

def parse_plan(config):
    input_file = config["input"]
    output_file = config["output"]
    root_key = config["root_key"]
    
    if not os.path.exists(input_file): return

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    data = {
        root_key: {
            "total_credits": 166,
            "university_requirements": [],
            "college_requirements": [],
            "department_requirements": [],
            "electives": []
        }
    }
    
    # Very flexible section markers
    section_patterns = [
        ("university_requirements", r"(?:University\s+Requirements|University\s+Compulsory)"),
        ("college_requirements", r"(?:School\s+Requirements|College\s+Requirements)"),
        ("department_requirements", r"(?:Program\s+Requirements|Department\s+Requirements|IE\s+Compulsory)"),
        ("electives", r"(?:\s+Electives|\s+Elective\s+Courses)"),
        ("apprentice", r"(?:Professional\s+Apprentice|Apprenticeship)")
    ]
    
    # Identify positions of these headers
    markers = []
    for key, pat in section_patterns:
        matches = list(re.finditer(pat, content, re.IGNORECASE))
        for m in matches:
            markers.append((m.start(), key))
    
    markers.sort()
    
    for i in range(len(markers)):
        start = markers[i][0]
        end = markers[i+1][0] if i+1 < len(markers) else len(content)
        type_key = markers[i][1]
        chunk = content[start:end]
        
        target = data[root_key].get(type_key, data[root_key]["department_requirements"])
        if type_key == "apprentice": target = data[root_key]["department_requirements"]
        
        parse_courses_to_list(chunk, target)

    # Post-process: Clean and unify
    for k in ["university_requirements", "college_requirements", "department_requirements", "electives"]:
        seen = set()
        unique = []
        for c in data[root_key][k]:
            if c["code"] not in seen and len(c["code"]) >= 6:
                unique.append(c)
                seen.add(c["code"])
        data[root_key][k] = unique

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    print(f"[{config['name']}] Generated {output_file}")

def parse_courses_to_list(text, target_list):
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        # Pattern: [ID] [Name] [CH] [L] [P] [Prereq]
        match = re.match(r'^(\d{6,10})\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s*(.*)$', line)
        if not match:
            # Try ID Name CH Prereq
            match = re.match(r'^(\d{6,10})\s+(.+?)\s+(\d+)\s*(.*)$', line)
            
        if match:
            code = match.group(1)
            name = clean_text(match.group(2))
            if name.lower() in ["course title", "course id", "total", "credit"]: continue
            
            ch = int(match.group(3))
            prereq_raw = match.group(match.lastindex)
            
            clean_code = code[2:] if (code.startswith("00") and len(code) == 10) else code
            
            entry = {
                "code": clean_code,
                "name": name,
                "ch": ch,
                "level": extract_level(clean_code)
            }
            prereq = parse_prereqs(prereq_raw)
            if prereq: entry["prereq"] = prereq
                
            target_list.append(entry)

if __name__ == "__main__":
    for config in CONFIGS:
        parse_plan(config)
