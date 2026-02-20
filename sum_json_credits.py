import json
import os

def sum_credits(major_key, json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    major_data = data.get(major_key, data)
    
    cats = ['university_requirements', 'college_requirements', 'department_requirements', 'electives', 'work_market_requirements']
    
    totals = {}
    grand_total = 0
    
    for cat in cats:
        if cat in major_data:
            cat_sum = sum(course['ch'] for course in major_data[cat])
            totals[cat] = cat_sum
            grand_total += cat_sum
    
    expected = major_data.get('total_credits', 'Unknown')
    print(f"\n--- {major_key} ---")
    print(f"  Calculated Total: {grand_total}")
    print(f"  Expected Total:   {expected}")
    for cat, val in totals.items():
        print(f"    {cat}: {val}")
    
    if str(grand_total) != str(expected) and expected != 'Unknown':
        print(f"  !! MISMATCH found !!")

json_dir = 'smart-advisor-ui/public/data/'
majors = [
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
    sum_credits(major, os.path.join(json_dir, filename))
