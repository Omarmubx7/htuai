import requests

BASE_URL = "http://localhost:3000"
ADMIN_SECRET = "ADMIN_SECRET"  # This should be the valid admin secret string
TIMEOUT = 30


def test_get_admin_stats_requires_valid_admin_secret():
    url = f"{BASE_URL}/api/admin/stats"

    # Case 1: Missing x-admin-secret header -> Expect 401 Unauthorized
    try:
        resp_no_header = requests.get(url, timeout=TIMEOUT)
        assert resp_no_header.status_code == 401, f"Expected 401 but got {resp_no_header.status_code}"
        # Optional: check error message if any
        json_no_header = resp_no_header.json()
        assert "error" in json_no_header or resp_no_header.text.lower().find("unauthorized") >= 0
    except requests.RequestException as e:
        assert False, f"Request failed for missing header case: {e}"

    # Case 2: Invalid x-admin-secret header -> Expect 401 Unauthorized
    headers_invalid = {"x-admin-secret": "WRONG_SECRET"}
    try:
        resp_invalid = requests.get(url, headers=headers_invalid, timeout=TIMEOUT)
        assert resp_invalid.status_code == 401, f"Expected 401 but got {resp_invalid.status_code}"
        json_invalid = resp_invalid.json()
        assert "error" in json_invalid or resp_invalid.text.lower().find("unauthorized") >= 0
    except requests.RequestException as e:
        assert False, f"Request failed for invalid header case: {e}"

    # Case 3: Valid x-admin-secret header -> Expect 200 OK with comprehensive analytics data
    headers_valid = {"x-admin-secret": ADMIN_SECRET}
    try:
        resp_valid = requests.get(url, headers=headers_valid, timeout=TIMEOUT)
        assert resp_valid.status_code == 200, f"Expected 200 but got {resp_valid.status_code}"
        data = resp_valid.json()
        # Validate presence and types of key analytics fields as per PRD
        assert "totalStudents" in data and isinstance(data["totalStudents"], int)
        assert "visitorCount" in data and isinstance(data["visitorCount"], int)
        assert "majorDistribution" in data and isinstance(data["majorDistribution"], dict)
        assert "progressDistribution" in data and isinstance(data["progressDistribution"], dict)
        assert "topCourses" in data and isinstance(data["topCourses"], list)
        assert "trafficTrends" in data and isinstance(data["trafficTrends"], list)
        assert "deviceBreakdown" in data and isinstance(data["deviceBreakdown"], dict)
        assert "recentActivity" in data and isinstance(data["recentActivity"], list)
        assert "heatmap" in data and isinstance(data["heatmap"], list)
        assert "studentData" in data and isinstance(data["studentData"], list)
    except requests.RequestException as e:
        assert False, f"Request failed for valid header case: {e}"


test_get_admin_stats_requires_valid_admin_secret()