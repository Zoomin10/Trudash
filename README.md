<<<<<<< HEAD
# PostgreSQL sessions and session revocation

This package changes TruDash only. It replaces the in-memory login store with PostgreSQL, enforces idle and maximum lifetimes in the backend, and adds a Super Admin session-revocation button. Existing application permissions remain in TCM and are still checked on each protected request. No TCM change or Prisma migration is included.

## Required Railway setup before deployment

1. In the TruDash Railway project add a PostgreSQL service for session data, or use a specifically approved existing PostgreSQL database reachable by TruDash. A dedicated database is preferable. Development and Production must use separate session databases, with separate secrets; do not share their session state.
2. On the TruDash application backend add SESSION_DATABASE_URL referencing that service. If the database service is named Postgres, Railway's reference is:

SESSION_DATABASE_URL=${{Postgres.DATABASE_URL}}

Use the actual service name. This is a new TruDash variable, not TCM's DATABASE_URL. A Railway internal database URL works only within the appropriate Railway private network/environment; local testing needs the approved external/proxy connection string. Do not paste credentials into source control, screenshots or messages.
3. Keep SESSION_SECRET stable and secret, at least 32 bytes long. All replicas of the same environment must use the same secret. Keep NODE_ENV=production and the correct APP_BASE_URL for deployed Railway environments, including Development if using HTTPS. Secure cookies depend on HTTPS and the existing trusted reverse-proxy arrangement.
4. Set the TruDash pre-deploy command to npm run sessions:setup, or add it to the existing pre-deploy workflow without dropping other checks. The command runs on the backend after dependencies are installed and creates the dedicated trudash_auth schema/tables. It is repeatable. It does not modify TCM tables or move application permissions.

The connection user needs permission to create the schema/tables on initial setup and subsequently read/write them. Review least-privilege database credentials for production. TLS settings come from the PostgreSQL connection configuration; the code does not disable certificate validation.

## Files and deployment

Copy the TruDash files to their matching repository paths, or apply the included patch after git apply --check. Do not do both. Include package.json AND package-lock.json, the db/sessions.sql file, setup script and new services/routes. Preserve subsequent branch edits if the base commit differs.

Run npm ci at the TruDash repository root to install pg and connect-pg-simple. The test-only PGlite development dependency exercises PostgreSQL SQL locally; it is not the production database or store. Install frontend dependencies as usual and run npm --prefix frontend run build. Existing start remains npm start; build commands remain unchanged. A local setup command is npm run sessions:setup with SESSION_DATABASE_URL already supplied for the intended database.

Commit/push/merge to the branch Railway deploys. Configure the session database and pre-deploy command first, then deploy Development. The app refuses to start if the connection/secret is missing or the session tables are unavailable; there is no silent MemoryStore fallback. Initial setup should run before the new server starts.

All existing logins must sign in again once: the cookie is renamed trudash.sid and old memory sessions are not imported. Stable database-backed sessions can survive subsequent redeployments if the secret/database are unchanged and the time limits have not expired. A new sign-in attempt interrupted by a deployment may need restarting; Microsoft token/code handling is otherwise unchanged.

## Defaults and optional settings

| Variable | Default | Allowed values |
| --- | --- | --- |
| SESSION_IDLE_MINUTES | 15 | Integer 1 to 120 |
| SESSION_MAX_HOURS | 8 | Integer 1 to 24 |
| SESSION_AUDIT_RETENTION_DAYS | 90 | Integer 1 to 365 |

Approve the audit retention period operationally and align the club retention schedule. Ninety days is an implementation default, not a statutory requirement. Permissions do not become more permissive as a session ages.

Idle activity is pointer presses, key presses, scrolling or touch interaction in the visible TruDash tab. Those interactions can send a same-origin activity POST, at most once per 30 seconds. Dashboard polling and an open unattended tab do not extend the idle lifetime. The eight-hour maximum is never extended by activity. The backend enforces these limits even if the browser/client timers are bypassed.

The cookie is HttpOnly, SameSite=Lax and Secure in production, with a host-only scope and path /. Sessions contain the minimal existing sign-in identity and session/login metadata, not Microsoft access tokens or medical records. Do not expose session rows, cookies or IDs to ordinary users or logs. The database also needs restricted administrative access and backup/transfer review.

## Revoking a user's sessions

As an active authorised Super Admin (including the existing recovery list), open Club volunteers, select a volunteer and click Revoke TruDash sessions. Confirm the email shown. All their stored current TruDash sessions are invalidated across instances, with an audit event. Revoking your own sessions signs you out too.

This does not disable the Microsoft account, remove application permissions, sign the user out of Microsoft 365 or block future sign-in. Remove/deactivate saved permissions and, where appropriate, remove recovery access or act in Microsoft Entra to prevent ongoing access. Already-running requests may finish; the next authenticated request must fail. Data already loaded or downloaded cannot be recalled.

Database revocation epochs prevent an old session being revived by a delayed in-flight save. If the revocation audit write fails, the revocation transaction rolls back and the endpoint reports failure. Successful messages mean invalidation was committed, not that a remote browser tab was closed. The audit count is the number of stored session rows deleted, not a count of browser windows/devices.

## Tables and automatic cleanup

- trudash_auth.sessions: server-side sessions. Expired rows are pruned at startup and approximately every 15 minutes while the app runs. Expired/revoked access is denied before pruning occurs.
- trudash_auth.revocations: per-user revocation epochs. Old markers are removed only after two days and with no unexpired matching session, beyond the permitted maximum session lifetime.
- trudash_auth.session_audit: timestamp, acting username, target username, action and deleted-row count. No cookie or session ID is recorded. Events older than the configured retention period are pruned on the same schedule. Backup retention requires separate controls.

Database outages return an unavailable response for session checks/storage; the application does not accept an unverifiable session. Cleanup resumes when database service recovers. Do not treat this as a replacement for backups, monitoring or the wider GDPR implementation.

## Development verification

1. Deploy after session table setup. Start a fresh Microsoft login as Chair and confirm ordinary pages, permissions, finance restrictions and CSV export still work. Existing cookies from before this update should not authenticate.
2. Open a separate incognito login as the test volunteer. As Chair, revoke their sessions. The next API request or user activity must require sign-in. Confirm Chair remains signed in. The test user can sign in again if still authorised.
3. In the session database, verify a session_audit event with actor/target/action. Do not copy session table contents into messages.
4. For a quick idle check in Development, temporarily set SESSION_IDLE_MINUTES=1, redeploy and sign in afresh. Leave the tab untouched for over a minute. Background polling must not keep it logged in; check /api/auth/me returns 401. Restore 15 afterward. Interactions must keep an otherwise valid session alive, but never beyond the configured maximum.
5. Sign in, redeploy the same app without changing secret/database, then request a protected page within its lifetime: the session should survive. If running two replicas, verify the same login works regardless of which serves it.
6. A normal account calling POST /api/admin/sessions/revoke directly must receive 403. An unauthenticated account receives 401; cross-origin or unconfirmed requests are denied. Live Microsoft sign-in and Railway behaviour still need these checks after deployment.

Nineteen local tests passed. They use the actual PostgreSQL session store against an embedded PostgreSQL SQL engine, real HTTP cookies and two app instances, including expiry, stale-session revival, revocation/audit rollback, cleanup, HTTPS cookie flags and earlier sign-in/finance regressions. This verifies SQL/store logic, not Railway network/TLS or live Microsoft sign-in. Locked npm ci and the Vite production build passed. No live database was configured or changed here.

Run node --test tests/*.test.cjs after npm ci (including development dependencies). To omit test dependencies in production you may use npm ci --omit=dev at the backend root; frontend build dependencies still need their normal installation.

For rollback restore the previous code and package files together. Rolling back returns to the prior session behaviour and signs users out again; it does not require dropping the new schema. Do not drop session/audit tables to troubleshoot a login error. Check the pre-deploy result, variable/environment selection and backend logs first.

Base: TruDash main 2d5f2e6, reviewed 14 October 2026. No hosting resources or deployments were created by this package.
=======
# Application permissions managed in volunteer profiles

This update moves normal application access out of Railway email lists and into TCM volunteer records. Club roles remain separate. Super Admins manage permission checkboxes in Club volunteers. Nothing has been deployed or imported by this package.

## Permissions

| Checkbox | Access |
| --- | --- |
| Manage member registrations and payments | Membership pilot directory and existing billing management |
| Manage volunteer records | Volunteer directory and routine administration |
| View named payment and arrears details | Personal overdue-payment pop-out |
| View individual welfare and complaint records | Restricted complaint details |
| View source report links | Original TeamFeePay report listings/links |
| Download full member CSV including medical declarations | Sensitive CSV, only when membership management is also granted |

All saved permissions require the volunteer to be Active with current required agreements accepted. A title such as Treasurer, Trustee or Coach never grants access by itself. Saved Super Admin enables volunteer permission administration, not automatic access to finance, member, medical or welfare records. It does include volunteer management so the person can assign permissions.

The permission-administration level dropdown retains legacy Admin values for compatibility, but standard users get access from the explicit checkboxes. The migration copies existing Admin/Super Admin volunteer access into the Manage volunteer records checkbox. Choosing Standard user does not clear checkboxes: revoke permissions explicitly or set Inactive. An Inactive record has no saved application access.

Only Super Admins can grant/revoke permissions or change Super Admin level. A standard volunteer administrator cannot edit or issue acceptance links for records that already hold application permissions; this prevents reactivating another privileged account or changing its eligibility. Successful changes are recorded in VolunteerChange with before/after permission values.

## Keep one recovery list

Keep VOLUNTEER_SUPER_ADMIN_EMAILS on the TruDash backend with a small set of approved individual Microsoft login emails. It grants recovery volunteer Super Admin access even without a valid active volunteer record. It does not automatically grant finance, welfare or full CSV access. A recovery user who also has a valid volunteer record can use the ordinary permissions assigned to that record.

To revoke a recovery user's access, also remove them from this variable. Removing their database permissions alone does not revoke recovery rights. No domain wildcards are accepted. Other normal access is now determined by database permissions, checked on each request. The old membership, finance, welfare, source-report and full-CSV email lists no longer grant access, even if left configured.

The legacy TCM shared-password admin login is retired in this update because it cannot identify a named user for permission checks. Administrative access must use Microsoft sign-in through TruDash. Public member/volunteer signup and Stripe processing remain unchanged.

## Prepare before deploying

1. Confirm your actual Microsoft login is in VOLUNTEER_SUPER_ADMIN_EMAILS in the environment being updated. Keep the existing shared secret, TCM URLs and MEMBERSHIP_PILOT_ENABLED=true. The existing feature flag still enables the integration and its permission service.
2. Review and record the current named users in MEMBERSHIP_PILOT_ADMIN_EMAILS, TRUDASH_FINANCE_ADMIN_EMAILS, TRUDASH_WELFARE_ADMIN_EMAILS, TRUDASH_REPORT_ADMIN_EMAILS and TRUDASH_FULL_CSV_EXPORT_EMAILS. Do not delete them until you have reviewed the transfers. They stop authorising as soon as this update is deployed.
3. Plan a short deployment/configuration window. Existing member/finance/report users may temporarily lose detailed access until their database grants are transferred. Volunteer Super Admin recovery remains available after both services are updated. Ordinary accounts do not receive default elevated permissions.

## Deploy Development first

Copy the files under TruDash and TotalClubManagement into their matching repositories; these are selected files, not whole repositories. Alternatively apply the matching patches, not both methods. Preserve later edits if the base commits differ. Commit and push, then merge into the branch Railway deploys.

Deploy TCM backend first, including BOTH the Prisma schema and backend/prisma/migrations/20261014121000_add_application_permissions/migration.sql. Generate Prisma client in the usual build and run npx prisma migrate deploy as the pre-deploy command. The migration adds a non-null text array and copies existing volunteer Admin/Super Admin directory access only. It does not grant member, finance, welfare, report or full CSV permissions. Do not use migrate dev or reset against Production.

Deploy TruDash promptly after TCM. No new dependencies or TCM frontend changes are required. Until both sides are updated, integrated permission checks may deny requests. The migration does not change stored medical declarations or billing records.

Sign in with the recovery Super Admin and open Club volunteers. For a few users, the simplest transfer is manual: open each existing volunteer profile, ensure Active and required agreements, select the reviewed application permissions and save. Your own recovery account needs a valid volunteer record and specific checkboxes for member/finance/report access. Register and approve it if it does not exist; recovery access alone does not fabricate a volunteer record.

Repeat in Production only after Development verification. Existing ordinary-user summary dashboards remain available when the permission service is healthy; no detailed privileges are required for those summaries. A permission-service outage denies protected/detail responses rather than guessing access. Current data already loaded in a browser cannot be recalled; menus refresh on focus/within a minute and protected requests recheck immediately.

## Optional reviewed import for more users

This is optional; manual Super Admin assignment is sufficient. Never commit the manifest or database credentials. Treat email-to-permission mapping files as restricted administrative records and remove them after the approved task/retention period.

In a trusted local TruDash checkout, supply only the old role-list values in your local environment (or approved local .env), then run:

node scripts/export-legacy-permissions.cjs > reviewed-permissions.json

The script outputs only email/permission mappings, not secrets. It does not read Railway automatically. It rejects domain entries: replace them with reviewed named users. Inspect the resulting grants yourself. The mapping is membership list to MEMBERS_MANAGE, finance to FINANCE_DETAILS, welfare to WELFARE_DETAILS, reports to SOURCE_REPORTS, and full CSV to FULL_CSV_EXPORT. No Super Admin is imported.

After the schema migration, from the TCM backend folder using the intended environment's DATABASE_URL, run a read-only check:

node scripts/import-application-permissions.cjs /absolute/path/reviewed-permissions.json

It lists READY/BLOCKED users. Missing records, Inactive/Awaiting review users or missing current agreements are blocked; it never creates placeholder volunteers or invents acceptance. Resolve those records through the normal process, or remove entries from the reviewed manifest. No writes happen without --apply, and any blocked entry prevents all application writes.

After reviewing the exact plan, apply explicitly:

node scripts/import-application-permissions.cjs /absolute/path/reviewed-permissions.json --apply

This adds reviewed grants to existing permissions in a transaction, rechecks eligibility, records PERMISSIONS_IMPORTED in VolunteerChange and is idempotent. It does not remove previous permissions or grant Super Admin. Confirm the target database before using --apply. The package has not run it against any database.

After successful manual transfer or import and live verification, remove the five obsolete normal-access email-list variables from TruDash. Keep VOLUNTEER_SUPER_ADMIN_EMAILS. Database/service configuration and secrets remain necessary as before.

## Verify

- Super Admin: assign/revoke permission checkboxes; inspect VolunteerChange.
- Membership-only: member directory works, no volunteer/finance/welfare/full CSV unless separately assigned.
- Finance-only: named arrears work, member directory and full CSV remain denied.
- Volunteer-only: directory works, permission edits and privileged-record edits denied.
- Full CSV alone: no member export without MEMBERS_MANAGE; both grants enable the audited export. Medical values remain absent from ordinary member JSON.
- Inactive, missing current agreements, or revoked permission: next protected request denied without logout.
- Leave an account in an old email variable with no database grants: access must stay denied.
- Recovery email: volunteer Super Admin works, but no implicit finance/CSV; removing database status does not revoke recovery rights until its recovery email is also removed.

Twenty-nine local tests passed across both repositories, including signed HTTP bridge/backend requests, finance/welfare/report endpoints, permission revocation/escalation checks, dry-run/import auditing and medical/export/sign-in regressions. Both frontend production builds passed. Prisma formatting, validation, generation and structural migration diff passed. The migration's legacy-role copy is an additional intentional data statement. No live database migration or Entra/Railway actions were performed.

Cross-repository tests assume sibling folders named TruDash and TotalClubManagement; override TCM_TEST_ROOT for another TCM location. Install existing locked dependencies, then run node --test tests/*.test.cjs in each repository. Build commands remain unchanged.

This implements application permissions; production session storage, wider access-log retention, supplier/tenant settings and the broader Reports Centre remain separate work. Bases: TruDash d84cbf2 and TotalClubManagement cef8ad6, reviewed 14 October 2026.
>>>>>>> 2d5f2e60984ec9d8869bc73c7e41732cc6062c00
