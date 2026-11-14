from copy import deepcopy
from importlib import import_module
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient


app_module = import_module("src.app")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(app_module, "activities", deepcopy(app_module.activities))
    return TestClient(app_module.app)


def test_list_activities(client):
    response = client.get("/activities")

    assert response.status_code == 200
    activities = response.json()
    assert "Basketball Team" in activities
    assert activities["Basketball Team"]["participants"] == []


def test_signup_adds_student(client):
    activity_name = "Basketball Team"
    email = "student@mergington.edu"

    response = client.post(
        f"/activities/{quote(activity_name, safe='')}/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert email in client.get("/activities").json()[activity_name]["participants"]


def test_duplicate_signup_is_rejected(client):
    activity_name = "Basketball Team"
    email = "student@mergington.edu"
    signup_url = f"/activities/{quote(activity_name, safe='')}/signup"

    assert client.post(signup_url, params={"email": email}).status_code == 200
    response = client.post(signup_url, params={"email": email})

    assert response.status_code == 409
    assert client.get("/activities").json()[activity_name]["participants"].count(email) == 1


def test_cancel_signup_removes_student_from_only_that_activity(client):
    activity_name = "Basketball Team"
    other_activity = "Swimming Club"
    email = "student@mergington.edu"
    activity_url = f"/activities/{quote(activity_name, safe='')}"

    assert client.post(
        f"{activity_url}/signup", params={"email": email}
    ).status_code == 200
    app_module.activities[other_activity]["participants"].append(email)

    response = client.post(f"{activity_url}/cancel", params={"email": email})

    assert response.status_code == 200
    activities = client.get("/activities").json()
    assert email not in activities[activity_name]["participants"]
    assert email in activities[other_activity]["participants"]
