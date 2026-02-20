import json
import os

DATA_DIR = os.path.join("smart-advisor-ui", "public", "data")

json_files = [
    "shared.json",
    "computer_science.json",
    "cybersecurity.json",
    "data_science.json",
    "game_design.json",
    "electrical_engineering.json",
    "energy_engineering.json",
    "mechanical_engineering.json",
    "industrial_engineering.json",
]

def extract_non3ch(data, path=""):
    """Recursively find all courses with ch != 3."""
    results = []
    if isinstance(data, dict):
        if "code" in data and "ch" in data and "name" in data:
            ch = data["ch"]
            if ch != 3:
                results.append({
                    "id": data["code"],
                    "name": data["name"],
                    "creditHours": ch,
                    "path": path,
                })
        for key, val in data.items():
            results.extend(extract_non3ch(val, f"{path}/{key}"))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            results.extend(extract_non3ch(item, path))
    return results

print("=" * 100)
print("NON-3 CREDIT HOUR COURSES IN ALL JSON FILES")
print("=" * 100)

all_mismatches = {}

for fname in json_files:
    fpath = os.path.join(DATA_DIR, fname)
    if not os.path.exists(fpath):
        print(f"\n--- {fname}: FILE NOT FOUND ---")
        continue

    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)

    courses = extract_non3ch(data)
    if courses:
        print(f"\n{'=' * 80}")
        print(f"  {fname} — {len(courses)} non-3ch courses")
        print(f"{'=' * 80}")
        # Deduplicate by id
        seen = set()
        for c in courses:
            key = c["id"]
            if key in seen:
                continue
            seen.add(key)
            print(f"  {c['id']:>12}  {c['creditHours']:>2} CH  {c['name']}")
    else:
        print(f"\n--- {fname}: All courses are 3 CH ---")

# Now produce a master list of all unique course IDs across all files with their CH
print("\n\n" + "=" * 100)
print("MASTER LIST: ALL UNIQUE NON-3CH COURSES ACROSS ALL FILES")
print("=" * 100)

master = {}
for fname in json_files:
    fpath = os.path.join(DATA_DIR, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    courses = extract_non3ch(data)
    for c in courses:
        cid = c["id"]
        if cid not in master:
            master[cid] = {"name": c["name"], "creditHours": c["creditHours"], "files": []}
        master[cid]["files"].append(fname)

for cid in sorted(master.keys()):
    info = master[cid]
    files_str = ", ".join(sorted(set(info["files"])))
    print(f"  {cid:>12}  {info['creditHours']:>2} CH  {info['name']:<55}  [{files_str}]")

print(f"\nTotal unique non-3ch courses: {len(master)}")
