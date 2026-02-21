import requests

BASE_URL = "http://localhost:3000"
STUDENT_ID = "S12345"
PASSWORD = "secret"
TIMEOUT = 30

def test_get_planner_loads_user_planner_with_auth():
    session = requests.Session()
    signin_url = f"{BASE_URL}/api/auth/signin/credentials"
    planner_url = f"{BASE_URL}/api/planner"

    # Step 1: Sign in with valid credentials
    signin_payload = {"student_id": STUDENT_ID, "password": PASSWORD}
    try:
        signin_resp = session.post(signin_url, json=signin_payload, timeout=TIMEOUT)
        assert signin_resp.status_code == 200, f"Signin failed: {signin_resp.text}"

        # Step 2: Access /api/planner with valid session cookie
        planner_resp = session.get(planner_url, timeout=TIMEOUT)
        assert planner_resp.status_code == 200, f"Planner load failed: {planner_resp.text}"

        planner_data = planner_resp.json()
        # Validate presence of required keys in response
        assert isinstance(planner_data, dict), "Planner response is not a dict"
        assert "id" in planner_data, "Planner response missing 'id'"
        assert "name" in planner_data, "Planner response missing 'name'"
        assert "courses" in planner_data and isinstance(planner_data["courses"], list), "Planner response missing or invalid 'courses'"
        assert "studySessions" in planner_data and isinstance(planner_data["studySessions"], list), "Planner response missing or invalid 'studySessions'"

        # Step 3: Access /api/planner without session cookie
        session_no_auth = requests.Session()
        planner_no_auth_resp = session_no_auth.get(planner_url, timeout=TIMEOUT)
        assert planner_no_auth_resp.status_code == 401, f"Expected 401 Unauthorized without auth, got {planner_no_auth_resp.status_code}"

    finally:
        session.close()


test_get_planner_loads_user_planner_with_auth()