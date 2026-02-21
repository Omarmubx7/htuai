import requests

BASE_URL = "http://localhost:3000"
STUDENT_ID = "S12345"
PASSWORD = "secret"
TIMEOUT = 30

def test_post_notion_syncs_courses_to_notion_database():
    session = requests.Session()
    signin_url = f"{BASE_URL}/api/auth/signin/credentials"
    notion_sync_url = f"{BASE_URL}/api/integrations/notion"

    # Step 1: Sign in to get session cookie
    signin_payload = {
        "student_id": STUDENT_ID,
        "password": PASSWORD
    }
    signin_resp = session.post(signin_url, json=signin_payload, timeout=TIMEOUT)
    assert signin_resp.status_code == 200, f"Sign in failed with status {signin_resp.status_code}"

    # Step 2: Load current planner to get courses if needed
    planner_get_url = f"{BASE_URL}/api/planner"
    planner_resp = session.get(planner_get_url, timeout=TIMEOUT)
    assert planner_resp.status_code == 200, f"Failed to get planner data, status: {planner_resp.status_code}"
    planner_data = planner_resp.json()
    courses = planner_data.get("courses", [])
    semester_name = planner_data.get("name", "Test Semester")

    # Compose payload for Notion sync
    notion_payload = {
        "courses": courses,
        "semesterName": semester_name,
        "createNewPage": True
    }

    # Step 3: Test POST with stored Notion token (happy path)
    notion_resp = session.post(notion_sync_url, json=notion_payload, timeout=TIMEOUT)
    assert notion_resp.status_code == 200, f"Notion sync failed with status {notion_resp.status_code}"
    notion_json = notion_resp.json()
    assert "success" in notion_json and notion_json["success"] is True, "Notion sync response missing or false success"

    # Step 4: Test POST without stored Notion token should return 401
    # To simulate missing token, sign out and sign in with a test user without Notion token or forcibly clear session cookie
    # Since no token info given, simulate by clearing session cookies before request

    session.cookies.clear()  # Clear cookies to simulate missing auth/session

    # Sign in again but do not send cookies to simulate no token stored
    signin_resp2 = session.post(signin_url, json=signin_payload, timeout=TIMEOUT)
    assert signin_resp2.status_code == 200, "Re-signin failed for token missing test"

    # Manually delete any Notion token from DB is not possible from test, so simulate missing token by clearing cookie again
    session.cookies.clear()

    notion_resp_missing_token = session.post(notion_sync_url, json=notion_payload, timeout=TIMEOUT)
    assert notion_resp_missing_token.status_code == 401, f"Expected 401 Unauthorized for missing Notion token but got {notion_resp_missing_token.status_code}"

test_post_notion_syncs_courses_to_notion_database()