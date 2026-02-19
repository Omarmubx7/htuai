import json
import os

FILES = {
    "Computer Science": "computer_science_full_courses_fixed.json",
    "Data Science & AI": "data_science_ai_full_courses_fixed.json",
    "Cybersecurity": "cybersecurity_full_courses_fixed.json"
}

def count_stats():
    output_lines = []
    output_lines.append(f"{'Major':<20} | {'Total':<6} | {'HTU':<5} | {'HNC':<5} | {'HND':<5}")
    output_lines.append("-" * 50)
    
    for major_name, filename in FILES.items():
        if not os.path.exists(filename):
            continue
            
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        root = list(data.keys())[0]
        root_data = data[root]
        
        all_courses = []
        for sec in ["university_requirements", "college_requirements", "department_requirements", "electives"]:
            all_courses.extend(root_data.get(sec, []))
            
        total = len(all_courses)
        htu = len([c for c in all_courses if c.get('framework') == 'HTU'])
        hnc = len([c for c in all_courses if c.get('framework') == 'HNC'])
        hnd = len([c for c in all_courses if c.get('framework') == 'HND'])
        
        output_lines.append(f"{major_name:<20} | {total:<6} | {htu:<5} | {hnc:<5} | {hnd:<5}")
        
    with open("course_counts.txt", "w") as f:
        f.write("\n".join(output_lines))
    print("Stats written to course_counts.txt")

if __name__ == "__main__":
    count_stats()
