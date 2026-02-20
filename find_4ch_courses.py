import re
import os

files = [
    "Electrical Engineeringstudyplan.txt",
    "Energy Engineeringstudyplan.txt",
    "Industrial Engineeringstudyplan.txt",
    "Mechanical Engineeringstudyplan.txt"
]

def find_4ch(filename):
    print(f"\nSearching {filename}...")
    if not os.path.exists(filename):
        print("  File not found.")
        return
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Pattern to find code + name + 4 Cr
    # e.g. 00101112: Engineering Design, 4 Cr
    matches = re.finditer(r"(\d{8}):? ([^,]+?),? (\d)\s*Cr", content)
    for m in matches:
        code, name, ch = m.groups()
        if ch == "4":
            print(f"  [4 CH] {code}: {name.strip()}")
        elif ch == "3":
            pass # print(f"  [3 CH] {code}: {name.strip()}")
    
    # Try different pattern if first one fails
    # e.g. 00103497 Practical Training ... 6
    # This might be harder but let's see.

find_4ch("Electrical Engineeringstudyplan.txt")
find_4ch("Energy Engineeringstudyplan.txt")
find_4ch("Industrial Engineeringstudyplan.txt")
find_4ch("Mechanical Engineeringstudyplan.txt")
