import requests

BASE_URL = "http://localhost:3000"
STUDENT_ID = "S12345"
PASSWORD = "secret"
TIMEOUT = 30

def test_post_planner_saves_or_updates_planner_data():
    session = requests.Session()

    # Sign in to obtain session cookie/JWT
    auth_payload = {
        "student_id": STUDENT_ID,
        "password": PASSWORD
    }
    auth_response = session.post(
        f"{BASE_URL}/api/auth/signin/credentials",
        json=auth_payload,
        timeout=TIMEOUT
    )
    assert auth_response.status_code == 200, f"Login failed: {auth_response.text}"

    # Prepare a valid planner payload
    # To avoid collision, use a generated id (e.g. "test-sem123")
    valid_planner_payload = {
        "id": "test-sem123",
        "name": "Test Spring 2026",
        "courses": [
            {
                "code": "CS101",
                "name": "Intro to Computer Science",
                "credits": 3,
                "grade": "A"
            },
            {
                "code": "MATH201",
                "name": "Calculus II",
                "credits": 4,
                "grade": "B+"
            }
        ],
        "studySessions": [
            {
                "day": "Monday",
                "time": "15:00",
                "duration": 2,
                "location": "Library"
            }
        ]
    }

    # POST valid planner data (should save/update)
    post_response = session.post(
        f"{BASE_URL}/api/planner",
        json=valid_planner_payload,
        timeout=TIMEOUT
    )
    assert post_response.status_code == 200, f"Valid POST failed: {post_response.text}"
    post_json = post_response.json()
    assert "success" in post_json and post_json["success"] is True, f"Expected success true, got: {post_json}"

    # GET planner to verify update was saved
    get_response = session.get(
        f"{BASE_URL}/api/planner",
        timeout=TIMEOUT
    )
    assert get_response.status_code == 200, f"GET planner failed: {get_response.text}"
    planner_data = get_response.json()
    assert planner_data.get("id") == valid_planner_payload["id"]
    assert planner_data.get("name") == valid_planner_payload["name"]
    assert isinstance(planner_data.get("courses"), list)
    assert isinstance(planner_data.get("studySessions"), list)

    # Test invalid payload - missing required fields (e.g., missing 'id')
    invalid_payload = {
        "name": "Invalid Planner Without ID",
        "courses": [],
        "studySessions": []
    }
    invalid_response = session.post(
        f"{BASE_URL}/api/planner",
        json=invalid_payload,
        timeout=TIMEOUT
    )
    assert invalid_response.status_code == 400, f"Invalid payload should return 400: {invalid_response.text}"

    # Test unauthorized access - no auth/session cookie
    session_no_auth = requests.Session()
    unauth_response = session_no_auth.post(
        f"{BASE_URL}/api/planner",
        json=valid_planner_payload,
        timeout=TIMEOUT
    )
    assert unauth_response.status_code == 401, f"Unauthorized POST should return 401: {unauth_response.text}"

test_post_planner_saves_or_updates_planner_data()