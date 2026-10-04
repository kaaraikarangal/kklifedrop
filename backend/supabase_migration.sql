-- K2 Life Drop — Supabase schema
-- Run in Supabase SQL Editor (or via pg-meta). Backend talks via service_role key.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.donors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('Male','Female','Other')),
  date_of_birth date NOT NULL,
  blood_group text NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  email text,
  mobile varchar(15) NOT NULL UNIQUE,
  area text NOT NULL,
  place text NOT NULL,
  district text NOT NULL,
  state text NOT NULL,
  pincode varchar(10) NOT NULL,
  encrypted_aadhaar text NOT NULL,
  masked_aadhaar text NOT NULL,
  availability text NOT NULL DEFAULT 'Available' CHECK (availability IN ('Available','Not Available')),
  donation_opt_in boolean NOT NULL DEFAULT true,
  last_donation_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_donors_bg ON public.donors (blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_area ON public.donors (lower(area));
CREATE INDEX IF NOT EXISTS idx_donors_district ON public.donors (lower(district));

CREATE TABLE IF NOT EXISTS public.otps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mobile varchar(15) NOT NULL,
  otp_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otps_mobile ON public.otps (mobile, created_at DESC);

CREATE TABLE IF NOT EXISTS public.blood_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number text NOT NULL UNIQUE,
  patient_name text NOT NULL,
  blood_group text NOT NULL,
  units_required int NOT NULL CHECK (units_required BETWEEN 1 AND 20),
  hospital_name text NOT NULL,
  hospital_area text NOT NULL,
  hospital_city text NOT NULL,
  required_date date NOT NULL,
  required_time text,
  urgency text NOT NULL CHECK (urgency IN ('Normal','Urgent','Emergency')),
  requester_name text NOT NULL,
  requester_mobile varchar(15) NOT NULL,
  requester_email text,
  relationship text,
  additional_message text,
  hospital_contact text,
  status text NOT NULL DEFAULT 'Pending',
  donor_id_contacted uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_br_status ON public.blood_requests (status);
CREATE INDEX IF NOT EXISTS idx_br_bg ON public.blood_requests (blood_group);
CREATE INDEX IF NOT EXISTS idx_br_mobile ON public.blood_requests (requester_mobile);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id uuid REFERENCES public.donors(id) ON DELETE CASCADE,
  donor_mobile varchar(15),
  notification_type text NOT NULL DEFAULT 'blood_request',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  response text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (request_id, donor_id)
);
CREATE INDEX IF NOT EXISTS idx_notif_donor ON public.notifications (donor_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_req ON public.notifications (request_id);

CREATE TABLE IF NOT EXISTS public.donor_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id uuid REFERENCES public.donors(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('I Can Donate','Not Available')),
  responded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id text,
  action text NOT NULL,
  target_type text,
  target_id text,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Backend uses service_role, RLS is not needed and would block service_role inserts.
ALTER TABLE public.donors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
