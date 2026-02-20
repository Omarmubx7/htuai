import re
import os
import json

plans = [
    "cs study plan.txt",
    "cyberstudyplan.txt",
    "aistudtyplan.txt",
    "Electrical Engineeringstudyplan.txt",
    "Energy Engineeringstudyplan.txt",
    "Industrial Engineeringstudyplan.txt",
    "Mechanical Engineeringstudyplan.txt"
]

json_files = [
    "smart-advisor-ui/public/data/computer_science.json",
    "smart-advisor-ui/public/data/cybersecurity.json",
    "smart-advisor-ui/public/data/data_science.json",
    "smart-advisor-ui/public/data/electrical_engineering.json",
    "smart-advisor-ui/public/data/energy_engineering.json",
    "smart-advisor-ui/public/data/industrial_engineering.json",
    "smart-advisor-ui/public/data/mechanical_engineering.json",
    "smart-advisor-ui/public/data/shared.json"
]

# Course codes that SHOULD be 4 CH
target_4ch = set()

for plan in plans:
    if not os.path.exists(plan): continue
    with open(plan, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Simple regex for credits
    # Matches codes like 30301121 and then a 4 within the next 40 chars
    pattern = re.compile(r"(\d{6,10})")
    for match in pattern.finditer(content):
        code = match.group(1)
        # Check context for '4' as credits
        context = content[match.end(): match.end() + 50]
        # Look for a standalone '4' or '4 Cr' or '4 Credits'
        if re.search(r"(\b4\b|4 Cr|4 Credit)", context):
            target_4ch.add(code.lstrip('0'))

print(f"Potential 4 CH codes found in plans: {target_4ch}")

for jf in json_files:
    if not os.path.exists(jf): continue
    with open(jf, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Recursive search for courses
    def check_courses(obj):
        if isinstance(obj, list):
            for item in obj:
                if isinstance(item, dict) and 'code' in item and 'ch' in item:
                    code = str(item['code']).lstrip('0')
                    if code in target_4ch and item['ch'] == 3:
                        print(f"MISMATCH in {jf}: {item['name']} ({item['code']}) is {item['ch']} should be 4?")
                else:
                    check_courses(item)
        elif isinstance(obj, dict):
            for k, v in obj.items():
                check_courses(v)

    check_courses(data)
