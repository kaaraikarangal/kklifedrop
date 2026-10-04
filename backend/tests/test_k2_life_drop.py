"""K2 Life Drop backend tests — Supabase/Postgres edition.

Fully self-contained: creates its own donors/requests (no reliance on
seeded demo data, which was removed during the Mongo -> Supabase migration).
Covers: OTP auth, donor registration/privacy/filters, blood requests
(numbering + id/request_number regression), admin authz, stats deltas,
aadhaar reveal + audit, matching buckets, notify/donor-response flow,
notifications feeds, suspend exclusion, sensitive-field redaction.
"""
import random
import re
import uuid
from datetime import date

import pytest

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------


def _rand_mobile():
    return "8" + "".join(str(random.randint(0, 9)) for _ in range(9))


def _rand_aadhaar():
    return "".join(str(random.randint(1, 9)) for _ in range(12))


def _uniq(prefix):
    return f"{prefix}{uuid.uuid4().hex[:6]}"


def _otp_login(session, api_base, mobile):
    r = session.post(f"{api_base}/auth/send-otp", json={"mobile": mobile})
    assert r.status_code == 200, r.text
    otp = r.json()["dev_otp"]
    r2 = session.post(f"{api_base}/auth/verify-otp", json={"mobile": mobile, "otp": otp})
    assert r2.status_code == 200, r2.text
    return r2.json()["token"]


def _register_donor(session, api_base, token, mobile, **over):
    payload = {
        "full_name": "TEST_Donor", "gender": "Male", "date_of_birth": "1992-02-02",
        "blood_group": "B+", "email": f"test_{mobile}@example.com", "mobile": mobile,
        "area": "TestArea", "place": "TestPlace", "district": "TestDistrict",
        "state": "Tamil Nadu", "pincode": "600001",
        "aadhaar": _rand_aadhaar(),
        "availability": "Available", "donation_opt_in": True,
        "last_donation_date": None, "consent": True,
    }
    payload.update(over)
    r = session.post(f"{api_base}/donors", json=payload,
                     headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    return r.json()["donor"]


def _mk_request(session, api_base, blood_group="B+", area="TestArea", city="TestCity",
                mobile="9000000011", urgency="Urgent"):
    payload = {
        "patient_name": "TEST_Patient", "blood_group": blood_group, "units_required": 2,
        "hospital_name": "TEST Hospital", "hospital_area": area,
        "hospital_city": city, "required_date": "2026-02-01",
        "urgency": urgency, "requester_name": "TEST Requester",
        "requester_mobile": mobile, "relationship": "Brother",
    }
    r = session.post(f"{api_base}/blood-requests", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


FORBIDDEN = ("_id", "encrypted_aadhaar")


# --------------------------------------------------------------------------
# Meta / root
# --------------------------------------------------------------------------
class TestMeta:
    def test_root(self, session, api_base):
        r = session.get(f"{api_base}/")
        assert r.status_code == 200

    def test_meta(self, session, api_base):
        r = session.get(f"{api_base}/meta")
        assert r.status_code == 200
        data = r.json()
        for k in ("blood_groups", "urgency", "request_statuses"):
            assert k in data and isinstance(data[k], list) and data[k]


# --------------------------------------------------------------------------
# OTP auth (Supabase otps table)
# --------------------------------------------------------------------------
class TestOTP:
    def test_send_otp_returns_dev_otp(self, session, api_base):
        r = session.post(f"{api_base}/auth/send-otp", json={"mobile": _rand_mobile()})
        assert r.status_code == 200
        body = r.json()
        assert body.get("dev_otp") and len(body["dev_otp"]) == 6

    def test_send_otp_invalid_mobile(self, session, api_base):
        r = session.post(f"{api_base}/auth/send-otp", json={"mobile": "123"})
        assert r.status_code == 422

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


# --------------------------------------------------------------------------
# World fixture: self-created donors + request (unique names per run)
# --------------------------------------------------------------------------
@pytest.fixture(scope="session")
def world(session, api_base, admin_token):
    admin_h = {"Authorization": f"Bearer {admin_token}"}
    stats_before = session.get(f"{api_base}/admin/stats", headers=admin_h).json()

    area = _uniq("MatchArea")      # hospital_area for the matching request
    dist = _uniq("MatchDist")      # hospital_city for the matching request
    other_area = _uniq("OtherArea")
    far_area, far_dist = _uniq("FarArea"), _uniq("FarDist")

    donors = {}

    def mk(key, **over):
        mobile = _rand_mobile()
        tok = _otp_login(session, api_base, mobile)
        d = _register_donor(session, api_base, tok, mobile, **over)
        donors[key] = {"donor": d, "token": tok, "mobile": mobile}

    # Eligible B+ donors across the 3 buckets
    mk("same_area", area=area, place=area, district=dist)
    mk("same_dist", area=other_area, place=other_area, district=dist)
    mk("other", area=far_area, place=far_area, district=far_dist)
    # Ineligible B+ donors (same area, must be excluded from matching)
    mk("recent", area=area, place=area, district=dist,
       last_donation_date=date.today().isoformat())
    mk("unavail", area=area, place=area, district=dist, availability="Not Available")
    mk("nooptin", area=area, place=area, district=dist, donation_opt_in=False)
    # Eligible donor that will be suspended later
    mk("suspend", area=area, place=area, district=dist)
    # O+ donor for registration/privacy/patch/aadhaar tests
    known_aadhaar = _rand_aadhaar()
    m_o = _rand_mobile()
    tok_o = _otp_login(session, api_base, m_o)
    d_o = _register_donor(session, api_base, tok_o, m_o, blood_group="O+",
                          area=area, place=area, district=dist,
                          aadhaar=known_aadhaar)
    donors["opos"] = {"donor": d_o, "token": tok_o, "mobile": m_o,
                      "aadhaar": known_aadhaar}

    stats_after = session.get(f"{api_base}/admin/stats", headers=admin_h).json()

    req = _mk_request(session, api_base, blood_group="B+", area=area, city=dist)
    return {
        "donors": donors, "request": req, "area": area, "dist": dist,
        "stats_before": stats_before, "stats_after": stats_after,
        "admin_h": admin_h,
    }


# --------------------------------------------------------------------------
# Donor registration / privacy / filters
# --------------------------------------------------------------------------
class TestDonors:
    def test_register_donor_masked_aadhaar_no_sensitive(self, world):
        d = world["donors"]["opos"]["donor"]
        for f in ("mobile", "email") + FORBIDDEN:
            assert f not in d, f"{f} leaked in register response"
        assert d.get("masked_aadhaar", "").startswith("XXXX XXXX ")
        assert d["masked_aadhaar"].endswith(world["donors"]["opos"]["aadhaar"][-4:])

    def test_duplicate_mobile_409(self, session, api_base, world):
        o = world["donors"]["opos"]
        r = session.post(f"{api_base}/donors", json={
            "full_name": "TEST_dup", "gender": "Male", "date_of_birth": "1992-02-02",
            "blood_group": "O+", "email": "dup@example.com", "mobile": o["mobile"],
            "area": "x", "place": "x", "district": "x", "state": "x",
            "pincode": "600001", "aadhaar": _rand_aadhaar(),
            "availability": "Available", "donation_opt_in": True, "consent": True,
        }, headers={"Authorization": f"Bearer {o['token']}"})
        assert r.status_code == 409, r.text

    def test_register_requires_auth(self, session, api_base):
        r = session.post(f"{api_base}/donors", json={})
        assert r.status_code in (401, 403, 422)

    def test_public_list_hides_sensitive(self, session, api_base, world):
        r = session.get(f"{api_base}/donors")
        assert r.status_code == 200
        donors = r.json()["donors"]
        assert len(donors) >= 8  # our 8 world donors
        for d in donors:
            for f in ("mobile", "email") + FORBIDDEN:
                assert f not in d, f"{f} leaked in public list"
            assert "masked_aadhaar" in d

    def test_empty_list_filter_works(self, session, api_base):
        # unique search string matches nothing -> 200 with empty list
        r = session.get(f"{api_base}/donors", params={"search": _uniq("NoSuchZZZ")})
        assert r.status_code == 200
        assert r.json()["donors"] == [] and r.json()["count"] == 0

    def test_filter_by_blood_group(self, session, api_base, world):
        r = session.get(f"{api_base}/donors", params={"blood_group": "B+"})
        assert r.status_code == 200
        donors = r.json()["donors"]
        ids = {d["id"] for d in donors}
        for k in ("same_area", "same_dist", "other", "recent", "unavail",
                  "nooptin", "suspend"):
            assert world["donors"][k]["donor"]["id"] in ids
        assert all(d["blood_group"] == "B+" for d in donors)

    def test_filter_by_search(self, session, api_base, world):
        r = session.get(f"{api_base}/donors", params={"search": world["area"]})
        assert r.status_code == 200
        donors = r.json()["donors"]
        ids = {d["id"] for d in donors}
        # same-area donors + O+ donor (registered in same area)
        for k in ("same_area", "recent", "unavail", "nooptin", "suspend", "opos"):
            assert world["donors"][k]["donor"]["id"] in ids

    def test_get_donor_by_id_public(self, session, api_base, world):
        did = world["donors"]["same_area"]["donor"]["id"]
        r = session.get(f"{api_base}/donors/{did}")
        assert r.status_code == 200
        d = r.json()["donor"]
        for f in ("mobile", "email") + FORBIDDEN:
            assert f not in d

    def test_me_and_patch_toggles(self, session, api_base, world):
        o = world["donors"]["opos"]
        headers = {"Authorization": f"Bearer {o['token']}"}
        r = session.get(f"{api_base}/donors/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["donor"]["mobile"] == o["mobile"]

        r2 = session.patch(f"{api_base}/donors/me",
                           json={"availability": "Not Available",
                                 "donation_opt_in": False},
                           headers=headers)
        assert r2.status_code == 200
        d = r2.json()["donor"]
        assert d["availability"] == "Not Available"
        assert d["donation_opt_in"] is False

        # toggle back and verify persistence via GET
        session.patch(f"{api_base}/donors/me",
                      json={"availability": "Available", "donation_opt_in": True},
                      headers=headers)
        r3 = session.get(f"{api_base}/donors/me", headers=headers)
        assert r3.json()["donor"]["availability"] == "Available"
        assert r3.json()["donor"]["donation_opt_in"] is True


# --------------------------------------------------------------------------
# Blood requests + id/request_number regression
# --------------------------------------------------------------------------
class TestBloodRequests:
    @pytest.fixture(scope="class")
    def req(self, session, api_base):
        return _mk_request(session, api_base, blood_group="B+",
                           area=_uniq("BRArea"), city=_uniq("BRCity"),
                           mobile="9000000011")

    def test_request_number_format(self, req):
        assert re.match(r"^K2-BR-\d{8}-\d{3}$", req["request_id"]), req
        assert req["status"] == "Pending"
        assert re.match(UUID4 := r"^[0-9a-f-]{36}$", req["id"])

    def test_get_by_request_number_200(self, session, api_base, req):
        # REGRESSION: Postgres uuid cast crash on request_number lookup
        r = session.get(f"{api_base}/blood-requests/{req['request_id']}")
        assert r.status_code == 200, r.text
        assert r.json()["request"]["request_number"] == req["request_id"]

    def test_get_by_uuid_200(self, session, api_base, req):
        r = session.get(f"{api_base}/blood-requests/{req['id']}")
        assert r.status_code == 200
        assert r.json()["request"]["id"] == req["id"]

    def test_get_nonexistent_request_number_404_not_500(self, session, api_base):
        # REGRESSION: must be clean 404, not a uuid-cast 500
        r = session.get(f"{api_base}/blood-requests/K2-BR-20261004-999")
        assert r.status_code == 404, r.text

    def test_get_garbage_ref_404_not_500(self, session, api_base):
        r = session.get(f"{api_base}/blood-requests/not-a-uuid-not-a-number")
        assert r.status_code == 404, r.text

    def test_list_filter_by_mobile(self, session, api_base, req):
        r = session.get(f"{api_base}/blood-requests",
                        params={"mobile": "9000000011"})
        assert r.status_code == 200
        reqs = r.json()["requests"]
        assert reqs
        assert all(x["requester_mobile"] == "9000000011" for x in reqs)
        for x in reqs:
            assert "_id" not in x

    def test_contact_donor(self, session, api_base, world):
        did = world["donors"]["same_area"]["donor"]["id"]
        r = session.post(f"{api_base}/blood-requests/contact-donor", json={
            "donor_id": did, "patient_name": "TEST_CD", "blood_group": "B+",
            "hospital_name": "H1", "hospital_city": "Karaikal",
            "urgency": "Emergency", "requester_name": "RN",
            "requester_mobile": "9000000022",
        })
        assert r.status_code == 200
        assert r.json()["request_id"].startswith("K2-BR-")


# --------------------------------------------------------------------------
# Admin auth + stats + aadhaar reveal
# --------------------------------------------------------------------------
class TestAdmin:
    def test_admin_login_ok(self, admin_token):
        assert admin_token

    def test_admin_login_wrong_password(self, session, api_base):
        r = session.post(f"{api_base}/auth/admin/login", json={
            "email": "admin@k2lifedrop.com", "password": "wrongpass"})
        assert r.status_code == 401

    def test_admin_stats_no_token(self, session, api_base):
        r = session.get(f"{api_base}/admin/stats")
        assert r.status_code in (401, 403)

    def test_admin_stats_user_token_403(self, session, api_base, world):
        tok = world["donors"]["opos"]["token"]
        r = session.get(f"{api_base}/admin/stats",
                        headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 403

    def test_user_endpoint_rejects_admin(self, session, api_base, admin_token):
        r = session.get(f"{api_base}/donors/me",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 403

    def test_admin_stats_deltas_match_inserted(self, world):
        before, after = world["stats_before"], world["stats_after"]
        required = ["total_donors", "available_donors", "total_requests",
                    "pending_requests", "emergency_requests", "fulfilled_requests",
                    "donors_by_blood_group", "donors_by_district",
                    "notifications_sent", "notifications_responded",
                    "response_rate_pct"]
        for k in required:
            assert k in after, f"missing {k}"
        assert after["total_donors"] - before["total_donors"] == 8
        # 7 Available + 1 Not Available ('unavail')
        assert after["available_donors"] - before["available_donors"] == 7
        bg = after["donors_by_blood_group"]
        assert bg.get("B+", 0) - before["donors_by_blood_group"].get("B+", 0) == 7
        assert bg.get("O+", 0) - before["donors_by_blood_group"].get("O+", 0) == 1
        assert any(d["district"] == world["dist"] and d["count"] >= 7
                   for d in after["donors_by_district"])

    def test_admin_donors_list(self, session, api_base, admin_token, world):
        r = session.get(f"{api_base}/admin/donors",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        donors = r.json()["donors"]
        assert len(donors) >= 8
        d = donors[0]
        assert "mobile" in d and "email" in d
        assert d.get("aadhaar_status") == "Stored (Encrypted)"
        for f in FORBIDDEN:
            assert f not in d
        assert "aadhaar" not in d or d.get("aadhaar") is None

    def test_admin_reveal_aadhaar_and_audit(self, session, api_base, admin_token, world):
        o = world["donors"]["opos"]
        did = o["donor"]["id"]
        r = session.get(f"{api_base}/admin/donors/{did}/aadhaar",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        digits = re.sub(r"\D", "", r.json()["aadhaar"])
        assert digits == o["aadhaar"], "decrypted aadhaar mismatch"
        # audit log row written
        logs = session.get(f"{api_base}/admin/audit-logs",
                           headers={"Authorization": f"Bearer {admin_token}"}).json()["logs"]
        assert any(l["action"] == "reveal_aadhaar" and l["target_id"] == did
                   for l in logs)

    def test_reveal_aadhaar_requires_admin(self, session, api_base, world):
        o = world["donors"]["opos"]
        r = session.get(f"{api_base}/admin/donors/{o['donor']['id']}/aadhaar",
                        headers={"Authorization": f"Bearer {o['token']}"})
        assert r.status_code == 403


# --------------------------------------------------------------------------
# Matching / notify / donor-response / notifications flow (ordered)
# --------------------------------------------------------------------------
class TestMatchingNotifyFlow:
    def test_matching_buckets_and_eligibility(self, session, api_base, world):
        req = world["request"]
        r = session.get(f"{api_base}/blood-requests/{req['id']}/matching-donors",
                        headers=world["admin_h"])
        assert r.status_code == 200
        data = r.json()
        for k in ("same_area", "same_district", "other", "counts", "request"):
            assert k in data
        assert data["request"]["blood_group"] == "B+"

        D = world["donors"]
        sa = {d["id"] for d in data["same_area"]}
        sd = {d["id"] for d in data["same_district"]}
        ot = {d["id"] for d in data["other"]}
        # eligible donors land in correct buckets
        assert D["same_area"]["donor"]["id"] in sa
        assert D["suspend"]["donor"]["id"] in sa  # not yet suspended
        assert D["same_dist"]["donor"]["id"] in sd
        assert D["other"]["donor"]["id"] in ot
        # ineligible donors excluded everywhere
        for k in ("recent", "unavail", "nooptin"):
            iid = D[k]["donor"]["id"]
            assert iid not in sa | sd | ot, f"{k} should be ineligible"
        assert data["counts"]["total"] == len(sa) + len(sd) + len(ot)
        # O+ donor not matched to a B+ request
        assert D["opos"]["donor"]["id"] not in sa | sd | ot

    def test_matching_requires_admin(self, session, api_base, world):
        r = session.get(
            f"{api_base}/blood-requests/{world['request']['id']}/matching-donors")
        assert r.status_code in (401, 403)

    def test_notify_creates_unique_rows_and_audit(self, session, api_base, world):
        req = world["request"]
        did = world["donors"]["same_area"]["donor"]["id"]
        h = world["admin_h"]
        r1 = session.post(f"{api_base}/blood-requests/{req['id']}/notify",
                          json={"donor_ids": [did]}, headers=h)
        assert r1.status_code == 200
        assert r1.json()["notified"] == 1
        # duplicate notify -> 0 new rows (unique per request+donor)
        r2 = session.post(f"{api_base}/blood-requests/{req['id']}/notify",
                          json={"donor_ids": [did]}, headers=h)
        assert r2.status_code == 200
        assert r2.json()["notified"] == 0
        # status -> Donors Notified
        rg = session.get(f"{api_base}/blood-requests/{req['id']}")
        assert rg.json()["request"]["status"] == "Donors Notified"
        # audit log written
        logs = session.get(f"{api_base}/admin/audit-logs", headers=h).json()["logs"]
        assert any(l["action"] == "notify_donors" and l["target_id"] == req["id"]
                   for l in logs)

    def test_donor_response_marks_donor_found(self, session, api_base, world):
        req = world["request"]
        did = world["donors"]["same_area"]["donor"]["id"]
        r = session.post(f"{api_base}/donor-responses", json={
            "request_id": req["id"], "donor_id": did, "response": "I Can Donate"})
        assert r.status_code == 200
        rg = session.get(f"{api_base}/blood-requests/{req['id']}")
        assert rg.json()["request"]["status"] == "Donor Found"

    def test_donor_notifications_feed(self, session, api_base, world):
        req = world["request"]
        d = world["donors"]["same_area"]
        r = session.get(f"{api_base}/notifications",
                        headers={"Authorization": f"Bearer {d['token']}"})
        assert r.status_code == 200
        notifs = r.json()["notifications"]
        found = next((n for n in notifs if n["request_id"] == req["id"]), None)
        assert found is not None, "notification not in donor feed"
        assert found["response"] == "I Can Donate"
        assert found["request"]["blood_group"] == "B+"
        assert found["request"]["request_number"] == req["request_id"]
        for f in FORBIDDEN:
            assert f not in found

    def test_notifications_require_auth(self, session, api_base):
        r = session.get(f"{api_base}/notifications")
        assert r.status_code in (401, 403)

    def test_admin_notifications_grouped(self, session, api_base, world):
        req = world["request"]
        r = session.get(f"{api_base}/admin/notifications",
                        headers=world["admin_h"])
        assert r.status_code == 200
        g = next((x for x in r.json()["groups"]
                  if x["request_id"] == req["id"]), None)
        assert g is not None
        assert g["notified"] >= 1 and g["responded"] >= 1 and g["can_donate"] >= 1
        assert g["request_number"] == req["request_id"]

    def test_admin_patch_status_by_uuid(self, session, api_base, world):
        req = world["request"]
        r = session.patch(
            f"{api_base}/admin/blood-requests/{req['id']}/status",
            json={"status": "Fulfilled"}, headers=world["admin_h"])
        assert r.status_code == 200
        rg = session.get(f"{api_base}/blood-requests/{req['id']}")
        assert rg.json()["request"]["status"] == "Fulfilled"

    def test_admin_patch_status_by_request_number(self, session, api_base, world):
        req = world["request"]
        r = session.patch(
            f"{api_base}/admin/blood-requests/{req['request_id']}/status",
            json={"status": "Pending"}, headers=world["admin_h"])
        assert r.status_code == 200, r.text
        rg = session.get(f"{api_base}/blood-requests/{req['request_id']}")
        assert rg.json()["request"]["status"] == "Pending"

    def test_admin_suspend_donor_excluded_from_matching(self, session, api_base, world):
        req = world["request"]
        did = world["donors"]["suspend"]["donor"]["id"]
        h = world["admin_h"]
        r = session.patch(f"{api_base}/admin/donors/{did}",
                          json={"status": "suspended"}, headers=h)
        assert r.status_code == 200, r.text
        # excluded from matching
        m = session.get(f"{api_base}/blood-requests/{req['id']}/matching-donors",
                        headers=h).json()
        matched = ({d["id"] for d in m["same_area"]}
                   | {d["id"] for d in m["same_district"]}
                   | {d["id"] for d in m["other"]})
        assert did not in matched
        # excluded from public active list
        pub = session.get(f"{api_base}/donors", params={"blood_group": "B+"}).json()
        assert did not in {d["id"] for d in pub["donors"]}
        # restore for cleanliness
        session.patch(f"{api_base}/admin/donors/{did}",
                      json={"status": "active"}, headers=h)
