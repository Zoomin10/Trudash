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
