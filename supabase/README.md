# Supabase Edge Functions (100% Serverless Setup)

These Edge Functions allow **KK Life Drop** to run completely serverless on Supabase without needing any Python server or backend hosting.

## Functions Included

1. **`send-otp`** (`supabase/functions/send-otp/index.ts`):
   - Generates 6-digit cryptographic verification codes.
   - Enforces rate limits (max 6 requests / 10 min).
   - Dispatches WhatsApp OTP via Fast2SMS using server-to-server POST request.
   - Keeps your Fast2SMS API key and OTP completely private and hidden from client devices.

2. **`verify-otp`** (`supabase/functions/verify-otp/index.ts`):
   - Enforces 5-minute expiry & 5-attempt anti-brute-force lock.
   - Verifies OTP code serverlessly.
   - Issues session token and checks donor registration.

---

## One-Time Deployment (Takes 1 Minute)

### Step 1: Login to Supabase CLI
```bash
npx supabase login
```

### Step 2: Set Secrets in Supabase Cloud
```bash
npx supabase secrets set FAST2SMS_API_KEY="rO09Unsxw1b7cXI4fZE3YvQWSACLFNoMtB26hezkymDPdgjlJimuenxOJjTL3Mhq2atf5IlyB8wG6r4D" FAST2SMS_MESSAGE_ID="35846" FAST2SMS_PHONE_NUMBER_ID="1281701878369604" --project-ref uurkvfeguglvcjqgcway
```

### Step 3: Deploy the Functions
```bash
npx supabase functions deploy send-otp --project-ref uurkvfeguglvcjqgcway
npx supabase functions deploy verify-otp --project-ref uurkvfeguglvcjqgcway
```

Once deployed, your entire application is **100% Serverless** with zero backend servers to run or pay for!
