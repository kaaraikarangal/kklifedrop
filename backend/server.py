"""
K2 Life Drop - Blood Donation Platform Backend
FastAPI + MongoDB (Motor). Clean provider interfaces for SMS / Email / Push
so real providers (MSG91, Twilio, Resend, FCM) can be dropped in via .env.
"""
from __future__ import annotations

import base64
import logging
import os
import random
import re
import secrets
import string
import uuid
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from typing import List, Optional, Literal

import bcrypt
import jwt
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator
from starlette.middleware.cors import CORSMiddleware

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
JWT_EXP_HOURS = int(os.environ.get("JWT_EXP_HOURS", "24"))
OTP_LENGTH = int(os.environ.get("OTP_LENGTH", "6"))
OTP_EXP_MINUTES = int(os.environ.get("OTP_EXP_MINUTES", "5"))
OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
DONATION_MIN_INTERVAL_DAYS = int(os.environ.get("DONATION_MIN_INTERVAL_DAYS", "90"))

AADHAAR_KEY = os.environ.get("AADHAAR_FERNET_KEY", "").encode()
try:
    fernet = Fernet(AADHAAR_KEY)
except Exception:
    # Fallback - generate ephemeral key (dev only); logs clearly.
    AADHAAR_KEY = Fernet.generate_key()
    fernet = Fernet(AADHAAR_KEY)

SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "mock").lower()
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "mock").lower()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("k2-life-drop")

app = FastAPI(title="K2 Life Drop API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
URGENCY = ["Normal", "Urgent", "Emergency"]
REQUEST_STATUSES = [
    "Pending", "Admin Reviewing", "Donors Notified", "Donor Found",
    "Partially Fulfilled", "Fulfilled", "Cancelled", "Expired",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def gen_id() -> str:
    return str(uuid.uuid4())


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def mask_aadhaar(aadhaar: str) -> str:
    digits = re.sub(r"\D", "", aadhaar)
    if len(digits) < 4:
        return "XXXX XXXX XXXX"
    last4 = digits[-4:]
    return f"XXXX XXXX {last4}"


def encrypt_aadhaar(aadhaar: str) -> str:
    digits = re.sub(r"\D", "", aadhaar)
    return fernet.encrypt(digits.encode()).decode()


def decrypt_aadhaar(token: str) -> str:
    return fernet.decrypt(token.encode()).decode()


def make_token(subject: str, role: str) -> str:
    payload = {
        "sub": subject,
        "role": role,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(hours=JWT_EXP_HOURS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])


async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(401, "Not authenticated")
    try:
        data = decode_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired")
    except Exception:
        raise HTTPException(401, "Invalid token")
    return data


async def current_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin privileges required")
    return user


# ---------------------------------------------------------------------------
# Provider abstractions - replace mock with real providers via env
# ---------------------------------------------------------------------------
async def send_sms(mobile: str, message: str) -> dict:
    if SMS_PROVIDER == "mock":
        logger.info(f"[MOCK-SMS] to {mobile}: {message}")
        return {"status": "sent", "provider": "mock"}
    # TODO: implement msg91 / twilio / textlocal using env creds
    logger.warning(f"[SMS] provider {SMS_PROVIDER} not implemented, falling back to log")
    return {"status": "pending", "provider": SMS_PROVIDER}


async def send_email(email: str, subject: str, message: str) -> dict:
    if EMAIL_PROVIDER == "mock":
        logger.info(f"[MOCK-EMAIL] to {email} | {subject}: {message}")
        return {"status": "sent", "provider": "mock"}
    return {"status": "pending", "provider": EMAIL_PROVIDER}


async def send_push(token: str, title: str, body: str) -> dict:
    logger.info(f"[MOCK-PUSH] {title}: {body}")
    return {"status": "sent", "provider": "mock"}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class SendOtpIn(BaseModel):
    mobile: str

    @field_validator("mobile")
    @classmethod
    def valid_mobile(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10:
            raise ValueError("Invalid mobile number")
        return digits[-10:]


class VerifyOtpIn(BaseModel):
    mobile: str
    otp: str

    @field_validator("mobile")
    @classmethod
    def _m(cls, v: str) -> str:
        return re.sub(r"\D", "", v)[-10:]


class DonorRegistrationIn(BaseModel):
    full_name: str
    gender: Literal["Male", "Female", "Other"]
    date_of_birth: str  # YYYY-MM-DD
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    email: EmailStr
    mobile: str
    area: str
    place: str
    district: str
    state: str
    pincode: str
    aadhaar: str
    availability: Literal["Available", "Not Available"]
    donation_opt_in: bool
    last_donation_date: Optional[str] = None  # YYYY-MM-DD
    consent: bool

    @field_validator("aadhaar")
    @classmethod
    def valid_aadhaar(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 12:
            raise ValueError("Aadhaar must be 12 digits")
        return digits

    @field_validator("mobile")
    @classmethod
    def _m(cls, v: str) -> str:
        return re.sub(r"\D", "", v)[-10:]


class DonorUpdateIn(BaseModel):
    availability: Optional[Literal["Available", "Not Available"]] = None
    donation_opt_in: Optional[bool] = None
    last_donation_date: Optional[str] = None
    area: Optional[str] = None
    place: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class BloodRequestIn(BaseModel):
    patient_name: str
    blood_group: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    units_required: int = Field(ge=1, le=20)
    hospital_name: str
    hospital_area: str
    hospital_city: str
    required_date: str
    required_time: Optional[str] = None
    urgency: Literal["Normal", "Urgent", "Emergency"]
    requester_name: str
    requester_mobile: str
    requester_email: Optional[EmailStr] = None
    relationship: str
    additional_message: Optional[str] = None
    hospital_contact: Optional[str] = None

    @field_validator("requester_mobile")
    @classmethod
    def _m(cls, v: str) -> str:
        return re.sub(r"\D", "", v)[-10:]


class ContactDonorIn(BaseModel):
    donor_id: str
    patient_name: str
    blood_group: str
    hospital_name: str
    hospital_city: str
    urgency: str = "Normal"
    requester_name: str
    requester_mobile: str
    additional_message: Optional[str] = None


class NotifyIn(BaseModel):
    donor_ids: Optional[List[str]] = None  # None = notify all matched
    scope: Literal["same_area", "same_district", "all"] = "all"


class DonorResponseIn(BaseModel):
    request_id: str
    donor_id: str
    response: Literal["I Can Donate", "Not Available"]


class UpdateRequestStatusIn(BaseModel):
    status: Literal[
        "Pending", "Admin Reviewing", "Donors Notified", "Donor Found",
        "Partially Fulfilled", "Fulfilled", "Cancelled", "Expired",
    ]


class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


# ---------------------------------------------------------------------------
# Projection helpers (always exclude _id and sensitive fields)
# ---------------------------------------------------------------------------
DONOR_PUBLIC_FIELDS = {
    "_id": 0, "encrypted_aadhaar": 0, "mobile": 0, "email": 0, "pincode": 0,
}
DONOR_ADMIN_FIELDS = {"_id": 0, "encrypted_aadhaar": 0}


def to_public_donor(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "full_name": doc["full_name"],
        "blood_group": doc["blood_group"],
        "area": doc["area"],
        "place": doc["place"],
        "district": doc["district"],
        "state": doc.get("state"),
        "gender": doc.get("gender"),
        "availability": doc["availability"],
        "donation_opt_in": doc.get("donation_opt_in", False),
        "last_donation_date": doc.get("last_donation_date"),
        "masked_aadhaar": doc.get("masked_aadhaar"),
        "created_at": iso(doc.get("created_at")) if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


def to_admin_donor(doc: dict) -> dict:
    out = to_public_donor(doc)
    out.update({
        "mobile": doc.get("mobile"),
        "email": doc.get("email"),
        "pincode": doc.get("pincode"),
        "date_of_birth": doc.get("date_of_birth"),
        "aadhaar_status": "Stored (Encrypted)" if doc.get("encrypted_aadhaar") else "Missing",
        "status": doc.get("status", "active"),
    })
    return out


# ---------------------------------------------------------------------------
# Startup: seed admin + demo data + indexes
# ---------------------------------------------------------------------------
async def seed():
    # Indexes
    await db.donors.create_index("mobile", unique=True)
    await db.donors.create_index("blood_group")
    await db.donors.create_index([("area", 1), ("district", 1)])
    await db.blood_requests.create_index("request_number", unique=True)
    await db.otps.create_index("mobile")
    await db.notifications.create_index([("request_id", 1), ("donor_id", 1)])

    # Admin seed
    admin_email = os.environ.get("ADMIN_SEED_EMAIL", "admin@k2lifedrop.com").lower()
    admin_pw = os.environ.get("ADMIN_SEED_PASSWORD", "Admin@123")
    existing = await db.admins.find_one({"email": admin_email})
    if not existing:
        await db.admins.insert_one({
            "id": gen_id(),
            "email": admin_email,
            "password_hash": hash_pw(admin_pw),
            "name": "K2 Admin",
            "status": "active",
            "created_at": now_utc(),
        })
        logger.info(f"Seeded default admin {admin_email}")

    # Demo donors
    if await db.donors.count_documents({}) == 0:
        demo = [
            ("Arun Kumar", "Male", "1990-05-10", "B+", "arun@example.com", "9876501001", "Karaikal", "Karaikal", "Karaikal", "Puducherry", "609602", "123412341234", "Available", True, "2025-08-15"),
            ("Vijay Raj", "Male", "1988-02-14", "B+", "vijay@example.com", "9876501002", "Karaikal", "Karaikal", "Karaikal", "Puducherry", "609602", "223412341234", "Available", True, "2025-07-01"),
            ("Suresh Babu", "Male", "1992-10-02", "B+", "suresh@example.com", "9876501003", "Thirunallar", "Nagapattinam", "Nagapattinam", "Tamil Nadu", "611106", "323412341234", "Available", True, None),
            ("Priya Lakshmi", "Female", "1995-07-20", "O+", "priya@example.com", "9876501004", "Chennai", "Chennai", "Chennai", "Tamil Nadu", "600001", "423412341234", "Available", True, "2025-06-10"),
            ("Deepak Shah", "Male", "1991-01-11", "A+", "deepak@example.com", "9876501005", "Mumbai", "Mumbai", "Mumbai", "Maharashtra", "400001", "523412341234", "Available", True, None),
            ("Anita Verma", "Female", "1993-03-25", "AB+", "anita@example.com", "9876501006", "Delhi", "Delhi", "New Delhi", "Delhi", "110001", "623412341234", "Not Available", False, "2026-01-05"),
            ("Ravi Sharma", "Male", "1987-11-30", "O-", "ravi@example.com", "9876501007", "Bangalore", "Bangalore", "Bangalore", "Karnataka", "560001", "723412341234", "Available", True, None),
            ("Meena K", "Female", "1996-09-18", "B-", "meena@example.com", "9876501008", "Karaikal", "Karaikal", "Karaikal", "Puducherry", "609602", "823412341234", "Available", True, None),
        ]
        docs = []
        for d in demo:
            (name, g, dob, bg, em, mo, area, place, dist, state, pin, aad, avail, opt, last) = d
            docs.append({
                "id": gen_id(),
                "full_name": name, "gender": g, "date_of_birth": dob,
                "blood_group": bg, "email": em, "mobile": mo,
                "area": area, "place": place, "district": dist, "state": state, "pincode": pin,
                "encrypted_aadhaar": encrypt_aadhaar(aad),
                "masked_aadhaar": mask_aadhaar(aad),
                "availability": avail, "donation_opt_in": opt,
                "last_donation_date": last,
                "status": "active", "is_demo": True,
                "created_at": now_utc(), "updated_at": now_utc(),
            })
        await db.donors.insert_many(docs)
        logger.info(f"Seeded {len(docs)} demo donors")


@app.on_event("startup")
async def on_start():
    await seed()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------------------------------------------------------------------------
# AUTH endpoints (OTP + Admin)
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"name": "K2 Life Drop", "tagline": "Every Drop Can Save a Life"}


@api.post("/auth/send-otp")
async def send_otp(body: SendOtpIn):
    # Rate limit: max 3 OTPs per 10 minutes
    recent = await db.otps.count_documents({
        "mobile": body.mobile,
        "created_at": {"$gt": now_utc() - timedelta(minutes=10)},
    })
    if recent >= 3:
        raise HTTPException(429, "Too many OTP requests. Try again later.")

    otp = "".join(random.choices(string.digits, k=OTP_LENGTH))
    await db.otps.insert_one({
        "id": gen_id(),
        "mobile": body.mobile,
        "otp_hash": hash_pw(otp),
        "attempts": 0,
        "verified": False,
        "expires_at": now_utc() + timedelta(minutes=OTP_EXP_MINUTES),
        "created_at": now_utc(),
    })
    await send_sms(body.mobile, f"Your K2 Life Drop OTP is {otp}. Valid {OTP_EXP_MINUTES} minutes.")
    # In mock mode, return otp so dev UI can show it. Never in prod.
    resp = {"ok": True, "mobile": body.mobile, "expires_in_minutes": OTP_EXP_MINUTES}
    if SMS_PROVIDER == "mock":
        resp["dev_otp"] = otp
    return resp


@api.post("/auth/verify-otp")
async def verify_otp(body: VerifyOtpIn):
    rec = await db.otps.find_one(
        {"mobile": body.mobile, "verified": False},
        sort=[("created_at", -1)],
    )
    if not rec:
        raise HTTPException(400, "No OTP found. Request a new one.")
    exp = rec["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now_utc():
        raise HTTPException(400, "OTP expired. Request a new one.")
    if rec["attempts"] >= OTP_MAX_ATTEMPTS:
        raise HTTPException(429, "Too many attempts. Request a new OTP.")

    await db.otps.update_one({"id": rec["id"]}, {"$inc": {"attempts": 1}})
    if not verify_pw(body.otp, rec["otp_hash"]):
        raise HTTPException(400, "Invalid OTP")
    await db.otps.update_one({"id": rec["id"]}, {"$set": {"verified": True}})

    donor = await db.donors.find_one({"mobile": body.mobile}, {"_id": 0})
    is_registered = donor is not None
    token = make_token(body.mobile, "user")
    return {
        "ok": True,
        "token": token,
        "mobile": body.mobile,
        "is_registered": is_registered,
        "donor": to_public_donor(donor) if donor else None,
    }


@api.post("/auth/admin/login")
async def admin_login(body: AdminLoginIn):
    admin = await db.admins.find_one({"email": body.email.lower()})
    if not admin or not verify_pw(body.password, admin["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    if admin.get("status") != "active":
        raise HTTPException(403, "Admin account disabled")
    token = make_token(admin["email"], "admin")
    return {"ok": True, "token": token, "admin": {"email": admin["email"], "name": admin.get("name")}}


# ---------------------------------------------------------------------------
# DONOR endpoints
# ---------------------------------------------------------------------------
@api.post("/donors")
async def register_donor(body: DonorRegistrationIn, user: dict = Depends(current_user)):
    if user["sub"] != body.mobile:
        raise HTTPException(403, "Mobile does not match verified session")
    if not body.consent:
        raise HTTPException(400, "Consent is required")

    existing = await db.donors.find_one({"mobile": body.mobile})
    if existing:
        raise HTTPException(409, "A donor with this mobile already exists")

    doc = {
        "id": gen_id(),
        "full_name": body.full_name,
        "gender": body.gender,
        "date_of_birth": body.date_of_birth,
        "blood_group": body.blood_group,
        "email": body.email,
        "mobile": body.mobile,
        "area": body.area,
        "place": body.place,
        "district": body.district,
        "state": body.state,
        "pincode": body.pincode,
        "encrypted_aadhaar": encrypt_aadhaar(body.aadhaar),
        "masked_aadhaar": mask_aadhaar(body.aadhaar),
        "availability": body.availability,
        "donation_opt_in": body.donation_opt_in,
        "last_donation_date": body.last_donation_date,
        "status": "active",
        "is_demo": False,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.donors.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "donor": to_public_donor(doc)}


@api.get("/donors")
async def list_donors(
    blood_group: Optional[str] = None,
    area: Optional[str] = None,
    district: Optional[str] = None,
    availability: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
):
    q: dict = {"status": "active"}
    if blood_group:
        q["blood_group"] = blood_group
    if area:
        q["area"] = {"$regex": area, "$options": "i"}
    if district:
        q["district"] = {"$regex": district, "$options": "i"}
    if availability:
        q["availability"] = availability
    if search:
        q["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"place": {"$regex": search, "$options": "i"}},
            {"area": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.donors.find(q, {"_id": 0}).limit(limit).to_list(limit)
    return {"donors": [to_public_donor(d) for d in docs], "count": len(docs)}


@api.get("/donors/me")
async def my_profile(user: dict = Depends(current_user)):
    if user["role"] != "user":
        raise HTTPException(403, "User only")
    doc = await db.donors.find_one({"mobile": user["sub"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not registered")
    # Owner can see own private fields
    out = to_public_donor(doc)
    out.update({"mobile": doc.get("mobile"), "email": doc.get("email")})
    return {"donor": out}


@api.get("/donors/{donor_id}")
async def get_donor(donor_id: str):
    doc = await db.donors.find_one({"id": donor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Donor not found")
    return {"donor": to_public_donor(doc)}


@api.patch("/donors/me")
async def update_me(body: DonorUpdateIn, user: dict = Depends(current_user)):
    doc = await db.donors.find_one({"mobile": user["sub"]})
    if not doc:
        raise HTTPException(404, "Not registered")
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    updates["updated_at"] = now_utc()
    await db.donors.update_one({"mobile": user["sub"]}, {"$set": updates})
    new = await db.donors.find_one({"mobile": user["sub"]}, {"_id": 0})
    out = to_public_donor(new)
    out.update({"mobile": new.get("mobile"), "email": new.get("email")})
    return {"ok": True, "donor": out}


# ---------------------------------------------------------------------------
# BLOOD REQUEST endpoints
# ---------------------------------------------------------------------------
async def gen_request_number() -> str:
    today = now_utc().strftime("%Y%m%d")
    count = await db.blood_requests.count_documents({
        "request_number": {"$regex": f"^K2-BR-{today}-"},
    })
    return f"K2-BR-{today}-{count + 1:03d}"


@api.post("/blood-requests")
async def create_blood_request(body: BloodRequestIn):
    req_num = await gen_request_number()
    doc = {
        "id": gen_id(),
        "request_number": req_num,
        "patient_name": body.patient_name,
        "blood_group": body.blood_group,
        "units_required": body.units_required,
        "hospital_name": body.hospital_name,
        "hospital_area": body.hospital_area,
        "hospital_city": body.hospital_city,
        "required_date": body.required_date,
        "required_time": body.required_time,
        "urgency": body.urgency,
        "requester_name": body.requester_name,
        "requester_mobile": body.requester_mobile,
        "requester_email": body.requester_email,
        "relationship": body.relationship,
        "additional_message": body.additional_message,
        "hospital_contact": body.hospital_contact,
        "status": "Pending",
        "donor_id_contacted": None,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.blood_requests.insert_one(doc)
    return {"ok": True, "request_id": req_num, "id": doc["id"], "status": "Pending"}


@api.post("/blood-requests/contact-donor")
async def contact_donor(body: ContactDonorIn):
    donor = await db.donors.find_one({"id": body.donor_id}, {"_id": 0})
    if not donor:
        raise HTTPException(404, "Donor not found")
    req_num = await gen_request_number()
    doc = {
        "id": gen_id(),
        "request_number": req_num,
        "patient_name": body.patient_name,
        "blood_group": body.blood_group,
        "units_required": 1,
        "hospital_name": body.hospital_name,
        "hospital_area": donor["area"],
        "hospital_city": body.hospital_city,
        "required_date": now_utc().date().isoformat(),
        "required_time": None,
        "urgency": body.urgency,
        "requester_name": body.requester_name,
        "requester_mobile": re.sub(r"\D", "", body.requester_mobile)[-10:],
        "requester_email": None,
        "relationship": "Self",
        "additional_message": body.additional_message,
        "hospital_contact": None,
        "status": "Admin Reviewing",
        "donor_id_contacted": body.donor_id,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.blood_requests.insert_one(doc)
    return {"ok": True, "request_id": req_num, "message": "Your request has been submitted. K2 Life Drop admin will contact you shortly."}


@api.get("/blood-requests")
async def list_blood_requests(
    status: Optional[str] = None,
    blood_group: Optional[str] = None,
    urgency: Optional[str] = None,
    mobile: Optional[str] = None,
    limit: int = 200,
):
    q: dict = {}
    if status:
        q["status"] = status
    if blood_group:
        q["blood_group"] = blood_group
    if urgency:
        q["urgency"] = urgency
    if mobile:
        q["requester_mobile"] = re.sub(r"\D", "", mobile)[-10:]
    docs = await db.blood_requests.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for d in docs:
        d["created_at"] = iso(d["created_at"]) if isinstance(d.get("created_at"), datetime) else d.get("created_at")
        d["updated_at"] = iso(d["updated_at"]) if isinstance(d.get("updated_at"), datetime) else d.get("updated_at")
    return {"requests": docs, "count": len(docs)}


@api.get("/blood-requests/{req_id}")
async def get_request(req_id: str):
    doc = await db.blood_requests.find_one(
        {"$or": [{"id": req_id}, {"request_number": req_id}]},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(404, "Request not found")
    doc["created_at"] = iso(doc["created_at"]) if isinstance(doc.get("created_at"), datetime) else doc.get("created_at")
    doc["updated_at"] = iso(doc["updated_at"]) if isinstance(doc.get("updated_at"), datetime) else doc.get("updated_at")
    return {"request": doc}


# ---------------------------------------------------------------------------
# Matching + Notification (admin only)
# ---------------------------------------------------------------------------
def is_eligible(donor: dict) -> bool:
    if donor.get("status") != "active":
        return False
    if donor.get("availability") != "Available":
        return False
    if not donor.get("donation_opt_in"):
        return False
    last = donor.get("last_donation_date")
    if last:
        try:
            d = date.fromisoformat(last)
            if (date.today() - d).days < DONATION_MIN_INTERVAL_DAYS:
                return False
        except Exception:
            pass
    return True


@api.get("/blood-requests/{req_id}/matching-donors")
async def matching_donors(req_id: str, admin: dict = Depends(current_admin)):
    req = await db.blood_requests.find_one(
        {"$or": [{"id": req_id}, {"request_number": req_id}]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(404, "Request not found")

    all_bg = await db.donors.find(
        {"blood_group": req["blood_group"]}, {"_id": 0, "encrypted_aadhaar": 0}
    ).to_list(1000)
    eligible = [d for d in all_bg if is_eligible(d)]

    area = (req.get("hospital_area") or "").lower()
    district = (req.get("hospital_city") or "").lower()

    same_area, same_district, other = [], [], []
    for d in eligible:
        da = (d.get("area") or "").lower()
        dd = (d.get("district") or "").lower()
        if area and da == area:
            same_area.append(d)
        elif district and (dd == district or (d.get("place") or "").lower() == district):
            same_district.append(d)
        else:
            other.append(d)

    def pack(donors):
        return [to_admin_donor(d) for d in donors]

    return {
        "request": {
            "id": req["id"],
            "request_number": req["request_number"],
            "blood_group": req["blood_group"],
            "hospital_area": req.get("hospital_area"),
            "hospital_city": req.get("hospital_city"),
            "urgency": req["urgency"],
            "units_required": req["units_required"],
        },
        "counts": {
            "total": len(eligible),
            "same_area": len(same_area),
            "same_district": len(same_district),
            "other": len(other),
        },
        "same_area": pack(same_area),
        "same_district": pack(same_district),
        "other": pack(other),
    }


@api.post("/blood-requests/{req_id}/notify")
async def notify_donors(req_id: str, body: NotifyIn, admin: dict = Depends(current_admin)):
    req = await db.blood_requests.find_one(
        {"$or": [{"id": req_id}, {"request_number": req_id}]}, {"_id": 0}
    )
    if not req:
        raise HTTPException(404, "Request not found")

    # Determine target donors
    if body.donor_ids:
        donors = await db.donors.find({"id": {"$in": body.donor_ids}}, {"_id": 0}).to_list(1000)
    else:
        all_bg = await db.donors.find({"blood_group": req["blood_group"]}, {"_id": 0}).to_list(1000)
        eligible = [d for d in all_bg if is_eligible(d)]
        if body.scope == "same_area":
            donors = [d for d in eligible if (d.get("area") or "").lower() == (req.get("hospital_area") or "").lower()]
        elif body.scope == "same_district":
            donors = [d for d in eligible if (d.get("district") or "").lower() == (req.get("hospital_city") or "").lower()]
        else:
            donors = eligible

    msg = (
        f"K2 Life Drop: Emergency Blood Requirement. Group {req['blood_group']}, "
        f"Hospital {req['hospital_name']}, Location {req.get('hospital_area') or req.get('hospital_city')}, "
        f"Units {req['units_required']}, Urgency {req['urgency']}. Please respond in the app if available."
    )

    notified = 0
    for d in donors:
        # avoid duplicate notification for same request+donor
        existing = await db.notifications.find_one({"request_id": req["id"], "donor_id": d["id"]})
        if existing:
            continue
        await db.notifications.insert_one({
            "id": gen_id(),
            "request_id": req["id"],
            "donor_id": d["id"],
            "donor_mobile": d.get("mobile"),
            "notification_type": "blood_request",
            "message": msg,
            "status": "sent",
            "sent_at": now_utc(),
            "responded_at": None,
            "response": None,
        })
        await send_sms(d.get("mobile", ""), msg)
        notified += 1

    # Update request status
    await db.blood_requests.update_one(
        {"id": req["id"]},
        {"$set": {"status": "Donors Notified", "updated_at": now_utc()}},
    )

    # Audit log
    await db.audit_logs.insert_one({
        "id": gen_id(),
        "admin_id": admin.get("sub"),
        "action": "notify_donors",
        "target_type": "blood_request",
        "target_id": req["id"],
        "timestamp": now_utc(),
        "metadata": {"notified_count": notified, "scope": body.scope},
    })

    return {"ok": True, "notified": notified, "request_id": req["request_number"]}


@api.post("/donor-responses")
async def donor_response(body: DonorResponseIn):
    notif = await db.notifications.find_one({
        "request_id": body.request_id,
        "donor_id": body.donor_id,
    })
    if not notif:
        # Allow direct response via explicit record creation
        pass
    await db.donor_responses.insert_one({
        "id": gen_id(),
        "request_id": body.request_id,
        "donor_id": body.donor_id,
        "response": body.response,
        "responded_at": now_utc(),
    })
    if notif:
        await db.notifications.update_one(
            {"id": notif["id"]},
            {"$set": {"response": body.response, "responded_at": now_utc()}},
        )
    if body.response == "I Can Donate":
        await db.blood_requests.update_one(
            {"id": body.request_id},
            {"$set": {"status": "Donor Found", "updated_at": now_utc()}},
        )
    return {"ok": True, "response": body.response}


@api.get("/notifications")
async def notifications_for_me(user: dict = Depends(current_user)):
    donor = await db.donors.find_one({"mobile": user["sub"]}, {"_id": 0, "id": 1})
    if not donor:
        return {"notifications": []}
    docs = await db.notifications.find(
        {"donor_id": donor["id"]}, {"_id": 0}
    ).sort("sent_at", -1).limit(100).to_list(100)
    out = []
    for n in docs:
        req = await db.blood_requests.find_one({"id": n["request_id"]}, {"_id": 0}) or {}
        out.append({
            "id": n["id"],
            "request_id": n["request_id"],
            "message": n["message"],
            "status": n["status"],
            "sent_at": iso(n["sent_at"]),
            "response": n.get("response"),
            "responded_at": iso(n.get("responded_at")) if n.get("responded_at") else None,
            "request": {
                "request_number": req.get("request_number"),
                "blood_group": req.get("blood_group"),
                "hospital_name": req.get("hospital_name"),
                "hospital_area": req.get("hospital_area"),
                "hospital_city": req.get("hospital_city"),
                "units_required": req.get("units_required"),
                "urgency": req.get("urgency"),
                "status": req.get("status"),
            } if req else None,
        })
    return {"notifications": out}


@api.get("/admin/notifications")
async def admin_notifications(admin: dict = Depends(current_admin)):
    docs = await db.notifications.find({}, {"_id": 0}).sort("sent_at", -1).limit(500).to_list(500)
    # group by request
    groups: dict = {}
    for n in docs:
        g = groups.setdefault(n["request_id"], {"request_id": n["request_id"], "notified": 0, "responded": 0, "can_donate": 0, "last_sent": None})
        g["notified"] += 1
        if n.get("response"):
            g["responded"] += 1
            if n["response"] == "I Can Donate":
                g["can_donate"] += 1
        if not g["last_sent"] or n["sent_at"] > g["last_sent"]:
            g["last_sent"] = n["sent_at"]
    # enrich with request details
    out = []
    for rid, g in groups.items():
        req = await db.blood_requests.find_one({"id": rid}, {"_id": 0}) or {}
        out.append({
            "request_id": rid,
            "request_number": req.get("request_number"),
            "blood_group": req.get("blood_group"),
            "urgency": req.get("urgency"),
            "notified": g["notified"],
            "responded": g["responded"],
            "can_donate": g["can_donate"],
            "last_sent": iso(g["last_sent"]) if g["last_sent"] else None,
            "status": req.get("status"),
        })
    out.sort(key=lambda x: x.get("last_sent") or "", reverse=True)
    return {"groups": out}


# ---------------------------------------------------------------------------
# ADMIN endpoints
# ---------------------------------------------------------------------------
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(current_admin)):
    total_donors = await db.donors.count_documents({"status": "active"})
    available = await db.donors.count_documents({"status": "active", "availability": "Available"})
    pipeline = [
        {"$group": {"_id": "$blood_group", "count": {"$sum": 1}}},
    ]
    by_bg = {d["_id"]: d["count"] async for d in db.donors.aggregate(pipeline)}

    pipeline_dist = [
        {"$group": {"_id": "$district", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    by_district = [{"district": d["_id"], "count": d["count"]} async for d in db.donors.aggregate(pipeline_dist)]

    total_requests = await db.blood_requests.count_documents({})
    pending = await db.blood_requests.count_documents({"status": "Pending"})
    emergency = await db.blood_requests.count_documents({"urgency": "Emergency", "status": {"$nin": ["Fulfilled", "Cancelled", "Expired"]}})
    fulfilled = await db.blood_requests.count_documents({"status": "Fulfilled"})

    sent = await db.notifications.count_documents({})
    responded = await db.notifications.count_documents({"response": {"$ne": None}})
    rate = (responded / sent * 100) if sent else 0.0

    return {
        "total_donors": total_donors,
        "available_donors": available,
        "total_requests": total_requests,
        "pending_requests": pending,
        "emergency_requests": emergency,
        "fulfilled_requests": fulfilled,
        "donors_by_blood_group": by_bg,
        "donors_by_district": by_district,
        "notifications_sent": sent,
        "notifications_responded": responded,
        "response_rate_pct": round(rate, 1),
    }


@api.get("/admin/donors")
async def admin_list_donors(
    search: Optional[str] = None,
    blood_group: Optional[str] = None,
    availability: Optional[str] = None,
    district: Optional[str] = None,
    status_f: Optional[str] = None,
    limit: int = 500,
    admin: dict = Depends(current_admin),
):
    q: dict = {}
    if blood_group:
        q["blood_group"] = blood_group
    if availability:
        q["availability"] = availability
    if district:
        q["district"] = {"$regex": district, "$options": "i"}
    if status_f:
        q["status"] = status_f
    if search:
        q["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"mobile": {"$regex": search}},
            {"area": {"$regex": search, "$options": "i"}},
            {"place": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.donors.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"donors": [to_admin_donor(d) for d in docs], "count": len(docs)}


@api.get("/admin/donors/{donor_id}")
async def admin_get_donor(donor_id: str, admin: dict = Depends(current_admin)):
    doc = await db.donors.find_one({"id": donor_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Donor not found")
    return {"donor": to_admin_donor(doc)}


@api.get("/admin/donors/{donor_id}/aadhaar")
async def admin_reveal_aadhaar(donor_id: str, admin: dict = Depends(current_admin)):
    doc = await db.donors.find_one({"id": donor_id})
    if not doc:
        raise HTTPException(404, "Donor not found")
    try:
        plain = decrypt_aadhaar(doc["encrypted_aadhaar"])
    except Exception:
        raise HTTPException(500, "Unable to decrypt")
    # Audit (no raw aadhaar in metadata)
    await db.audit_logs.insert_one({
        "id": gen_id(),
        "admin_id": admin.get("sub"),
        "action": "reveal_aadhaar",
        "target_type": "donor",
        "target_id": donor_id,
        "timestamp": now_utc(),
        "metadata": {"masked": doc.get("masked_aadhaar")},
    })
    return {"aadhaar": " ".join([plain[0:4], plain[4:8], plain[8:12]])}


@api.patch("/admin/donors/{donor_id}")
async def admin_update_donor(donor_id: str, body: dict, admin: dict = Depends(current_admin)):
    allowed = {"status", "availability", "donation_opt_in"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(400, "No valid fields")
    updates["updated_at"] = now_utc()
    r = await db.donors.update_one({"id": donor_id}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(404, "Donor not found")
    return {"ok": True}


@api.patch("/admin/blood-requests/{req_id}/status")
async def admin_update_status(req_id: str, body: UpdateRequestStatusIn, admin: dict = Depends(current_admin)):
    r = await db.blood_requests.update_one(
        {"$or": [{"id": req_id}, {"request_number": req_id}]},
        {"$set": {"status": body.status, "updated_at": now_utc()}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Request not found")
    return {"ok": True, "status": body.status}


@api.get("/admin/audit-logs")
async def admin_audit_logs(limit: int = 100, admin: dict = Depends(current_admin)):
    docs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for d in docs:
        d["timestamp"] = iso(d["timestamp"]) if isinstance(d.get("timestamp"), datetime) else d.get("timestamp")
    return {"logs": docs}


# Public blood groups constants
@api.get("/meta")
async def meta():
    return {
        "blood_groups": BLOOD_GROUPS,
        "urgency": URGENCY,
        "request_statuses": REQUEST_STATUSES,
        "min_donation_interval_days": DONATION_MIN_INTERVAL_DAYS,
    }


# ---------------------------------------------------------------------------
# Mount
# ---------------------------------------------------------------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
