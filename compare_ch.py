"""
Compare ALL course credit hours between JSON data files and official study plans.
Finds mismatches in both directions (JSON wrong, or missing courses).
"""
import json
import re
import os

DATA_DIR = "smart-advisor-ui/public/data"

# ── helpers ──────────────────────────────────────────────────────────────────

def load_json_courses(filepath):
    """Recursively extract {code: ch} from a JSON file."""
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)
    courses = {}
    def walk(obj):
        if isinstance(obj, dict):
            if "code" in obj and "ch" in obj and "name" in obj:
                courses[obj["code"].strip()] = {"ch": obj["ch"], "name": obj["name"]}
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)
    walk(data)
    return courses

def parse_it_study_plan(filepath):
    """Parse CS / Cyber / AI study plans (English table format).
    Lines like: 0040201491 Capstone project I HTU 1 ...
    or: 0000201391 Computing Research Project HND 6 ...
    """
    courses = {}
    with open(filepath, encoding="utf-8") as f:
        text = f.read()
    # Pattern: course code (7-10 digits) ... course type (HTU|HNC|HND|Pearson) ... CH (number)
    # The study plan format has: Code Name Type CH Prereq
    # We match lines with a code at the start, then find type + CH
    for line in text.split("\n"):
        line = line.strip()
        # Match course code at start of line
        m = re.match(r'^(00[0-9]{5,8})\s+', line)
        if m:
            code = m.group(1)
            # Find CH: it's a standalone number after HTU/HNC/HND/Pearson
            ch_match = re.search(r'(?:HTU|HNC|HND|Pearson\s+HNC|Pearson\s+HND)\s+(\d+)', line)
            if ch_match:
                ch = int(ch_match.group(1))
                # Normalize code: strip leading zeros to match JSON codes
                courses[code] = ch
    return courses

def parse_engineering_study_plan(filepath):
    """Parse engineering study plans.
    Format varies but generally: CourseID Title CH ContactHrs Type Prereq
    """
    courses = {}
    with open(filepath, encoding="utf-8") as f:
        text = f.read()
    
    # Engineering plans have different section formats:
    # University/School sections: Code Title CH Lecture Practical Type Prereq
    # IE Compulsory has: Code Title Theory Lab Total Type Prereq (Total = CH)
    
    lines = text.split("\n")
    ie_mode = False  # Special handling for IE compulsory format
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        
        # Detect IE compulsory format (Theory Lab Total)
        if "Theory" in line_stripped and "Lab" in line_stripped and "Total" in line_stripped:
            ie_mode = True
            continue
        # Reset ie_mode on section headers
        if re.match(r'^(Credit|Contact)\s+Hours', line_stripped):
            ie_mode = False
            
        # Match course codes (with or without leading zeros)
        m = re.match(r'^(0{0,2}\d{5,8})\s+', line_stripped)
        if m:
            code = m.group(1)
            rest = line_stripped[m.end():]
            
            if ie_mode:
                # IE format: Name Theory Lab Total Type Prereq
                # Find numbers at end: look for the total (3rd number)
                nums = re.findall(r'\b(\d+)\b', rest)
                # After the course name, we expect Theory Lab Total
                # Try to find pattern: ...text... N N N Type
                ch_match = re.search(r'(\d+)\s+(\d+)\s+(\d+)\s+(?:HTU|HNC|HND)', rest)
                if ch_match:
                    ch = int(ch_match.group(3))  # Total is the CH
                    courses[code] = ch
                else:
                    # Some IE lines have: Name Theory Lab Total Type without full match
                    # Try simpler: last group of numbers before any text
                    nums_in_rest = re.findall(r'\b(\d+)\b', rest)
                    if len(nums_in_rest) >= 3:
                        # Theory, Lab, Total pattern
                        ch = int(nums_in_rest[2])
                        courses[code] = ch
            else:
                # Standard format: Name CH Lecture Practical Type Prereq
                # CH is the first standalone number after the course name
                # Course name ends and CH begins
                ch_match = re.search(r'\b(\d{1,2})\s+\d+\s+\d+', rest)
                if ch_match:
                    ch = int(ch_match.group(1))
                    courses[code] = ch
                else:
                    # Try: just a number followed by spaces
                    ch_match2 = re.search(r'\b([1-9]\d?)\b', rest)
                    if ch_match2:
                        ch = int(ch_match2.group(1))
                        # Only accept reasonable CH values (0-12)
                        if ch <= 12:
                            courses[code] = ch
    return courses

def parse_game_design_plan(filepath):
    """Parse game design study plan (Arabic/mixed format)."""
    courses = {}
    with open(filepath, encoding="utf-8") as f:
        text = f.read()
    
    # Game design plan has lines like:
    # 3030111130301111 Arabic Language ... 1 1...
    # or: 201120201120 Game Design... 3 3...
    # or single code: 40201290Planning a Computing Project4 Pearson HNC...
    
    # Pattern 1: doubled codes merged (registered + plan codes)
    for m in re.finditer(r'(\d{5,10})\s*([A-Za-z][\w\s&,\-\(\)]+?)\s+(\d{1,2})\s+(?:\d+|HTU|Pearson)', text):
        code = m.group(1)
        ch = int(m.group(3))
        if ch <= 12:
            courses[code] = ch
    
    # Pattern 2: code then name then CH
    for m in re.finditer(r'^(\d{4,10})([A-Z][A-Za-z\s&,\'\-\(\)]+?)(\d{1,2})\s', text, re.MULTILINE):
        code = m.group(1)
        ch = int(m.group(3))
        if ch <= 12 and code not in courses:
            courses[code] = ch
    
    return courses

def normalize_code(code):
    """Normalize course code by stripping leading zeros for comparison."""
    return code.lstrip("0") or "0"

# ── Main comparison ──────────────────────────────────────────────────────────

def main():
    # Map JSON files to their study plan files and parser type
    mappings = [
        {
            "json": "shared.json",
            "plans": [
                ("cs study plan.txt", "it"),
                ("Electrical Engineeringstudyplan.txt", "eng"),
            ],
            "desc": "Shared (University/College Req)"
        },
        {
            "json": "computer_science.json",
            "plans": [("cs study plan.txt", "it")],
            "desc": "Computer Science"
        },
        {
            "json": "cybersecurity.json", 
            "plans": [("cyberstudyplan.txt", "it")],
            "desc": "Cybersecurity"
        },
        {
            "json": "data_science.json",
            "plans": [("aistudtyplan.txt", "it")],
            "desc": "Data Science & AI"
        },
        {
            "json": "game_design.json",
            "plans": [("gamedesignstudyplan.txt", "game")],
            "desc": "Game Design"
        },
        {
            "json": "electrical_engineering.json",
            "plans": [("Electrical Engineeringstudyplan.txt", "eng")],
            "desc": "Electrical Engineering"
        },
        {
            "json": "energy_engineering.json",
            "plans": [("Energy Engineeringstudyplan.txt", "eng")],
            "desc": "Energy Engineering"
        },
        {
            "json": "mechanical_engineering.json",
            "plans": [("Mechanical Engineeringstudyplan.txt", "eng")],
            "desc": "Mechanical Engineering"
        },
        {
            "json": "industrial_engineering.json",
            "plans": [("Industrial Engineeringstudyplan.txt", "eng")],
            "desc": "Industrial Engineering"
        },
    ]
    
    all_mismatches = []
    
    for mapping in mappings:
        json_path = os.path.join(DATA_DIR, mapping["json"])
        json_courses = load_json_courses(json_path)
        
        # Collect study plan courses
        plan_courses = {}
        for plan_file, plan_type in mapping["plans"]:
            plan_path = plan_file
            if not os.path.exists(plan_path):
                print(f"  WARNING: Study plan not found: {plan_path}")
                continue
            if plan_type == "it":
                parsed = parse_it_study_plan(plan_path)
            elif plan_type == "eng":
                parsed = parse_engineering_study_plan(plan_path)
            elif plan_type == "game":
                parsed = parse_game_design_plan(plan_path)
            plan_courses.update(parsed)
        
        print(f"\n{'='*70}")
        print(f"  {mapping['desc']} ({mapping['json']})")
        print(f"  JSON courses: {len(json_courses)}, Study plan courses parsed: {len(plan_courses)}")
        print(f"{'='*70}")
        
        # Compare: for each JSON course, find matching study plan course
        mismatched = []
        matched = 0
        not_found = []
        
        for jcode, jinfo in json_courses.items():
            j_norm = normalize_code(jcode)
            found = False
            for pcode, pch in plan_courses.items():
                p_norm = normalize_code(pcode)
                if j_norm == p_norm or jcode == pcode or jcode.lstrip("0") == pcode.lstrip("0"):
                    found = True
                    if jinfo["ch"] != pch:
                        mismatched.append({
                            "json_code": jcode,
                            "plan_code": pcode,
                            "name": jinfo["name"],
                            "json_ch": jinfo["ch"],
                            "plan_ch": pch,
                            "file": mapping["json"]
                        })
                    else:
                        matched += 1
                    break
            if not found:
                not_found.append((jcode, jinfo["name"], jinfo["ch"]))
        
        print(f"  Matched OK: {matched}")
        print(f"  MISMATCHES: {len(mismatched)}")
        print(f"  Not found in study plan: {len(not_found)}")
        
        if mismatched:
            print(f"\n  {'MISMATCHES':}")
            for mm in mismatched:
                print(f"    {mm['json_code']:>10}  {mm['name']:<50}  JSON={mm['json_ch']} CH  Plan={mm['plan_ch']} CH")
            all_mismatches.extend(mismatched)
        
        if not_found:
            print(f"\n  Not in study plan (may be in shared or elective list):")
            for code, name, ch in not_found:
                print(f"    {code:>10}  {name:<50}  {ch} CH")
    
    # Summary
    print(f"\n{'='*70}")
    print(f"  TOTAL MISMATCHES TO FIX: {len(all_mismatches)}")
    print(f"{'='*70}")
    for mm in all_mismatches:
        print(f"  [{mm['file']}] {mm['json_code']} {mm['name']}: JSON={mm['json_ch']} → Plan={mm['plan_ch']}")

if __name__ == "__main__":
    main()
