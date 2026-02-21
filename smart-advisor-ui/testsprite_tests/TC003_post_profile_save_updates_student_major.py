import requests

BASE_URL = "http://localhost:3000"
STUDENT_ID = "S12345"
PASSWORD = "secret"
HEADERS_JSON = {"Content-Type": "application/json"}
TIMEOUT = 30


def authenticate(student_id, password):
    url = f"{BASE_URL}/api/auth/signin/credentials"
    body = {
        "student_id": student_id,
        "password": password
    }
    resp = requests.post(url, json=body, timeout=TIMEOUT)
    resp.raise_for_status()
    # Extract session cookie for authenticated requests
    return resp.cookies


def get_profile_major(cookies, student_id):
    url = f"{BASE_URL}/api/profile/{student_id}"
    resp = requests.get(url, cookies=cookies, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json().get("major")


def post_profile_save(cookies, student_id, major):
    url = f"{BASE_URL}/api/profile/{student_id}/save"
    body = {"major": major}
    resp = requests.post(url, json=body, cookies=cookies, timeout=TIMEOUT)
    return resp


def post_profile_save_no_auth(student_id, major):
    url = f"{BASE_URL}/api/profile/{student_id}/save"
    body = {"major": major}
    resp = requests.post(url, json=body, timeout=TIMEOUT)
    return resp


def test_post_profile_save_updates_student_major():
    # Authenticate user and get session cookie
    cookies = authenticate(STUDENT_ID, PASSWORD)

    # 1. Happy path: update with valid major
    valid_major = "Computer Science"
    resp = post_profile_save(cookies, STUDENT_ID, valid_major)
    assert resp.status_code == 200, f"Expected 200 OK, got {resp.status_code}"
    json_resp = resp.json()
    assert json_resp.get("success") is True, "Response success flag missing or false"

    # Verify that major was updated by GET /api/profile/{studentId}
    major_after_update = get_profile_major(cookies, STUDENT_ID)
    assert major_after_update == valid_major, f"Expected major '{valid_major}', got '{major_after_update}'"

    # 2. Invalid input (empty major) should return 400
    invalid_major = ""
    resp = post_profile_save(cookies, STUDENT_ID, invalid_major)
    assert resp.status_code == 400, f"Expected 400 Bad Request for invalid major, got {resp.status_code}"

    # 3. Unauthorized access (no session cookie) returns 401
    resp = post_profile_save_no_auth(STUDENT_ID, valid_major)
    assert resp.status_code == 401, f"Expected 401 Unauthorized without session, got {resp.status_code}"


test_post_profile_save_updates_student_major()