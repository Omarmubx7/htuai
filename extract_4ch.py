import re
import os

plans = [
    "cs study plan.txt",
    "cyberstudyplan.txt",
    "aistudtyplan.txt",
    "Electrical Engineeringstudyplan.txt",
    "Energy Engineeringstudyplan.txt",
    "Industrial Engineeringstudyplan.txt",
    "Mechanical Engineeringstudyplan.txt"
]

results = []

for plan in plans:
    if not os.path.exists(plan): continue
    results.append(f"--- {plan} ---")
    with open(plan, "r", encoding="utf-8") as f:
        for line in f:
            if re.search(r"\b4\s*(Cr|CH|credit)\b", line, re.I):
                results.append(line.strip())

with open("all_4ch_mentions.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results))
