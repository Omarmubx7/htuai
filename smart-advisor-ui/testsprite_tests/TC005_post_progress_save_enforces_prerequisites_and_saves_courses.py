import requests

BASE_URL = "http://localhost:3000"
STUDENT_ID = "S12345"
PASSWORD = "secret"
TIMEOUT = 30

def test_post_progress_save_enforces_prerequisites_and_saves_courses():
    session = requests.Session()

    # Authenticate to get session cookie
    auth_resp = session.post(
        f"{BASE_URL}/api/auth/signin/credentials",
        json={"student_id": STUDENT_ID, "password": PASSWORD},
        timeout=TIMEOUT
    )
    assert auth_resp.status_code == 200, f"Authentication failed: {auth_resp.text}"

    headers = {"Content-Type": "application/json"}

    # Utility function to save progress
    def save_progress(body):
        return session.post(
            f"{BASE_URL}/api/progress/{STUDENT_ID}/save",
            json=body,
            headers=headers,
            timeout=TIMEOUT
        )

    # 1. Negative test: attempt to save a course with unmet prerequisite
    # Example: try to save CS103 without completing CS102
    # According to prereq rule: PREFIXnnn requires PREFIX+(nnn-1)
    incomplete_courses_body = {
        "major": "Computer Science",
        "completed": [
            {"code": "CS103", "name": "Course CS103"}  # prereq CS102 not completed
        ]
    }
    resp = save_progress(incomplete_courses_body)
    assert resp.status_code == 400, "Expected 400 for unmet prerequisites"
    json_resp = resp.json()
    assert "error" in json_resp and json_resp["error"] == "prerequisite_not_met", f"Unexpected error response: {json_resp}"
    assert "details" in json_resp and isinstance(json_resp["details"], list), "Expected details list in error response"

    # 2. Positive test: save courses with all prerequisites met
    # Save CS101, CS102, then CS103 in order (simulate progress)
    try:
        # Save CS101 first (no prereq)
        body_cs101 = {
            "major": "Computer Science",
            "completed": [
                {"code": "CS101", "name": "Intro to CS"}
            ]
        }
        r1 = save_progress(body_cs101)
        assert r1.status_code == 200 and r1.json().get("success") is True, f"Failed to save CS101: {r1.text}"

        # Save CS102 with CS101 completed
        body_cs102 = {
            "major": "Computer Science",
            "completed": [
                {"code": "CS101", "name": "Intro to CS"},
                {"code": "CS102", "name": "Data Structures"}
            ]
        }
        r2 = save_progress(body_cs102)
        assert r2.status_code == 200 and r2.json().get("success") is True, f"Failed to save CS102: {r2.text}"

        # Save CS103 with CS102 completed
        body_cs103 = {
            "major": "Computer Science",
            "completed": [
                {"code": "CS101", "name": "Intro to CS"},
                {"code": "CS102", "name": "Data Structures"},
                {"code": "CS103", "name": "Algorithms"}
            ]
        }
        r3 = save_progress(body_cs103)
        assert r3.status_code == 200 and r3.json().get("success") is True, f"Failed to save CS103: {r3.text}"

        # Verify saved progress via GET
        get_resp = session.get(
            f"{BASE_URL}/api/progress/{STUDENT_ID}",
            params={"major": "Computer Science"},
            timeout=TIMEOUT
        )
        assert get_resp.status_code == 200, f"Failed to get progress: {get_resp.text}"
        completed_courses = get_resp.json().get("completed", [])
        codes = {c["code"] for c in completed_courses}
        assert {"CS101", "CS102", "CS103"}.issubset(codes), f"Saved courses missing or incomplete: {codes}"

    finally:
        # Cleanup: Remove all saved courses progress for the student for this major by saving empty completed
        cleanup_body = {
            "major": "Computer Science",
            "completed": []
        }
        cleanup_resp = save_progress(cleanup_body)
        assert cleanup_resp.status_code == 200 and cleanup_resp.json().get("success") is True, f"Cleanup failed: {cleanup_resp.text}"

test_post_progress_save_enforces_prerequisites_and_saves_courses()