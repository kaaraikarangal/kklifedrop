# KK Life Drop — Product Requirements

**Tagline:** Every Drop Can Save a Life

## Scope (MVP)
Production-grade mobile blood donation + request platform (Expo + FastAPI + MongoDB).

### User features
- Landing with hero, how-it-works, blood groups, donors list, emergency CTA.
- Mobile OTP signup / login (6-digit, 5 min expiry, 5 attempts, rate limited).
- Donor registration: personal + location + Aadhaar (encrypted, masked for UI) + availability + opt-in + consent.
- Donor directory with blood-group chips + search.
- Blood request submission (patient + hospital + urgency + requester + relationship).
- Request status tracking (Pending → Admin Reviewing → Donors Notified → Donor Found → Fulfilled/Cancelled).
- Donor contact flow via admin (no direct phone exposure).
- Notifications list with “I Can Donate” / “Not Available”.
- Profile: availability toggle, opt-in toggle, logout.

### Admin features (separate login)
- Stats dashboard (donors, available, requests, pending/emergency/fulfilled, by blood group, response rate).
- Donors table with reveal-Aadhaar audit-logged action.
- Blood requests with Match & Notify flow (same_area / same_district / all / selected), Fulfilled / Cancel actions.
- Notification history grouped per request.

### Security
- JWT auth, bcrypt passwords, Fernet-encrypted Aadhaar at rest, masked in UI, excluded from public endpoints and notifications.
- Admin-only middleware on all admin routes.
- Audit logs for sensitive actions (reveal_aadhaar, notify_donors).

### Providers (interface-ready, mocked)
- SMS: `SMS_PROVIDER` env (msg91/twilio/textlocal) — mock logs to stdout.
- Email: `EMAIL_PROVIDER` env (resend/sendgrid/smtp) — mock.
- Push: FCM stub.

## Database (Production)
- **Supabase Postgres** (live): `https://uurkvfeguglvcjqgcway.supabase.co` — service_role key in backend `.env`.
- Schema: `/app/backend/supabase_migration.sql` (donors, otps, blood_requests, notifications, donor_responses, admin_users, audit_logs). RLS disabled; backend is the only writer via service key.
- No demo data — production starts empty (admin seeded only).
- 2026-10-04: migrated from MongoDB; fixed uuid-cast crash on `K2-BR-*` lookups (UUID-regex filter). 42/42 backend tests pass against Supabase.

## Deferred
- Real SMS/Email/FCM wiring (requires user keys).
- Request-number generation is count-based (race risk at scale — consider a Postgres sequence + RPC).
- Charts in admin analytics.
- Localization.
