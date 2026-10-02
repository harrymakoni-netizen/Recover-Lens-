CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar UNIQUE,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");

CREATE TABLE IF NOT EXISTS "recoverlens_user_roles" (
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK ("role" IN ('patient', 'caregiver', 'clinician', 'coach')),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "role")
);

CREATE TABLE IF NOT EXISTS "recoverlens_user_patient_access" (
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "patient_id" text NOT NULL REFERENCES "recoverlens_patients" ("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK ("role" IN ('patient', 'caregiver', 'clinician', 'coach')),
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "patient_id", "role")
);

CREATE TABLE IF NOT EXISTS "recoverlens_access_invitations" (
  "id" text PRIMARY KEY,
  "code_hash" text NOT NULL UNIQUE,
  "patient_id" text NOT NULL REFERENCES "recoverlens_patients" ("id") ON DELETE CASCADE,
  "role" text NOT NULL CHECK ("role" IN ('patient', 'caregiver', 'coach')),
  "created_by_user_id" text NOT NULL REFERENCES "users" ("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "used_by_user_id" text REFERENCES "users" ("id"),
  "used_at" timestamptz
);

-- Existing patients are intentionally not granted to arbitrary accounts here.
-- On sign-in, only identities in RECOVERLENS_CLINICIAN_EMAILS receive clinician
-- relationships for existing patients. Patients and caregivers use one-time invites.