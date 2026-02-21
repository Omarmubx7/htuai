import requests

BASE_URL = "http://localhost:3000"
STUDENT_ID = "S12345"
PASSWORD = "secret"
TIMEOUT = 30


def test_get_profile_returns_student_major_with_auth():
    session = requests.Session()
    login_url = f"{BASE_URL}/api/auth/signin/credentials"
    profile_url = f"{BASE_URL}/api/profile/{STUDENT_ID}"

    # Step 1: Sign in to get a valid session
    login_payload = {"student_id": STUDENT_ID, "password": PASSWORD}
    try:
        login_resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"

        # Step 2: GET /api/profile/{studentId} with valid session
        profile_resp = session.get(profile_url, timeout=TIMEOUT)
        assert profile_resp.status_code == 200, f"Expected 200 OK but got {profile_resp.status_code}"
        json_data = profile_resp.json()
        assert "major" in json_data, "Response JSON missing 'major' field"

        # Step 3: GET /api/profile/{studentId} with session cookie but mismatched studentId
        other_student_id = "S99999"
        wrong_profile_url = f"{BASE_URL}/api/profile/{other_student_id}"
        wrong_resp = session.get(wrong_profile_url, timeout=TIMEOUT)
        assert wrong_resp.status_code == 401, f"Expected 401 Unauthorized but got {wrong_resp.status_code}"

        # Step 4: GET /api/profile/{studentId} without session cookie
        session_no_auth = requests.Session()
        no_auth_resp = session_no_auth.get(profile_url, timeout=TIMEOUT)
        assert no_auth_resp.status_code == 401, f"Expected 401 Unauthorized without session but got {no_auth_resp.status_code}"

    finally:
        # Sign out to clean session if needed
        signout_url = f"{BASE_URL}/api/auth/signout"
        session.post(signout_url, timeout=TIMEOUT)


test_get_profile_returns_student_major_with_auth()