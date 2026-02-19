import streamlit as st
import json
import pandas as pd
import os

st.set_page_config(layout="wide", page_title="Course Architect v3.0")

# --- Inject Custom CSS ---
def local_css(file_name):
    if os.path.exists(file_name):
        with open(file_name) as f:
            st.markdown(f'<style>{f.read()}</style>', unsafe_allow_html=True)
    else:
        st.warning(f"{file_name} not found. Please ensure it exists.")

local_css("style.css")

# Load Data
@st.cache_data
def load_data():
    files = {
        "Computer Science": "computer_science_full_courses_fixed.json",
        "Data Science & AI": "data_science_ai_full_courses_fixed.json",
        "Cybersecurity": "cybersecurity_full_courses_fixed.json"
    }
    data = {}
    for major, filename in files.items():
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                data[filename] = json.load(f)
    # Simplify Mapping
    cleaned_data = {}
    if "computer_science_full_courses_fixed.json" in data:
        cleaned_data["Computer Science"] = data["computer_science_full_courses_fixed.json"]["computer_science"]
    if "data_science_ai_full_courses_fixed.json" in data:
        cleaned_data["Data Science & AI"] = data["data_science_ai_full_courses_fixed.json"]["data_science_ai"]
    if "cybersecurity_full_courses_fixed.json" in data:
        cleaned_data["Cybersecurity"] = data["cybersecurity_full_courses_fixed.json"]["cybersecurity"]
        
    return cleaned_data

DATA = load_data()

st.title("🎓 HTU Course Architect v3.0")

if not DATA:
    st.error("No course data found! Please run the generation scripts.")
    st.stop()

# Sidebar
major = st.sidebar.selectbox("Select Major", list(DATA.keys()))
course_data = DATA[major]

# Flatten Data for Table
all_courses = []
sections = ["university_requirements", "college_requirements", "department_requirements", "electives"]

for sec in sections:
    if sec in course_data:
        # Handle list of dicts
        for c in course_data[sec]:
            if isinstance(c, dict):
                c_copy = c.copy()
                c_copy['type'] = sec.replace("_", " ").title()
                all_courses.append(c_copy)
            else:
                pass # Skip unknowns

df = pd.DataFrame(all_courses)

# --- Logic for Smart Advisor ---
import re

def parse_prereqs(prereq_str, completed_codes, total_completed_ch):
    if not prereq_str or pd.isna(prereq_str):
        return True, ""
        
    # Check for Credit Hour requirements (e.g. ">= 90 hrs")
    ch_req = re.search(r'>=\s*(\d+)', prereq_str)
    if ch_req:
        required_ch = int(ch_req.group(1))
        if total_completed_ch >= required_ch:
            return True, f"✅ Met {required_ch} CH requirement"
        else:
            return False, f"❌ Need {required_ch} CH (Have {total_completed_ch})"
            
    # Extract Course Codes
    # Regex for codes: 8-10 digits
    # Logic: If "+" or "AND", all must be present. If "OR", one must be present.
    # Simplified: Find all codes. If strict AND (default usually), check all.
    
    # Handling "OR" is tricky with regex alone. 
    # Heuristic: If "or" is present, check if ANY of the found codes are completed.
    # Else, check if ALL are completed.
    
    codes = re.findall(r'\b\d{8,10}\b', prereq_str)
    if not codes:
        # Text only prereq like "Department Approval"
        return False, f"⚠️ {prereq_str}"
        
    missing = [c for c in codes if c not in completed_codes]
    
    if "or" in prereq_str.lower():
        # If OR logic, we pass if missing count < total count (at least one is done)
        # Actually accurate: if we have at least one common.
        has_any = any(c in completed_codes for c in codes)
        if has_any:
            return True, "✅ Prereq met (One of options)"
        else:
            return False, f"❌ Missing: {' OR '.join(codes)}"
    else:
        # Default AND
        if not missing:
            return True, "✅ All prereqs met"
        else:
            return False, f"❌ Missing: {', '.join(missing)}"

# Session State for Transcripts
if 'completed_courses' not in st.session_state:
    st.session_state.completed_courses = set()
    
# Sync Checkboxes
def toggle_course(code):
    if code in st.session_state.completed_courses:
        st.session_state.completed_courses.remove(code)
    else:
        st.session_state.completed_courses.add(code)

# Main UI
tab1, tab2, tab3 = st.tabs(["📚 Full Catalog", "✅ My Transcript", "🧠 Smart Advisor"])

with tab1:
    total_credits = course_data.get('total_credits', 135)
    st.header(f"{major} Curriculum ({total_credits} Hours)")
    
    # Calculate Framework Counts
    htu_count = len(df[df['framework'] == 'HTU'])
    hnc_count = len(df[df['framework'] == 'HNC'])
    hnd_count = len(df[df['framework'] == 'HND'])
    
    # Display Metrics
    col1, col2, col3, col4     = st.columns(4)
    col1.metric("Total Courses", len(df))
    col2.metric("HTU Courses", htu_count)
    col3.metric("HNC Courses", hnc_count)
    col4.metric("HND Courses", hnd_count)
    
    # Filter only if 'type' works
    if not df.empty:
        st.dataframe(
            df[["code", "name", "ch", "framework", "prereq", "type"]].fillna(""),
            use_container_width=True,
            hide_index=True,
            column_config={
                "code": "Code",
                "name": "Course Name",
                "ch": "Credits",
                "framework": "Framework",
                "prereq": "Prerequisites",
                "type": "Category"
            }
        )
    else:
        st.info("No courses found for this major.")

with tab2:
    st.header("Track Your Progress")
    st.caption("Mark courses as completed to see your progress.")
    
    if not df.empty:
        completed_chs = 0
        
        # View Mode Toggle
        view_mode = st.radio("Group Courses By:", ["Category (Uni/College/Dept)", "Year Level (1-4)"], horizontal=True)

        if view_mode == "Category (Uni/College/Dept)":
            # Display by Section
            for sec in sections:
                sec_title = sec.replace("_", " ").title()
                sec_courses = [c for c in all_courses if c['type'] == sec_title]
                
                if sec_courses:
                    with st.expander(f"{sec_title} ({len(sec_courses)})", expanded=( "department" in sec)):
                        cols = st.columns(2)
                        for i, course in enumerate(sec_courses):
                            code = course['code']
                            key = f"chk_{major}_{code}"
                            
                            fw = course.get('framework', 'HTU')
                            label = f"[{fw}] {code} - {course['name']} ({course['ch']} CH)"
                            
                            is_checked = code in st.session_state.completed_courses
                            
                            with cols[i % 2]:
                                if st.checkbox(label, value=is_checked, key=key):
                                    st.session_state.completed_courses.add(code)
                                else:
                                    if code in st.session_state.completed_courses:
                                        st.session_state.completed_courses.remove(code)
        else:
             # Display by Level
             levels = {
                 1: "First Year (Level 1)",
                 2: "Second Year (Level 2)",
                 3: "Third Year (Level 3)",
                 4: "Fourth Year (Level 4)"
             }
             
             for lvl in [1, 2, 3, 4]:
                 lvl_courses = [c for c in all_courses if c.get('level', 1) == lvl]
                 
                 if lvl_courses:
                     with st.expander(f"{levels[lvl]} ({len(lvl_courses)})", expanded=True):
                         cols = st.columns(2)
                         for i, course in enumerate(lvl_courses):
                            code = course['code']
                            key = f"chk_{major}_{code}_lvl"
                            
                            fw = course.get('framework', 'HTU')
                            label = f"[{fw}] {code} - {course['name']} ({course['ch']} CH)"
                            
                            is_checked = code in st.session_state.completed_courses
                            
                            with cols[i % 2]:
                                if st.checkbox(label, value=is_checked, key=key):
                                    st.session_state.completed_courses.add(code)
                                    st.rerun() 
                                else:
                                    if code in st.session_state.completed_courses:
                                        st.session_state.completed_courses.remove(code)
                                        st.rerun()
                                    
        # Calculate totals from session state
        completed_chs = sum(c['ch'] for c in all_courses if c['code'] in st.session_state.completed_courses)
        
        st.sidebar.markdown("---")
        total_creds = int(course_data.get('total_credits', 135))
        st.sidebar.metric("Completed Credits", f"{completed_chs} / {total_creds}")
        if total_creds > 0:
            st.sidebar.progress(min(completed_chs / total_creds, 1.0))
    else:
        st.write("No courses available to track.")

with tab3:
    st.header("🧠 Smart Course Advisor")
    st.info("Based on your transcript, here are the courses you can take next.")
    
    if not df.empty:
        # 1. Calculate Status for ALL courses
        total_completed_ch = sum(c['ch'] for c in all_courses if c['code'] in st.session_state.completed_courses)
        
        available = []
        locked = []
        finished = []
        
        for course in all_courses:
            code = course['code']
            if code in st.session_state.completed_courses:
                finished.append(course)
                continue
                
            is_met, req_msg = parse_prereqs(course.get('prereq'), st.session_state.completed_courses, total_completed_ch)
            
            course_view = course.copy()
            course_view['reason'] = req_msg
            
            if is_met:
                available.append(course_view)
            else:
                locked.append(course_view)
        
        # 2. Display Available
        st.subheader(f"🔓 Available Now ({len(available)} Courses)")
        if available:
            # Sort by priority: Uni > College > Dept > Elective
            priority_map = {
                "University Requirements": 1,
                "College Requirements": 2,
                "Department Requirements": 3,
                "Electives": 4
            }
            available.sort(key=lambda x: priority_map.get(x['type'], 5))
            
            av_df = pd.DataFrame(available)
            st.dataframe(
                av_df[["code", "name", "ch", "framework", "type", "reason"]],
                use_container_width=True,
                hide_index=True,
                column_config={
                     "code": "Code", "name": "Name", "ch": "Credits", 
                     "framework": "Type", "type": "Category", "reason": "Status"
                }
            )
        else:
            st.success("🎉 You have completed all available courses!")

        # 3. Display Locked
        with st.expander(f"🔒 Locked Courses ({len(locked)})"):
            if locked:
                lock_df = pd.DataFrame(locked)
                st.dataframe(
                    lock_df[["code", "name", "ch", "prereq", "reason"]],
                    use_container_width=True,
                    hide_index=True
                )
    else:
        st.write("No data.")

    # --- Semester Planner Section ---
    st.markdown("---")
    st.header("📅 Plan Next Semester")
    
    col_plan1, col_plan2 = st.columns([1, 2])
    
    with col_plan1:
        sem_type = st.radio("Semester Type", ["First/Second Semester", "Summer Semester"])
        
        # Define Limits
        if sem_type == "Summer Semester":
            min_ch, max_ch = 1, 9
        else:
            min_ch, max_ch = 12, 18
            
        st.info(f"**Rules for {sem_type}:**\n- Minimum: {min_ch} CH\n- Maximum: {max_ch} CH")

    with col_plan2:
        # Get list of available course names/codes for the dropdown
        # defined above as 'available' list of dicts
        
        if available:
            # Create labels for dropdown
            options = {f"{c['code']} - {c['name']} ({c['ch']} CH)": c for c in available}
            
            selected_labels = st.multiselect(
                "Select courses to register:",
                options=list(options.keys())
            )
            
            # Validation
            selected_courses = [options[l] for l in selected_labels]
            plan_ch = sum(c['ch'] for c in selected_courses)
            
            st.metric("Planned Credit Hours", f"{plan_ch} / {max_ch}")
            
            if plan_ch == 0:
                st.write("Select courses to start planning.")
            elif plan_ch < min_ch:
                st.warning(f"⚠️ **Underload**: You need {min_ch - plan_ch} more credits to reach the minimum of {min_ch}.")
            elif plan_ch > max_ch:
                st.error(f"⛔ **Overload**: You strictly exceeded the maximum of {max_ch} CH by {plan_ch - max_ch}.")
            else:
                st.success("✅ **Valid Schedule**: Your credit load is within the allowed range.")
                
        else:
            st.warning("No available courses to plan with. Complete prerequisites first.")
