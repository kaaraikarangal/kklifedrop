import os
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api_base():
    assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
    return API


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session, api_base):
    r = session.post(f"{api_base}/auth/admin/login", json={
        "email": "admin@k2lifedrop.com",
        "password": "Admin@123",
    })
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


def _random_mobile():
    import random
    return "7" + "".join(str(random.randint(0, 9)) for _ in range(9))


@pytest.fixture(scope="session")
def user_token_and_mobile(session, api_base):
    mobile = _random_mobile()
    r = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]
    r2 = session.post(f"{api_base}/auth/verify-otp", json={"mobile": mobile, "otp": otp})
    assert r2.status_code == 200, r2.text
    return r2.json()["token"], mobile, r2.json()["is_registered"]
