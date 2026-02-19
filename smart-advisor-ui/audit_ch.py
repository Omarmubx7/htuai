import json, sys

def s(courses): return sum(c.get('ch',0) for c in courses)

shared = json.load(open('public/data/shared.json'))
uni_req = shared.get('university_requirements',[])
col_req = shared.get('college_requirements',[])
uni_elec = shared.get('university_electives',[])
shared_ch = s(uni_req) + s(col_req) + s(uni_elec)
print(f"=== SHARED ===  uni_req={s(uni_req)}  col_req={s(col_req)}  uni_elec={s(uni_elec)}  TOTAL={shared_ch}")

for m in ['computer_science','data_science','cybersecurity']:
    raw = json.load(open(f'public/data/{m}.json'))
    d = raw.get(m, raw)
    dept = d.get('department_requirements',[])
    elec = d.get('electives',[])
    dept_ch = s(dept)
    elec_ch = s(elec)
    total = shared_ch + dept_ch + elec_ch
    print(f"\n=== {m} ===  dept={dept_ch}  elec={elec_ch}  major_specific={dept_ch+elec_ch}  GRAND_TOTAL={total}  ({'OK' if total==135 else 'OFF by '+str(total-135)})")
    for c in dept:
        print(f"  DEPT  {c.get('ch','?')}CH  {c.get('code','')}  {c.get('name','')[:50]}")
    for c in elec:
        print(f"  ELEC  {c.get('ch','?')}CH  {c.get('code','')}  {c.get('name','')[:50]}")
