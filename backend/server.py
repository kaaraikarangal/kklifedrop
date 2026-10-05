"""
K2 Life Drop - Blood Donation Platform Backend
FastAPI + Supabase (Postgres) via service_role key.
Clean provider interfaces for SMS / Email / Push so real providers
(MSG91, Twilio, Resend, FCM) can be dropped in via .env.
"""
from __future__ import annotations

import logging
import os
import random
import re
import string
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Literal

import bcrypt
import httpx
import jwt
from cryptography.fernet import Fernet, MultiFernet, InvalidToken
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field, field_validator
from starlette.middleware.cors import CORSMiddleware
from supabase import AsyncClient, create_async_client

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
JWT_EXP_HOURS = int(os.environ.get("JWT_EXP_HOURS", "24"))
OTP_LENGTH = int(os.environ.get("OTP_LENGTH", "6"))
OTP_EXP_MINUTES = int(os.environ.get("OTP_EXP_MINUTES", "5"))
OTP_MAX_ATTEMPTS = int(os.environ.get("OTP_MAX_ATTEMPTS", "5"))
DONATION_MIN_INTERVAL_DAYS = int(os.environ.get("DONATION_MIN_INTERVAL_DAYS", "90"))

_raw_keys = [k.strip() for k in os.environ.get("AADHAAR_FERNET_KEY", "").split(",") if k.strip()]
_valid_fernets = []
for _k in _raw_keys:
    try:
        _valid_fernets.append(Fernet(_k.encode() if isinstance(_k, str) else _k))
    except Exception:
        pass

if not _valid_fernets:
    _valid_fernets.append(Fernet(Fernet.generate_key()))

fernet = MultiFernet(_valid_fernets)

SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "mock").lower()
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "mock").lower()
FAST2SMS_API_KEY = os.environ.get("FAST2SMS_API_KEY", "")
FAST2SMS_MESSAGE_ID = os.environ.get("FAST2SMS_MESSAGE_ID", "35846")
FAST2SMS_PHONE_NUMBER_ID = os.environ.get("FAST2SMS_PHONE_NUMBER_ID", "1281701878369604")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("kk-life-drop")

app = FastAPI(title="KK Life Drop API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

sb: Optional[AsyncClient] = None

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


def as_utc(v) -> Optional[datetime]:
    """Normalize ISO string / naive datetime to tz-aware UTC."""
    if v is None:
        return None
    if isinstance(v, str):
        v = datetime.fromisoformat(v.replace("Z", "+00:00"))
    return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


def request_ref_filter(ref: str) -> str:
    """PostgREST or-filter: match by uuid id or request_number (never uuid-cast a request number)."""
    if UUID_RE.match(ref):
        return f"id.eq.{ref},request_number.eq.{ref}"
    return f"request_number.eq.{ref}"


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
    return f"XXXX XXXX {digits[-4:]}"


def encrypt_aadhaar(aadhaar: str) -> str:
    return fernet.encrypt(re.sub(r"\D", "", aadhaar).encode()).decode()


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
        return decode_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Session expired")
    except Exception:
        raise HTTPException(401, "Invalid token")


async def current_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin privileges required")
    return user


def sb_err(e: Exception, fallback: str = "Database error") -> HTTPException:
    msg = str(e)
    if "duplicate key" in msg.lower() or "23505" in msg:
        return HTTPException(409, "Record already exists")
    logger.error(f"DB error: {msg}")
    return HTTPException(500, fallback)


async def db_count(table: str, col: str = "*", **filters) -> int:
    q = sb.table(table).select(col, count="exact")
    for k, v in filters.items():
        q = q.eq(k, v)
    r = await q.limit(0).execute()
    return r.count or 0


# ---------------------------------------------------------------------------
# Provider abstractions - Fast2SMS & Mock
# ---------------------------------------------------------------------------
async def send_fast2sms_otp(mobile: str, otp: str) -> dict:
    if not FAST2SMS_API_KEY:
        logger.warning("[Fast2SMS] API key not configured")
        return {"status": "error", "message": "FAST2SMS_API_KEY missing in .env"}
    clean_mobile = re.sub(r"\D", "", mobile)[-10:]
    headers = {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/json"
    }

    # 1. Try Template API via secure POST (no sensitive credentials or OTP in URL)
    template_url = "https://www.fast2sms.com/dev/whatsapp"
    template_payload = {
        "message_id": FAST2SMS_MESSAGE_ID,
        "phone_number_id": FAST2SMS_PHONE_NUMBER_ID,
        "numbers": clean_mobile,
        "variables_values": otp,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(template_url, json=template_payload, headers=headers)
            data = resp.json()
            logger.info(f"[Fast2SMS WhatsApp OTP Template] {clean_mobile}: {data}")
            if data.get("return") is True:
                return {"status": "sent", "provider": "fast2sms_whatsapp", "data": data}
            logger.warning(f"[Fast2SMS WhatsApp] Template API rejected, trying session API: {data}")
    except Exception as e:
        logger.error(f"[Fast2SMS WhatsApp OTP Template] Error sending to {clean_mobile}: {e}")

    # 2. Fallback: Session API via secure POST
    session_url = "https://www.fast2sms.com/dev/whatsapp-session"
    session_payload = {
        "phone_number_id": FAST2SMS_PHONE_NUMBER_ID,
        "to": clean_mobile,
        "type": "text",
        "text": f"{otp} is your verification code. For your security, do not share this code.",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(session_url, json=session_payload, headers=headers)
            data = resp.json()
            logger.info(f"[Fast2SMS WhatsApp OTP Session] {clean_mobile}: {data}")
            if data.get("return") is True:
                return {"status": "sent", "provider": "fast2sms_whatsapp", "data": data}
            return {"status": "failed", "provider": "fast2sms_whatsapp", "data": data}
    except Exception as e:
        logger.error(f"[Fast2SMS WhatsApp OTP Session] Error sending to {clean_mobile}: {e}")
        return {"status": "error", "error": str(e), "provider": "fast2sms_whatsapp"}


async def send_fast2sms_message(mobile: str, message: str) -> dict:
    if not FAST2SMS_API_KEY:
        logger.warning("[Fast2SMS] API key not configured")
        return {"status": "error", "message": "FAST2SMS_API_KEY missing in .env"}
    clean_mobile = re.sub(r"\D", "", mobile)[-10:]
    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "route": "q",
        "message": message,
        "language": "english",
        "flash": 0,
        "numbers": clean_mobile
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            data = resp.json()
            logger.info(f"[Fast2SMS] Message sent to {clean_mobile}: {data}")
            return {"status": "sent" if data.get("return") else "failed", "provider": "fast2sms", "data": data}
    except Exception as e:
        logger.error(f"[Fast2SMS] Error sending message to {clean_mobile}: {e}")
        return {"status": "error", "error": str(e), "provider": "fast2sms"}


async def send_sms(mobile: str, message: str, otp: Optional[str] = None) -> dict:
    if SMS_PROVIDER == "fast2sms":
        if otp:
            return await send_fast2sms_otp(mobile, otp)
        return await send_fast2sms_message(mobile, message)
    elif SMS_PROVIDER == "mock":
        logger.info(f"[MOCK-SMS] to {mobile}: {message}")
        return {"status": "sent", "provider": "mock"}
    logger.warning(f"[SMS] provider {SMS_PROVIDER} not implemented, falling back to log")
    return {"status": "pending", "provider": SMS_PROVIDER}


async def send_email(email: str, subject: str, message: str) -> dict:
    if EMAIL_PROVIDER == "mock":
        logger.info(f"[MOCK-EMAIL] to {email} | {subject}: {message}")
        return {"status": "sent", "provider": "mock"}
    return {"status": "pending", "provider": EMAIL_PROVIDER}


async def send_expo_push_notifications(
    push_tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    """Dispatches high-priority lock-screen push notifications via Expo Push Service."""
    valid_tokens = [t for t in push_tokens if t and (t.startswith("ExponentPushToken") or t.startswith("ExpoPushToken"))]
    if not valid_tokens:
        logger.info("[Push] No valid ExponentPushToken found among target donors")
        return {"sent": 0, "failed": 0}

    messages = []
    for tok in valid_tokens:
        messages.append({
            "to": tok,
            "sound": "default",
            "title": title,
            "body": body,
            "channelId": "emergency-blood-alerts",
            "priority": "high",
            "badge": 1,
            "_displayInForeground": True,
            "data": data or {},
        })

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )
            res_data = res.json()
            logger.info(f"[Expo Push] Dispatched {len(messages)} push notifications: {res.status_code}")
            return {"status": "sent", "count": len(messages), "data": res_data}
    except Exception as err:
        logger.error(f"[Expo Push Error] Failed to send push notifications: {err}")
        return {"status": "error", "error": str(err)}


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
    last_donation_date: Optional[str] = None
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
    aadhaar: Optional[str] = None

    @field_validator("aadhaar")
    @classmethod
    def valid_update_aadhaar(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) != 12:
            raise ValueError("Aadhaar must be 12 digits")
        return digits


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
    donor_ids: Optional[List[str]] = None
    scope: Literal["same_area", "same_district", "all"] = "all"


class DonorResponseIn(BaseModel):
    request_id: str
    donor_id: str
    response: Literal["I Can Donate", "Not Available"]


class PushTokenIn(BaseModel):
    push_token: str


class UpdateRequestStatusIn(BaseModel):
    status: Literal[
        "Pending", "Admin Reviewing", "Donors Notified", "Donor Found",
        "Partially Fulfilled", "Fulfilled", "Cancelled", "Expired",
    ]
    fulfilled_by_donor_id: Optional[str] = None
    donation_date: Optional[str] = None


class AdminLoginIn(BaseModel):
    email: EmailStr
    password: str


class AdminDonorUpdateIn(BaseModel):
    status: Optional[Literal["active", "suspended"]] = None
    availability: Optional[Literal["Available", "Not Available"]] = None
    donation_opt_in: Optional[bool] = None
    last_donation_date: Optional[str] = None
    aadhaar: Optional[str] = None

    @field_validator("aadhaar")
    @classmethod
    def valid_admin_aadhaar(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        digits = re.sub(r"\D", "", v)
        if len(digits) != 12:
            raise ValueError("Aadhaar must be 12 digits")
        return digits


# ---------------------------------------------------------------------------
# Medical Donation Rest Period & Public/Admin projections
# ---------------------------------------------------------------------------
def get_donor_cooldown(donor: dict) -> dict:
    """
    Computes 3-month (DONATION_MIN_INTERVAL_DAYS = 90 days) medical rest status.
    Donors in this cooldown are legally and medically non-notifiable.
    """
    last = donor.get("last_donation_date")
    if not last:
        return {
            "in_cooldown": False,
            "cooldown_days_left": 0,
            "cooldown_end_date": None,
            "last_donation_date": None,
        }
    try:
        last_str = str(last)[:10]
        d = date.fromisoformat(last_str)
        today = datetime.now(timezone.utc).date()
        days_passed = (today - d).days
        if 0 <= days_passed < DONATION_MIN_INTERVAL_DAYS:
            days_left = DONATION_MIN_INTERVAL_DAYS - days_passed
            end_date = (d + timedelta(days=DONATION_MIN_INTERVAL_DAYS)).isoformat()
            return {
                "in_cooldown": True,
                "cooldown_days_left": days_left,
                "cooldown_end_date": end_date,
                "last_donation_date": last_str,
            }
        return {
            "in_cooldown": False,
            "cooldown_days_left": 0,
            "cooldown_end_date": None,
            "last_donation_date": last_str,
        }
    except Exception:
        return {
            "in_cooldown": False,
            "cooldown_days_left": 0,
            "cooldown_end_date": None,
            "last_donation_date": str(last)[:10] if last else None,
        }


def is_eligible(donor: dict) -> bool:
    if donor.get("status") != "active":
        return False
    if donor.get("availability") != "Available":
        return False
    if not donor.get("donation_opt_in"):
        return False
    cd = get_donor_cooldown(donor)
    if cd["in_cooldown"]:
        return False
    return True


def to_public_donor(doc: dict) -> dict:
    cooldown = get_donor_cooldown(doc)
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
        "in_cooldown": cooldown["in_cooldown"],
        "cooldown_days_left": cooldown["cooldown_days_left"],
        "cooldown_end_date": cooldown["cooldown_end_date"],
        "is_eligible": is_eligible(doc),
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
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_start():
    global sb
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env")
    sb = await create_async_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Verify schema exists
    try:
        await db_count("donors")
    except Exception as e:
        logger.error(
            "Supabase schema not found. Run /app/backend/supabase_migration.sql in the "
            "Supabase SQL Editor. Details: %s", str(e)[:200],
        )

    # Seed default admin
    admin_email = os.environ.get("ADMIN_SEED_EMAIL", "admin@k2lifedrop.com").lower()
    admin_pw = os.environ.get("ADMIN_SEED_PASSWORD", "Admin@123")
    try:
        r = await sb.table("admin_users").select("id").eq("email", admin_email).execute()
        if not r.data:
            await sb.table("admin_users").insert({
                "id": gen_id(),
                "email": admin_email,
                "password_hash": hash_pw(admin_pw),
                "name": "K2 Admin",
                "status": "active",
                "created_at": iso(now_utc()),
            }).execute()
            logger.info(f"Seeded default admin {admin_email}")
    except Exception as e:
        logger.error("Admin seed failed (schema missing?): %s", str(e)[:200])


# ---------------------------------------------------------------------------
# AUTH
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {
        "name": "KK Life Drop",
        "tagline": "Donate Blood, Save Lives",
        "organization": "Kaarai Karangal Samooga Sevai Amaippu",
        "registration_no": "31/2025",
        "iso_certified": "ISO 9001:2015",
    }


@api.get("/meta")
async def meta():
    return {
        "blood_groups": BLOOD_GROUPS,
        "urgency": URGENCY,
        "request_statuses": REQUEST_STATUSES,
        "min_donation_interval_days": DONATION_MIN_INTERVAL_DAYS,
    }


@api.get("/stats")
async def public_stats():
    total_donors = await db_count("donors", status="active")
    available_donors = await db_count("donors", status="active", availability="Available")

    dr = await sb.table("donors").select("blood_group,availability").eq("status", "active").execute()
    by_bg: dict = {g: 0 for g in BLOOD_GROUPS}
    for x in dr.data:
        bg = x.get("blood_group")
        if bg in by_bg:
            by_bg[bg] += 1
        elif bg:
            by_bg[bg] = 1

    total_requests = await db_count("blood_requests")
    er = await sb.table("blood_requests").select("id").eq("urgency", "Emergency").not_.in_("status", ["Fulfilled", "Cancelled", "Expired"]).execute()
    emergency_requests = len(er.data)

    return {
        "total_donors": total_donors,
        "available_donors": available_donors,
        "donors_by_blood_group": by_bg,
        "total_requests": total_requests,
        "emergency_requests": emergency_requests,
    }



@api.post("/auth/send-otp")
async def send_otp(body: SendOtpIn):
    clean_mobile = re.sub(r"\D", "", body.mobile)[-10:]
    if len(clean_mobile) != 10:
        raise HTTPException(400, "Enter a valid 10-digit mobile number")

    cutoff = iso(now_utc() - timedelta(minutes=10))
    q = sb.table("otps").select("id", count="exact").eq("mobile", clean_mobile).gte("created_at", cutoff)
    r = await q.limit(0).execute()
    if (r.count or 0) >= 6:
        raise HTTPException(429, "Too many OTP requests. Try again later.")

    otp = "".join(random.choices(string.digits, k=OTP_LENGTH))
    await sb.table("otps").insert({
        "id": gen_id(),
        "mobile": clean_mobile,
        "otp_hash": hash_pw(otp),
        "attempts": 0,
        "verified": False,
        "expires_at": iso(now_utc() + timedelta(minutes=OTP_EXP_MINUTES)),
        "created_at": iso(now_utc()),
    }).execute()
    sms_res = await send_sms(clean_mobile, f"Your KK Life Drop OTP is {otp}. Valid {OTP_EXP_MINUTES} minutes.", otp=otp)
    if SMS_PROVIDER == "fast2sms":
        if sms_res.get("status") != "sent":
            data = sms_res.get("data") or {}
            msg = data.get("message") or sms_res.get("error") or "Failed to send verification code via WhatsApp"
            logger.error(f"[Fast2SMS Live Error] {msg}")
            raise HTTPException(502, f"Gateway Error: {msg}")
        return {"ok": True, "mobile": clean_mobile, "expires_in_minutes": OTP_EXP_MINUTES, "message": "Verification code sent to your WhatsApp successfully"}

    return {
        "ok": True,
        "mobile": clean_mobile,
        "expires_in_minutes": OTP_EXP_MINUTES,
        "message": "Verification code dispatched successfully",
    }


@api.post("/auth/verify-otp")
async def verify_otp(body: VerifyOtpIn):
    clean_mobile = re.sub(r"\D", "", body.mobile)[-10:]
    r = await sb.table("otps").select("*").eq("mobile", clean_mobile).eq("verified", False).order("created_at", desc=True).limit(1).execute()
    if not r.data:
        raise HTTPException(400, "No pending verification code found. Request a new code.")
    rec = r.data[0]
    if (as_utc(rec["expires_at"]) or now_utc()) < now_utc():
        raise HTTPException(400, "Verification code expired. Request a new code.")
    if rec["attempts"] >= OTP_MAX_ATTEMPTS:
        raise HTTPException(429, "Too many attempts. Request a new code.")

    await sb.table("otps").update({"attempts": rec["attempts"] + 1}).eq("id", rec["id"]).execute()
    is_valid = verify_pw(body.otp, rec["otp_hash"])
    if not is_valid:
        remaining = max(0, OTP_MAX_ATTEMPTS - (rec["attempts"] + 1))
        raise HTTPException(400, f"Invalid code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.")
    await sb.table("otps").update({"verified": True}).eq("id", rec["id"]).execute()

    d = await sb.table("donors").select("*").eq("mobile", body.mobile).execute()
    donor = d.data[0] if d.data else None
    token = make_token(body.mobile, "user")
    return {
        "ok": True,
        "token": token,
        "mobile": body.mobile,
        "is_registered": donor is not None,
        "donor": to_public_donor(donor) if donor else None,
    }


@api.post("/auth/admin/login")
async def admin_login(body: AdminLoginIn):
    r = await sb.table("admin_users").select("*").eq("email", body.email.lower()).execute()
    admin = r.data[0] if r.data else None
    if not admin or not verify_pw(body.password, admin["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    if admin.get("status") != "active":
        raise HTTPException(403, "Admin account disabled")
    token = make_token(admin["email"], "admin")
    return {"ok": True, "token": token, "admin": {"email": admin["email"], "name": admin.get("name")}}


# ---------------------------------------------------------------------------
# DONORS
# ---------------------------------------------------------------------------
@api.post("/donors")
async def register_donor(body: DonorRegistrationIn, user: dict = Depends(current_user)):
    if user["sub"] != body.mobile:
        raise HTTPException(403, "Mobile does not match verified session")
    if not body.consent:
        raise HTTPException(400, "Consent is required")

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
        "created_at": iso(now_utc()),
        "updated_at": iso(now_utc()),
    }
    try:
        r = await sb.table("donors").insert(doc).execute()
    except Exception as e:
        raise sb_err(e, "A donor with this mobile already exists")
    return {"ok": True, "donor": to_public_donor(r.data[0])}


@api.get("/donors")
async def list_donors(
    blood_group: Optional[str] = None,
    area: Optional[str] = None,
    district: Optional[str] = None,
    availability: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
):
    q = sb.table("donors").select("*").eq("status", "active")
    if blood_group:
        q = q.eq("blood_group", blood_group)
    if area:
        q = q.ilike("area", f"%{area}%")
    if district:
        q = q.ilike("district", f"%{district}%")
    if availability:
        q = q.eq("availability", availability)
    if search:
        q = q.or_(f"full_name.ilike.%{search}%,place.ilike.%{search}%,area.ilike.%{search}%")
    r = await q.order("created_at", desc=True).limit(limit).execute()
    return {"donors": [to_public_donor(d) for d in r.data], "count": len(r.data)}


@api.get("/donors/me")
async def my_profile(user: dict = Depends(current_user)):
    if user["role"] != "user":
        raise HTTPException(403, "User only")
    r = await sb.table("donors").select("*").eq("mobile", user["sub"]).execute()
    if not r.data:
        raise HTTPException(404, "Not registered")
    doc = r.data[0]
    out = to_public_donor(doc)
    out.update({"mobile": doc.get("mobile"), "email": doc.get("email")})
    return {"donor": out}


@api.get("/donors/{donor_id}")
async def get_donor(donor_id: str):
    r = await sb.table("donors").select("*").eq("id", donor_id).execute()
    if not r.data:
        raise HTTPException(404, "Donor not found")
    return {"donor": to_public_donor(r.data[0])}


@api.patch("/donors/me")
async def update_me(body: DonorUpdateIn, user: dict = Depends(current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if "aadhaar" in updates and updates["aadhaar"]:
        raw_aadhaar = updates.pop("aadhaar")
        updates["encrypted_aadhaar"] = encrypt_aadhaar(raw_aadhaar)
        updates["masked_aadhaar"] = mask_aadhaar(raw_aadhaar)
    updates["updated_at"] = iso(now_utc())
    await sb.table("donors").update(updates).eq("mobile", user["sub"]).execute()
    r = await sb.table("donors").select("*").eq("mobile", user["sub"]).execute()
    if not r.data:
        raise HTTPException(404, "Not registered")
    doc = r.data[0]
    out = to_public_donor(doc)
    out.update({"mobile": doc.get("mobile"), "email": doc.get("email")})
    return {"ok": True, "donor": out}


@api.delete("/donors/me")
async def delete_my_account(user: dict = Depends(current_user)):
    """Permanent Account & Data Deletion required by Apple App Store (Guideline 5.1.1(v)) and Google Play."""
    if user["role"] != "user":
        raise HTTPException(403, "User only")
    mobile = user["sub"]
    d = await sb.table("donors").select("id, full_name").eq("mobile", mobile).execute()
    if not d.data:
        raise HTTPException(404, "Donor not registered")
    donor_id = d.data[0]["id"]
    await sb.table("donors").delete().eq("id", donor_id).execute()
    logger.info(f"[Account Deletion] Donor {donor_id} ({mobile}) permanently deleted profile.")
    return {"ok": True, "message": "Account and associated donor data permanently deleted."}


@api.post("/donors/push-token")
async def register_push_token(body: PushTokenIn, user: dict = Depends(current_user)):
    """Registers device Expo Push Token for lock-screen emergency notifications."""
    token = body.push_token.strip()
    if not token:
        raise HTTPException(400, "Push token required")

    mobile = user.get("sub")
    d = await sb.table("donors").select("id,full_name,blood_group").eq("mobile", mobile).execute()
    if not d.data:
        raise HTTPException(404, "Donor not registered")
    donor = d.data[0]
    donor_id = donor["id"]

    await sb.table("audit_logs").insert({
        "id": gen_id(),
        "admin_id": donor_id,
        "action": "donor_push_token",
        "target_type": "donor",
        "target_id": donor_id,
        "timestamp": iso(now_utc()),
        "metadata": {
            "push_token": token,
            "mobile": mobile,
            "blood_group": donor.get("blood_group"),
        },
    }).execute()

    try:
        await sb.table("donors").update({"push_token": token}).eq("id", donor_id).execute()
    except Exception:
        pass

    logger.info(f"[Push Token] Registered device token for {mobile}: {token[:30]}...")
    return {"ok": True, "message": "Push token registered successfully"}


# ---------------------------------------------------------------------------
# BLOOD REQUESTS
# ---------------------------------------------------------------------------
async def gen_request_number() -> str:
    today = now_utc().strftime("%Y%m%d")
    q = sb.table("blood_requests").select("id", count="exact").or_(f"request_number.like.KK-BR-{today}-%,request_number.like.K2-BR-{today}-%")
    r = await q.limit(0).execute()
    return f"KK-BR-{today}-{(r.count or 0) + 1:03d}"


@api.post("/blood-requests")
async def create_blood_request(body: BloodRequestIn):
    req_num = await gen_request_number()
    doc = {
        "id": gen_id(),
        "request_number": req_num,
        **body.model_dump(),
        "status": "Pending",
        "created_at": iso(now_utc()),
        "updated_at": iso(now_utc()),
    }
    await sb.table("blood_requests").insert(doc).execute()
    return {"ok": True, "request_id": req_num, "id": doc["id"], "status": "Pending"}


@api.post("/blood-requests/contact-donor")
async def contact_donor(body: ContactDonorIn):
    d = await sb.table("donors").select("*").eq("id", body.donor_id).execute()
    if not d.data:
        raise HTTPException(404, "Donor not found")
    donor = d.data[0]
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
        "created_at": iso(now_utc()),
        "updated_at": iso(now_utc()),
    }
    await sb.table("blood_requests").insert(doc).execute()
    return {"ok": True, "request_id": req_num, "message": "Your request has been submitted. KK Life Drop admin will contact you shortly."}


@api.get("/blood-requests")
async def list_blood_requests(
    status: Optional[str] = None,
    blood_group: Optional[str] = None,
    urgency: Optional[str] = None,
    mobile: Optional[str] = None,
    limit: int = 200,
):
    q = sb.table("blood_requests").select("*")
    if status:
        q = q.eq("status", status)
    if blood_group:
        q = q.eq("blood_group", blood_group)
    if urgency:
        q = q.eq("urgency", urgency)
    if mobile:
        q = q.eq("requester_mobile", re.sub(r"\D", "", mobile)[-10:])
    r = await q.order("created_at", desc=True).limit(limit).execute()
    return {"requests": r.data, "count": len(r.data)}


@api.get("/blood-requests/{req_id}")
async def get_request(req_id: str):
    r = await sb.table("blood_requests").select("*").or_(request_ref_filter(req_id)).execute()
    if not r.data:
        raise HTTPException(404, "Request not found")
    return {"request": r.data[0]}


# ---------------------------------------------------------------------------
# Matching + Notification
# ---------------------------------------------------------------------------
@api.get("/blood-requests/{req_id}/matching-donors")
async def matching_donors(req_id: str, admin: dict = Depends(current_admin)):
    rr = await sb.table("blood_requests").select("*").or_(request_ref_filter(req_id)).execute()
    if not rr.data:
        raise HTTPException(404, "Request not found")
    req = rr.data[0]

    d = await sb.table("donors").select("*").eq("blood_group", req["blood_group"]).execute()
    
    # Donors currently resting under 3-month medical cooldown:
    resting = [x for x in d.data if get_donor_cooldown(x)["in_cooldown"]]
    # Legally & medically eligible donors:
    eligible = [x for x in d.data if is_eligible(x)]

    area = (req.get("hospital_area") or "").lower()
    district = (req.get("hospital_city") or "").lower()
    same_area, same_district, other = [], [], []
    for x in eligible:
        da = (x.get("area") or "").lower()
        dd = (x.get("district") or "").lower()
        if area and da == area:
            same_area.append(x)
        elif district and (dd == district or (x.get("place") or "").lower() == district):
            same_district.append(x)
        else:
            other.append(x)

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
            "in_rest_period": len(resting),
            "same_area": len(same_area),
            "same_district": len(same_district),
            "other": len(other),
        },
        "same_area": [to_admin_donor(x) for x in same_area],
        "same_district": [to_admin_donor(x) for x in same_district],
        "other": [to_admin_donor(x) for x in other],
        "resting_donors": [to_admin_donor(x) for x in resting],
    }


@api.post("/blood-requests/{req_id}/notify")
async def notify_donors(req_id: str, body: NotifyIn, admin: dict = Depends(current_admin)):
    rr = await sb.table("blood_requests").select("*").or_(request_ref_filter(req_id)).execute()
    if not rr.data:
        raise HTTPException(404, "Request not found")
    req = rr.data[0]

    if body.donor_ids:
        d = await sb.table("donors").select("*").in_("id", body.donor_ids).execute()
        # Strictly enforce 3-month protection: resting donors CANNOT be notified
        eligible = [x for x in d.data if is_eligible(x)]
        resting = [x for x in d.data if get_donor_cooldown(x)["in_cooldown"]]
        if not eligible and resting:
            raise HTTPException(
                400,
                f"Selected donor(s) donated blood within the last 3 months and are protected under medical rest cooldown."
            )
        donors = eligible
    else:
        d = await sb.table("donors").select("*").eq("blood_group", req["blood_group"]).execute()
        eligible = [x for x in d.data if is_eligible(x)]
        if body.scope == "same_area":
            donors = [x for x in eligible if (x.get("area") or "").lower() == (req.get("hospital_area") or "").lower()]
        elif body.scope == "same_district":
            donors = [x for x in eligible if (x.get("district") or "").lower() == (req.get("hospital_city") or "").lower()]
        else:
            donors = eligible

    msg = (
        f"K2 Life Drop: Emergency Blood Requirement. Group {req['blood_group']}, "
        f"Hospital {req['hospital_name']}, Location {req.get('hospital_area') or req.get('hospital_city')}, "
        f"Units {req['units_required']}, Urgency {req['urgency']}. Please respond in the app if available."
    )

    notified = 0
    notified_donor_ids = []
    for x in donors:
        ex = await sb.table("notifications").select("id").eq("request_id", req["id"]).eq("donor_id", x["id"]).execute()
        if ex.data:
            continue
        await sb.table("notifications").insert({
            "id": gen_id(),
            "request_id": req["id"],
            "donor_id": x["id"],
            "donor_mobile": x.get("mobile"),
            "notification_type": "blood_request",
            "message": msg,
            "status": "sent",
            "sent_at": iso(now_utc()),
        }).execute()
        await send_sms(x.get("mobile", ""), msg)
        notified += 1
        notified_donor_ids.append(x["id"])

    # Push Notification Dispatch (Lock-screen / Background Alerts)
    push_tokens = []
    if notified_donor_ids:
        try:
            al_r = await sb.table("audit_logs").select("target_id,metadata").eq("action", "donor_push_token").in_("target_id", notified_donor_ids).order("timestamp", desc=True).execute()
            seen_donors = set()
            for al in al_r.data:
                meta = al.get("metadata") or {}
                tok = meta.get("push_token")
                t_id = al.get("target_id")
                if tok and t_id not in seen_donors:
                    seen_donors.add(t_id)
                    push_tokens.append(tok)
        except Exception as e:
            logger.error(f"[Push Query Error] {e}")

    if push_tokens:
        await send_expo_push_notifications(
            push_tokens=push_tokens,
            title=f"🩸 URGENT: {req['blood_group']} Blood Required!",
            body=f"{req['hospital_name']} ({req.get('hospital_area') or req.get('hospital_city')}) needs {req['units_required']} unit(s). Tap to respond.",
            data={
                "request_id": req["request_number"],
                "blood_group": req["blood_group"],
                "url": "/(tabs)/notifications",
            },
        )

    await sb.table("blood_requests").update({"status": "Donors Notified", "updated_at": iso(now_utc())}).eq("id", req["id"]).execute()

    await sb.table("audit_logs").insert({
        "id": gen_id(),
        "admin_id": admin.get("sub"),
        "action": "notify_donors",
        "target_type": "blood_request",
        "target_id": req["id"],
        "timestamp": iso(now_utc()),
        "metadata": {"notified_count": notified, "scope": body.scope},
    }).execute()

    return {"ok": True, "notified": notified, "request_id": req["request_number"]}


@api.post("/donor-responses")
async def donor_response(body: DonorResponseIn):
    await sb.table("donor_responses").insert({
        "id": gen_id(),
        "request_id": body.request_id,
        "donor_id": body.donor_id,
        "response": body.response,
        "responded_at": iso(now_utc()),
    }).execute()
    await sb.table("notifications").update({
        "response": body.response,
        "responded_at": iso(now_utc()),
    }).eq("request_id", body.request_id).eq("donor_id", body.donor_id).execute()
    if body.response == "I Can Donate":
        await sb.table("blood_requests").update({"status": "Donor Found", "updated_at": iso(now_utc())}).eq("id", body.request_id).execute()
    return {"ok": True, "response": body.response}


@api.get("/notifications")
async def notifications_for_me(user: dict = Depends(current_user)):
    d = await sb.table("donors").select("id").eq("mobile", user["sub"]).execute()
    if not d.data:
        return {"notifications": []}
    donor_id = d.data[0]["id"]
    n = await sb.table("notifications").select("*").eq("donor_id", donor_id).order("sent_at", desc=True).limit(100).execute()
    out = []
    for item in n.data:
        req = None
        rq = await sb.table("blood_requests").select(
            "request_number,blood_group,hospital_name,hospital_area,hospital_city,units_required,urgency,status"
        ).eq("id", item["request_id"]).execute()
        if rq.data:
            req = rq.data[0]
        out.append({
            "id": item["id"],
            "request_id": item["request_id"],
            "message": item["message"],
            "status": item["status"],
            "sent_at": item["sent_at"],
            "response": item.get("response"),
            "responded_at": item.get("responded_at"),
            "request": req,
        })
    return {"notifications": out}


@api.get("/admin/notifications")
async def admin_notifications(admin: dict = Depends(current_admin)):
    n = await sb.table("notifications").select("*").order("sent_at", desc=True).limit(500).execute()
    groups: dict = {}
    for item in n.data:
        g = groups.setdefault(item["request_id"], {"notified": 0, "responded": 0, "can_donate": 0, "last_sent": None})
        g["notified"] += 1
        if item.get("response"):
            g["responded"] += 1
            if item["response"] == "I Can Donate":
                g["can_donate"] += 1
        if not g["last_sent"] or item["sent_at"] > g["last_sent"]:
            g["last_sent"] = item["sent_at"]
    out = []
    for rid, g in groups.items():
        rq = await sb.table("blood_requests").select("request_number,blood_group,urgency,status").eq("id", rid).execute()
        req = rq.data[0] if rq.data else {}
        out.append({
            "request_id": rid,
            "request_number": req.get("request_number"),
            "blood_group": req.get("blood_group"),
            "urgency": req.get("urgency"),
            "notified": g["notified"],
            "responded": g["responded"],
            "can_donate": g["can_donate"],
            "last_sent": g["last_sent"],
            "status": req.get("status"),
        })
    out.sort(key=lambda x: x.get("last_sent") or "", reverse=True)
    return {"groups": out}


# ---------------------------------------------------------------------------
# ADMIN
# ---------------------------------------------------------------------------
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(current_admin)):
    total_donors = await db_count("donors", status="active")
    available = await db_count("donors", status="active", availability="Available")
    total_requests = await db_count("blood_requests")
    pending = await db_count("blood_requests", status="Pending")
    fulfilled = await db_count("blood_requests", status="Fulfilled")

    dr = await sb.table("donors").select("blood_group,district,availability,status").execute()
    by_bg: dict = {}
    by_dist: dict = {}
    for x in dr.data:
        if x.get("blood_group"):
            by_bg[x["blood_group"]] = by_bg.get(x["blood_group"], 0) + 1
        if x.get("district"):
            by_dist[x["district"]] = by_dist.get(x["district"], 0) + 1
    by_district = sorted(({"district": k, "count": v} for k, v in by_dist.items()), key=lambda x: -x["count"])[:10]

    er = await sb.table("blood_requests").select("id").eq("urgency", "Emergency").not_.in_("status", ["Fulfilled", "Cancelled", "Expired"]).execute()
    emergency = len(er.data)

    sent = await db_count("notifications")
    responded_r = await sb.table("notifications").select("id", count="exact").not_.is_("response", "null").limit(0).execute()
    responded = responded_r.count or 0
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
    limit: int = 500,
    admin: dict = Depends(current_admin),
):
    q = sb.table("donors").select("*")
    if blood_group:
        q = q.eq("blood_group", blood_group)
    if availability:
        q = q.eq("availability", availability)
    if district:
        q = q.ilike("district", f"%{district}%")
    if search:
        q = q.or_(f"full_name.ilike.%{search}%,mobile.ilike.%{search}%,area.ilike.%{search}%,place.ilike.%{search}%")
    r = await q.order("created_at", desc=True).limit(limit).execute()
    return {"donors": [to_admin_donor(d) for d in r.data], "count": len(r.data)}


@api.get("/admin/donors/{donor_id}")
async def admin_get_donor(donor_id: str, admin: dict = Depends(current_admin)):
    r = await sb.table("donors").select("*").eq("id", donor_id).execute()
    if not r.data:
        raise HTTPException(404, "Donor not found")
    return {"donor": to_admin_donor(r.data[0])}


@api.get("/admin/donors/{donor_id}/aadhaar")
async def admin_reveal_aadhaar(donor_id: str, admin: dict = Depends(current_admin)):
    r = await sb.table("donors").select("id,encrypted_aadhaar,masked_aadhaar").eq("id", donor_id).execute()
    if not r.data:
        raise HTTPException(404, "Donor not found")
    doc = r.data[0]
    plain = None
    decrypted = False
    try:
        if doc.get("encrypted_aadhaar"):
            plain = decrypt_aadhaar(doc["encrypted_aadhaar"])
            decrypted = True
    except Exception as e:
        logger.warning(f"Unable to decrypt aadhaar for donor {donor_id}: {e}")
        plain = None
        decrypted = False

    await sb.table("audit_logs").insert({
        "id": gen_id(),
        "admin_id": admin.get("sub"),
        "action": "reveal_aadhaar",
        "target_type": "donor",
        "target_id": donor_id,
        "timestamp": iso(now_utc()),
        "metadata": {
            "masked": doc.get("masked_aadhaar"),
            "decrypted": decrypted,
        },
    }).execute()

    if decrypted and plain:
        formatted = " ".join([plain[0:4], plain[4:8], plain[8:12]])
        return {
            "aadhaar": formatted,
            "masked": doc.get("masked_aadhaar"),
            "decrypted": True,
        }
    else:
        return {
            "aadhaar": None,
            "masked": doc.get("masked_aadhaar"),
            "decrypted": False,
            "error": "Aadhaar was encrypted with a previous session key. Please re-enter 12-digit Aadhaar to re-encrypt.",
        }


@api.patch("/admin/donors/{donor_id}")
async def admin_update_donor(donor_id: str, body: AdminDonorUpdateIn, admin: dict = Depends(current_admin)):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "No valid fields")
    updates = {}
    for k in ["status", "availability", "donation_opt_in", "last_donation_date"]:
        if k in data:
            updates[k] = data[k]
    if "aadhaar" in data and data["aadhaar"]:
        updates["encrypted_aadhaar"] = encrypt_aadhaar(data["aadhaar"])
        updates["masked_aadhaar"] = mask_aadhaar(data["aadhaar"])
    updates["updated_at"] = iso(now_utc())
    r = await sb.table("donors").update(updates).eq("id", donor_id).execute()
    if not r.data:
        raise HTTPException(404, "Donor not found")
    if "aadhaar" in data and data["aadhaar"]:
        await sb.table("audit_logs").insert({
            "id": gen_id(),
            "admin_id": admin.get("sub"),
            "action": "update_aadhaar",
            "target_type": "donor",
            "target_id": donor_id,
            "timestamp": iso(now_utc()),
            "metadata": {"masked": mask_aadhaar(data["aadhaar"]), "reason": "rekey_reencrypt"},
        }).execute()
    if "last_donation_date" in data:
        await sb.table("audit_logs").insert({
            "id": gen_id(),
            "admin_id": admin.get("sub"),
            "action": "record_donation",
            "target_type": "donor",
            "target_id": donor_id,
            "timestamp": iso(now_utc()),
            "metadata": {"last_donation_date": data["last_donation_date"], "cooldown_days": DONATION_MIN_INTERVAL_DAYS},
        }).execute()
    return {"ok": True, "donor": to_admin_donor(r.data[0])}


@api.patch("/admin/blood-requests/{req_id}/status")
async def admin_update_status(req_id: str, body: UpdateRequestStatusIn, admin: dict = Depends(current_admin)):
    r = await sb.table("blood_requests").update({"status": body.status, "updated_at": iso(now_utc())}).or_(
        request_ref_filter(req_id)
    ).execute()
    if not r.data:
        raise HTTPException(404, "Request not found")

    # If fulfilled by a registered donor, update their last_donation_date to start their 3-month cooldown
    if body.fulfilled_by_donor_id:
        d_date = body.donation_date or datetime.now(timezone.utc).date().isoformat()
        await sb.table("donors").update({
            "last_donation_date": d_date,
            "updated_at": iso(now_utc()),
        }).eq("id", body.fulfilled_by_donor_id).execute()

        await sb.table("audit_logs").insert({
            "id": gen_id(),
            "admin_id": admin.get("sub"),
            "action": "donation_fulfilled",
            "target_type": "donor",
            "target_id": body.fulfilled_by_donor_id,
            "timestamp": iso(now_utc()),
            "metadata": {"request_id": req_id, "donation_date": d_date, "cooldown_days": DONATION_MIN_INTERVAL_DAYS},
        }).execute()

    return {"ok": True, "status": body.status}


@api.get("/admin/audit-logs")
async def admin_audit_logs(limit: int = 100, admin: dict = Depends(current_admin)):
    r = await sb.table("audit_logs").select("*").order("timestamp", desc=True).limit(limit).execute()
    return {"logs": r.data}


# ---------------------------------------------------------------------------
# Public Legal Endpoints (Google Play Store & Apple App Store Compliance)
# ---------------------------------------------------------------------------
HTML_TERMS = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms & Conditions - K2 Life Drop</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E2E8F0; }
    h1 { color: #DC2626; font-size: 28px; margin-top: 0; }
    h2 { color: #0F172A; font-size: 20px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; margin-top: 28px; }
    p, li { color: #475569; font-size: 15px; }
    .badge { display: inline-block; background: #FEE2E2; color: #DC2626; padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; margin-bottom: 12px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Kaarai Karangal Social Service Organization</div>
    <h1>Terms & Conditions</h1>
    <p><strong>Effective Date:</strong> October 2026</p>
    <p>Welcome to <strong>K2 Life Drop</strong>. By installing, registering, or using our mobile application or web portal, you agree to these Terms and Conditions.</p>

    <h2>1. Voluntary & Non-Commercial Nature</h2>
    <p>K2 Life Drop is a voluntary community service bridge connecting verified blood donors with patients in emergency need. Under Section 19 of the National Blood Transfusion Council (NBTC) guidelines and the Drugs and Cosmetics Act, all blood donations are strictly voluntary. <strong>Commercial sale, purchase, or monetary remuneration of any kind for blood or platelets is strictly prohibited.</strong></p>

    <h2>2. Medical Eligibility & 90-Day Cooldown</h2>
    <p>Donors must be 18 to 65 years of age, weigh at least 45 kg, and observe a mandatory 90-day cooldown between whole-blood donations. Medical eligibility and cross-matching are confirmed by licensed medical officers at the treating hospital.</p>

    <h2>3. Disclaimer of Medical Liability</h2>
    <p>K2 Life Drop is an emergency communication network and does not collect, test, or store physical blood. Final responsibility for blood transfusion, serological screening, and medical treatment rests exclusively with the authorized hospital or blood bank.</p>

    <h2>4. Account Deletion & Rights</h2>
    <p>Donors can disable availability or permanently delete their account and personal data at any time directly in the app or by contacting our team.</p>

    <h2>5. Contact & Grievance</h2>
    <p>Kaarai Karangal Social Service Organization, Karaikal, Puducherry UT - 609602, India.<br>
    Email: support@k2lifedrop.org / admin@k2lifedrop.com</p>

    <div class="footer">&copy; 2026 Kaarai Karangal Social Service Organization (Reg. No. 31/2025). All rights reserved.</div>
  </div>
</body>
</html>"""

HTML_PRIVACY = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - K2 Life Drop</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #E2E8F0; }
    h1 { color: #0F766E; font-size: 28px; margin-top: 0; }
    h2 { color: #0F172A; font-size: 20px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px; margin-top: 28px; }
    p, li { color: #475569; font-size: 15px; }
    .badge { display: inline-block; background: #CCFBF1; color: #0F766E; padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; margin-bottom: 12px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">Google Play & Apple App Store Privacy Compliance</div>
    <h1>Privacy Policy</h1>
    <p><strong>Last Updated:</strong> October 2026</p>
    <p>This Privacy Policy explains how <strong>Kaarai Karangal Social Service Organization</strong> collects, uses, encrypts, and protects your personal information on the <strong>K2 Life Drop</strong> platform.</p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li><strong>Donor Information:</strong> Name, gender, date of birth, blood group, email, residential area, district, and state.</li>
      <li><strong>Mobile Number:</strong> Required for secure One-Time Password (OTP) verification and emergency contact.</li>
      <li><strong>Aadhaar Number:</strong> Collected for identity verification and anti-fraud purposes. In compliance with UIDAI guidelines, all Aadhaar numbers are encrypted at rest with military-grade 256-bit AES/Fernet encryption and masked as XXXX-XXXX-****.</li>
      <li><strong>Device Push Token:</strong> Used to dispatch background lock-screen notifications for nearby urgent blood requests.</li>
      <li><strong>Donation History:</strong> Stored to enforce the mandatory 90-day medical rest cooldown.</li>
    </ul>

    <h2>2. How We Use Data</h2>
    <p>We use your information exclusively to connect voluntary blood donors with hospitals and patients facing critical medical emergencies. <strong>We NEVER sell, trade, or share your data with advertisers or commercial brokers.</strong></p>

    <h2>3. Account Deletion & Data Rights (Apple Guideline 5.1.1(v))</h2>
    <p>You have full autonomy over your data. You may toggle your availability off, opt-out of notifications, or permanently delete your account and personal data directly from the Profile section of the app at any time.</p>

    <h2>4. Grievance Officer & Inquiries</h2>
    <p>Kaarai Karangal Social Service Organization<br>
    Karaikal, Puducherry UT - 609602, India.<br>
    Email: privacy@k2lifedrop.org / admin@k2lifedrop.com</p>

    <div class="footer">&copy; 2026 Kaarai Karangal Social Service Organization. All rights reserved.</div>
  </div>
</body>
</html>"""


@app.get("/terms", response_class=HTMLResponse)
@api.get("/terms", response_class=HTMLResponse)
async def public_terms():
    return HTMLResponse(content=HTML_TERMS, status_code=200)


@app.get("/privacy", response_class=HTMLResponse)
@api.get("/privacy", response_class=HTMLResponse)
async def public_privacy():
    return HTMLResponse(content=HTML_PRIVACY, status_code=200)


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
