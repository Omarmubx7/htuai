import requests

BASE_URL = "http://localhost:3000"
STUDENT_ID = "S12345"
PASSWORD = "secret"
TIMEOUT = 30

def test_get_progress_returns_completed_courses_with_auth():
    session = requests.Session()

    # Step 1: Sign in to get valid session cookie
    signin_url = f"{BASE_URL}/api/auth/signin/credentials"
    signin_payload = {"student_id": STUDENT_ID, "password": PASSWORD}
    try:
        signin_resp = session.post(signin_url, json=signin_payload, timeout=TIMEOUT)
        assert signin_resp.status_code == 200, f"Signin failed with status {signin_resp.status_code}"
    except requests.RequestException as e:
        assert False, f"Signin request failed: {e}"

    major = "Computer Science"  # Use a plausible major string for query param
    progress_url = f"{BASE_URL}/api/progress/{STUDENT_ID}"
    params = {"major": major}

    # Step 2: GET /api/progress/{studentId}?major=X with valid session
    try:
        get_resp = session.get(progress_url, params=params, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Expected 200, got {get_resp.status_code}"
        data = get_resp.json()
        assert "completed" in data, "Response JSON missing 'completed'"
        assert isinstance(data["completed"], list), "'completed' is not a list"

        # Check that each completed item has at least 'code' and 'name' keys as strings
        for course in data["completed"]:
            assert isinstance(course, dict), "Course entry not a dict"
            assert "code" in course and isinstance(course["code"], str), "Course missing 'code' or not string"
            assert "name" in course and isinstance(course["name"], str), "Course missing 'name' or not string"
    except requests.RequestException as e:
        assert False, f"GET progress request failed: {e}"

    # Step 3: GET /api/progress/{studentId}?major=X without session (no cookie) should return 401 Unauthorized
    session_no_auth = requests.Session()  # New session with no auth
    try:
        get_resp_no_auth = session_no_auth.get(progress_url, params=params, timeout=TIMEOUT)
        assert get_resp_no_auth.status_code == 401, f"Expected 401 Unauthorized without session, got {get_resp_no_auth.status_code}"
    except requests.RequestException as e:
        assert False, f"GET progress request without auth failed: {e}"

test_get_progress_returns_completed_courses_with_auth()