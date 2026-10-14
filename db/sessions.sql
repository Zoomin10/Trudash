CREATE SCHEMA IF NOT EXISTS trudash_auth;
CREATE TABLE IF NOT EXISTS trudash_auth.sessions (
 sid varchar PRIMARY KEY,
 sess json NOT NULL,
 expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expire_idx ON trudash_auth.sessions(expire);
CREATE INDEX IF NOT EXISTS sessions_username_idx ON trudash_auth.sessions(lower(sess->'user'->>'username'));
CREATE TABLE IF NOT EXISTS trudash_auth.revocations (
 username text PRIMARY KEY,
 epoch bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS trudash_auth.session_audit (
 id bigserial PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actor text NOT NULL,
 target text NOT NULL,
 action text NOT NULL,
 session_count integer NOT NULL
);
CREATE INDEX IF NOT EXISTS session_audit_created_idx ON trudash_auth.session_audit(created_at);
