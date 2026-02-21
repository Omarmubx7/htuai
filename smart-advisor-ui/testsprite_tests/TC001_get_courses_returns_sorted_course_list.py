import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_courses_returns_sorted_course_list():
    url = f"{BASE_URL}/api/courses"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        courses = response.json()
        assert isinstance(courses, list), "Response is not a list"
        # Check each item has required keys and correct types
        for course in courses:
            assert isinstance(course, dict), "Course item is not a dict"
            assert "name" in course, "Course missing 'name'"
            assert "code" in course, "Course missing 'code'"
            assert "ch" in course, "Course missing 'ch'"
            assert isinstance(course["name"], str), "'name' is not a string"
            assert isinstance(course["code"], str), "'code' is not a string"
            assert isinstance(course["ch"], (int, float)), "'ch' is not a number"
        # Verify courses are sorted by 'name' ascending (common sorted criteria)
        names = [course["name"] for course in courses]
        assert names == sorted(names), "Courses are not sorted by name"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_courses_returns_sorted_course_list()