import json
import os

def check_duplicates(major_key, json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    major_data = data.get(major_key, data)
    
    cats = ['university_requirements', 'college_requirements', 'university_electives', 'department_requirements', 'electives', 'work_market_requirements']
    
    all_codes = []
    cat_map = {}
    
    for cat in cats:
        if cat in major_data:
            for c in major_data[cat]:
                code = c['code']
                all_codes.append(code)
                if code not in cat_map:
                    cat_map[code] = []
                cat_map[code].append(cat)
    
    duplicates = {code: cats for code, cats in cat_map.items() if len(cats) > 1}
    
    if duplicates:
        print(f"\n--- {major_key} Duplicates ---")
        for code, cats in duplicates.items():
            print(f"  [{code}] in categories: {', '.join(cats)}")
    else:
        pass # print(f"{major_key}: No duplicates")

json_dir = 'smart-advisor-ui/public/data/'
majors = [
    ('shared', 'shared.json'),
    ('computer_science', 'computer_science.json'),
    ('cybersecurity', 'cybersecurity.json'),
    ('data_science', 'data_science.json'),
    ('game_design', 'game_design.json'),
    ('electrical_engineering', 'electrical_engineering.json'),
    ('energy_engineering', 'energy_engineering.json'),
    ('industrial_engineering', 'industrial_engineering.json'),
    ('mechanical_engineering', 'mechanical_engineering.json'),
]

for major, filename in majors:
    check_duplicates(major, os.path.join(json_dir, filename))
