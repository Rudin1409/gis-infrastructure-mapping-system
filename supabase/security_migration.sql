-- Apply to the primary database before activating the secured application.
-- The app uses server-side credentials; browsers must not access these tables.
BEGIN;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_label TEXT;

CREATE TABLE IF NOT EXISTS public.auth_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON public.auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON public.auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    key_hash TEXT PRIMARY KEY,
    hits INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry ON public.auth_rate_limits(expires_at);

CREATE OR REPLACE FUNCTION public.consume_auth_limit(p_key TEXT, p_expires TIMESTAMPTZ, p_limit INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_hits INTEGER;
BEGIN
    DELETE FROM public.auth_rate_limits WHERE expires_at < NOW();
    INSERT INTO public.auth_rate_limits(key_hash, hits, expires_at)
    VALUES (p_key, 1, p_expires)
    ON CONFLICT (key_hash) DO UPDATE SET hits = LEAST(public.auth_rate_limits.hits + 1, p_limit + 1)
    RETURNING hits INTO v_hits;
    RETURN v_hits <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_auth_limit(TEXT, TIMESTAMPTZ, INTEGER) FROM PUBLIC;

DO $$
DECLARE table_name TEXT; policy_name TEXT; role_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['poles','providers','segments','users','subdistricts','surveyor_locations','auth_sessions','auth_rate_limits'] LOOP
        IF to_regclass('public.' || table_name) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        FOR policy_name IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', policy_name, table_name);
        END LOOP;
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', table_name);
        FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
                EXECUTE format('REVOKE ALL ON public.%I FROM %I', table_name, role_name);
            END IF;
        END LOOP;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', table_name);
        END IF;
        -- On a standalone VPS the migration must run as the application's table
        -- owner, or privileges/policies for its dedicated server role must be set
        -- explicitly by the DBA. Never create a new public allow-all policy.
    END LOOP;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION public.consume_auth_limit(TEXT, TIMESTAMPTZ, INTEGER) TO service_role;
    END IF;
END;
$$;
COMMIT;
