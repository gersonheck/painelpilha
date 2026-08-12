BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), public_number integer NOT NULL UNIQUE CHECK (public_number BETWEEN 1 AND 99999),
  name text NOT NULL CHECK (length(trim(name)) >= 5), prefix varchar(5) NOT NULL CHECK (prefix ~ '^[A-Z]{5}$'), next_user_sequence integer NOT NULL DEFAULT 1 CHECK (next_user_sequence BETWEEN 1 AND 1000000), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prefix, public_number)
);
CREATE TABLE organization_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), user_serial varchar(18) NOT NULL,
  email_lookup_hash bytea NOT NULL, email_ciphertext bytea NOT NULL, name_ciphertext bytea NOT NULL, password_hash text,
  role text NOT NULL DEFAULT 'collaborator' CHECK (role IN ('organization-admin', 'collaborator')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')), activated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_serial), UNIQUE (organization_id, email_lookup_hash)
);
CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), user_id uuid NOT NULL REFERENCES organization_users(id),
  token_digest bytea NOT NULL UNIQUE CHECK (octet_length(token_digest) = 32),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'email-prepared', 'activated', 'revoked')),
  expires_at timestamptz NOT NULL, email_prepared_at timestamptz, activated_at timestamptz, revoked_at timestamptz,
  created_by uuid NOT NULL REFERENCES organization_users(id), created_at timestamptz NOT NULL DEFAULT now(), CHECK (expires_at > created_at)
);
CREATE UNIQUE INDEX one_open_invitation_per_user ON organization_invitations (user_id) WHERE status IN ('pending', 'email-prepared');
CREATE INDEX invitations_expiration_queue ON organization_invitations (expires_at) WHERE status IN ('pending', 'email-prepared');
CREATE FUNCTION audit_metadata_contains_sensitive_key(value jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $
  SELECT CASE jsonb_typeof(value)
    WHEN 'object' THEN EXISTS (
      SELECT 1 FROM jsonb_each(value) AS child(key, nested)
      WHERE lower(key) IN ('email', 'token', 'password', 'healthdata')
        OR audit_metadata_contains_sensitive_key(nested)
    )
    WHEN 'array' THEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(value) AS child(nested)
      WHERE audit_metadata_contains_sensitive_key(nested)
    )
    ELSE false
  END;
$;
CREATE TABLE organization_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), actor_id uuid REFERENCES organization_users(id),
  action text NOT NULL, target_type text NOT NULL, target_id uuid, occurred_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (NOT audit_metadata_contains_sensitive_key(metadata))
);
CREATE FUNCTION allocate_user_sequence(target_organization uuid) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE allocated integer;
BEGIN
  UPDATE organizations SET next_user_sequence = next_user_sequence + 1
   WHERE id = target_organization AND next_user_sequence <= 999999 RETURNING next_user_sequence - 1 INTO allocated;
  IF allocated IS NULL THEN RAISE EXCEPTION 'organization sequence unavailable'; END IF;
  RETURN allocated;
END;
$$;
COMMIT;
