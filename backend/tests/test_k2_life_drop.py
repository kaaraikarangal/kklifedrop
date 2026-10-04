"""Backend tests for K2 Life Drop - comprehensive coverage of required endpoints."""
import random
import time
import pytest


def _rand_mobile():
    return "8" + "".join(str(random.randint(0, 9)) for _ in range(9))


def _rand_aadhaar():
    return "".join(str(random.randint(0, 9)) for _ in range(12))


# ---------- Meta ----------
class TestMeta:
    def test_meta(self, session, api_base):
        r = session.get(f"{api_base}/meta")
        assert r.status_code == 200
        data = r.json()
        for k in ("blood_groups", "urgency", "request_statuses"):
            assert k in data and isinstance(data[k], list) and data[k]


# ---------- OTP auth ----------
class TestOTP:
    def test_send_otp_returns_dev_otp(self, session, api_base):
        mobile = _rand_mobile()
        r = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile})
        assert r.status_code == 200
        body = r.json()
        assert body.get("dev_otp") and len(body["dev_otp"]) == 6

    def test_send_otp_rate_limit(self, session, api_base):
        mobile = _rand_mobile()
        for _ in range(3):
            r = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile})
            assert r.status_code == 200
        r4 = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile})
        assert r4.status_code == 429

    def test_verify_otp_success_new_user(self, session, api_base):
        mobile = _rand_mobile()
        otp = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile}).json()["dev_otp"]
        r = session.post(f"{api_base}/auth/verify-otp", json={"mobile": mobile, "otp": otp})
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and body["is_registered"] is False

    def test_verify_otp_wrong(self, session, api_base):
        mobile = _rand_mobile()
        session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile})
        r = session.post(f"{api_base}/auth/verify-otp", json={"mobile": mobile, "otp": "000000"})
        assert r.status_code == 400


# ---------- Donor registration + public listing ----------
class TestDonors:
    @pytest.fixture(scope="class")
    def new_user(self, session, api_base):
        mobile = _rand_mobile()
        otp = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile}).json()["dev_otp"]
        tok = session.post(f"{api_base}/auth/verify-otp", json={"mobile": mobile, "otp": otp}).json()["token"]
        return tok, mobile

    def test_register_donor(self, session, api_base, new_user):
        tok, mobile = new_user
        payload = {
            "full_name": "TEST_Rahul Verma", "gender": "Male", "date_of_birth": "1992-02-02",
            "blood_group": "O+", "email": "test_rahul@example.com", "mobile": mobile,
            "area": "TestArea", "place": "TestPlace", "district": "TestDistrict",
            "state": "Tamil Nadu", "pincode": "600001",
            "aadhaar": _rand_aadhaar(),
            "availability": "Available", "donation_opt_in": True,
            "last_donation_date": None, "consent": True,
        }
        r = session.post(f"{api_base}/donors", json=payload, headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200, r.text
        donor = r.json()["donor"]
        # Should not leak mobile/email/encrypted_aadhaar
        for forbidden in ("mobile", "email", "encrypted_aadhaar", "_id"):
            assert forbidden not in donor
        assert donor.get("masked_aadhaar", "").startswith("XXXX XXXX ")

    def test_duplicate_mobile_409(self, session, api_base, new_user):
        tok, mobile = new_user
        payload = {
            "full_name": "TEST_dup", "gender": "Male", "date_of_birth": "1992-02-02",
            "blood_group": "O+", "email": "dup@example.com", "mobile": mobile,
            "area": "x", "place": "x", "district": "x", "state": "x", "pincode": "600001",
            "aadhaar": _rand_aadhaar(),
            "availability": "Available", "donation_opt_in": True, "consent": True,
        }
        r = session.post(f"{api_base}/donors", json=payload, headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 409

    def test_list_public_donors_hides_sensitive(self, session, api_base):
        r = session.get(f"{api_base}/donors")
        assert r.status_code == 200
        donors = r.json()["donors"]
        assert donors
        for d in donors:
            for forbidden in ("mobile", "email", "encrypted_aadhaar", "_id"):
                assert forbidden not in d, f"Found {forbidden} in public donor"
            assert "masked_aadhaar" in d

    def test_filter_by_blood_group(self, session, api_base):
        r = session.get(f"{api_base}/donors", params={"blood_group": "B+"})
        assert r.status_code == 200
        donors = r.json()["donors"]
        assert donors
        assert all(d["blood_group"] == "B+" for d in donors)

    def test_filter_by_search_karaikal(self, session, api_base):
        r = session.get(f"{api_base}/donors", params={"search": "karaikal"})
        assert r.status_code == 200
        donors = r.json()["donors"]
        assert donors
        assert all(
            "karaikal" in (d.get("area", "") + d.get("place", "")).lower()
            for d in donors
        )

    def test_me_and_patch(self, session, api_base, new_user):
        tok, mobile = new_user
        headers = {"Authorization": f"Bearer {tok}"}
        r = session.get(f"{api_base}/donors/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["donor"]["mobile"] == mobile

        r2 = session.patch(f"{api_base}/donors/me",
                           json={"availability": "Not Available", "donation_opt_in": False},
                           headers=headers)
        assert r2.status_code == 200
        d = r2.json()["donor"]
        assert d["availability"] == "Not Available"
        assert d["donation_opt_in"] is False


# ---------- Blood requests ----------
class TestBloodRequests:
    @pytest.fixture(scope="class")
    def created_request(self, session, api_base):
        payload = {
            "patient_name": "TEST_Patient", "blood_group": "B+", "units_required": 2,
            "hospital_name": "TEST Hospital", "hospital_area": "Karaikal",
            "hospital_city": "Karaikal", "required_date": "2026-02-01",
            "urgency": "Urgent", "requester_name": "TEST Requester",
            "requester_mobile": "9000000011", "relationship": "Brother",
        }
        r = session.post(f"{api_base}/blood-requests", json=payload)
        assert r.status_code == 200
        return r.json()

    def test_request_number_format(self, created_request):
        rid = created_request["request_id"]
        import re as _re
        assert _re.match(r"^K2-BR-\d{8}-\d{3}$", rid), rid
        assert created_request["status"] == "Pending"

    def test_get_request_by_id_and_number(self, session, api_base, created_request):
        r1 = session.get(f"{api_base}/blood-requests/{created_request['id']}")
        assert r1.status_code == 200
        r2 = session.get(f"{api_base}/blood-requests/{created_request['request_id']}")
        assert r2.status_code == 200
        assert r1.json()["request"]["request_number"] == created_request["request_id"]

    def test_list_filter_by_mobile(self, session, api_base, created_request):
        r = session.get(f"{api_base}/blood-requests", params={"mobile": "9000000011"})
        assert r.status_code == 200
        reqs = r.json()["requests"]
        assert reqs
        assert all(x["requester_mobile"] == "9000000011" for x in reqs)
        for x in reqs:
            assert "_id" not in x

    def test_contact_donor(self, session, api_base):
        donors = session.get(f"{api_base}/donors", params={"blood_group": "B+"}).json()["donors"]
        did = donors[0]["id"]
        payload = {
            "donor_id": did, "patient_name": "TEST_CD", "blood_group": "B+",
            "hospital_name": "H1", "hospital_city": "Karaikal",
            "urgency": "Emergency", "requester_name": "RN", "requester_mobile": "9000000022",
        }
        r = session.post(f"{api_base}/blood-requests/contact-donor", json=payload)
        assert r.status_code == 200
        assert r.json()["request_id"].startswith("K2-BR-")


# ---------- Admin ----------
class TestAdmin:
    def test_admin_login(self, admin_token):
        assert admin_token

    def test_admin_stats(self, session, api_base, admin_token):
        r = session.get(f"{api_base}/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        required = ["total_donors", "available_donors", "total_requests",
                    "pending_requests", "emergency_requests", "fulfilled_requests",
                    "donors_by_blood_group", "donors_by_district",
                    "notifications_sent", "notifications_responded", "response_rate_pct"]
        for k in required:
            assert k in data, f"missing {k}"
        assert isinstance(data["donors_by_blood_group"], dict)
        assert data["total_donors"] >= 8

    def test_admin_donors_list(self, session, api_base, admin_token):
        r = session.get(f"{api_base}/admin/donors", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        donors = r.json()["donors"]
        assert donors
        d = donors[0]
        assert "mobile" in d and "email" in d
        assert d.get("aadhaar_status") == "Stored (Encrypted)"
        for forbidden in ("encrypted_aadhaar", "_id"):
            assert forbidden not in d
        # Raw aadhaar must not be present
        assert "aadhaar" not in d or d.get("aadhaar") is None

    def test_admin_reveal_aadhaar(self, session, api_base, admin_token):
        donors = session.get(f"{api_base}/admin/donors",
                             headers={"Authorization": f"Bearer {admin_token}"}).json()["donors"]
        did = donors[0]["id"]
        r = session.get(f"{api_base}/admin/donors/{did}/aadhaar",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        aad = r.json()["aadhaar"]
        import re as _re
        digits = _re.sub(r"\D", "", aad)
        assert len(digits) == 12

    def test_admin_endpoints_require_admin(self, session, api_base, user_token_and_mobile):
        tok, _, _ = user_token_and_mobile
        r = session.get(f"{api_base}/admin/stats", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 403

    def test_user_endpoint_rejects_admin(self, session, api_base, admin_token):
        r = session.get(f"{api_base}/donors/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 403


# ---------- Matching + Notify flow ----------
class TestMatchingNotify:
    @pytest.fixture(scope="class")
    def req_bp(self, session, api_base):
        payload = {
            "patient_name": "TEST_Notify", "blood_group": "B+", "units_required": 1,
            "hospital_name": "H", "hospital_area": "Karaikal",
            "hospital_city": "Karaikal", "required_date": "2026-02-10",
            "urgency": "Emergency", "requester_name": "Req",
            "requester_mobile": "9000000033", "relationship": "Friend",
        }
        r = session.post(f"{api_base}/blood-requests", json=payload)
        assert r.status_code == 200
        return r.json()

    def test_matching_donors(self, session, api_base, admin_token, req_bp):
        r = session.get(f"{api_base}/blood-requests/{req_bp['id']}/matching-donors",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        for k in ("same_area", "same_district", "other", "counts", "request"):
            assert k in data
        assert data["request"]["blood_group"] == "B+"
        # Karaikal B+ seeded donors (2 in area Karaikal B+ available opt-in)
        assert data["counts"]["same_area"] >= 2
        # All should be B+ Available opt_in
        for bucket in ("same_area", "same_district", "other"):
            for d in data[bucket]:
                assert d["blood_group"] == "B+"
                assert d["availability"] == "Available"
                assert d["donation_opt_in"] is True

    def test_notify_same_area(self, session, api_base, admin_token, req_bp):
        r = session.post(f"{api_base}/blood-requests/{req_bp['id']}/notify",
                         json={"scope": "same_area"},
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["notified"] >= 1
        # Request status now Donors Notified
        rget = session.get(f"{api_base}/blood-requests/{req_bp['id']}")
        assert rget.json()["request"]["status"] == "Donors Notified"

    def test_donor_response_updates_status(self, session, api_base, admin_token, req_bp):
        donors = session.get(
            f"{api_base}/blood-requests/{req_bp['id']}/matching-donors",
            headers={"Authorization": f"Bearer {admin_token}"},
        ).json()["same_area"]
        assert donors
        did = donors[0]["id"]
        r = session.post(f"{api_base}/donor-responses", json={
            "request_id": req_bp["id"], "donor_id": did, "response": "I Can Donate",
        })
        assert r.status_code == 200
        rget = session.get(f"{api_base}/blood-requests/{req_bp['id']}")
        assert rget.json()["request"]["status"] == "Donor Found"

    def test_admin_notifications_grouped(self, session, api_base, admin_token, req_bp):
        r = session.get(f"{api_base}/admin/notifications",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        groups = r.json()["groups"]
        g = next((x for x in groups if x["request_id"] == req_bp["id"]), None)
        assert g is not None
        assert g["notified"] >= 1
        assert g["responded"] >= 1
        assert g["can_donate"] >= 1

    def test_admin_update_request_fulfilled(self, session, api_base, admin_token, req_bp):
        r = session.patch(f"{api_base}/admin/blood-requests/{req_bp['id']}/status",
                          json={"status": "Fulfilled"},
                          headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        rget = session.get(f"{api_base}/blood-requests/{req_bp['id']}")
        assert rget.json()["request"]["status"] == "Fulfilled"


# ---------- Donor notifications endpoint ----------
class TestDonorNotifications:
    def test_notifications_for_registered_donor(self, session, api_base, admin_token):
        # Register a fresh donor as B+ in Karaikal so they'll be notified
        mobile = _rand_mobile()
        otp = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile}).json()["dev_otp"]
        tok = session.post(f"{api_base}/auth/verify-otp", json={"mobile": mobile, "otp": otp}).json()["token"]
        reg_payload = {
            "full_name": "TEST_Donor Notif", "gender": "Male", "date_of_birth": "1990-01-01",
            "blood_group": "O-", "email": f"testnotif_{mobile}@example.com", "mobile": mobile,
            "area": "TestNotifArea", "place": "TestNotifArea", "district": "TestNotifArea",
            "state": "TN", "pincode": "600001", "aadhaar": _rand_aadhaar(),
            "availability": "Available", "donation_opt_in": True, "consent": True,
        }
        rr = session.post(f"{api_base}/donors", json=reg_payload, headers={"Authorization": f"Bearer {tok}"})
        assert rr.status_code == 200
        donor_id = rr.json()["donor"]["id"]

        # Create request & notify specifically this donor
        rq = session.post(f"{api_base}/blood-requests", json={
            "patient_name": "TEST_N", "blood_group": "O-", "units_required": 1,
            "hospital_name": "H", "hospital_area": "TestNotifArea",
            "hospital_city": "TestNotifArea", "required_date": "2026-02-20",
            "urgency": "Emergency", "requester_name": "R",
            "requester_mobile": "9000000055", "relationship": "Self",
        }).json()
        session.post(f"{api_base}/blood-requests/{rq['id']}/notify",
                     json={"donor_ids": [donor_id]},
                     headers={"Authorization": f"Bearer {admin_token}"})
        time.sleep(0.5)
        r = session.get(f"{api_base}/notifications", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200
        notifs = r.json()["notifications"]
        assert any(n["request_id"] == rq["id"] for n in notifs)
        found = next(n for n in notifs if n["request_id"] == rq["id"])
        assert found["request"]["blood_group"] == "O-"
