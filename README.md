# Medical declarations and restricted full CSV export

This update preserves the public registration form, its medical/allergy fields and existing database values. It removes those declarations from the member profile in both TruDash and the standalone TCM administration screen. Ordinary member JSON uses an explicit field list; cancellation and payment-setup JSON are filtered too. Authorised full CSV reports still contain medical declarations.

## Configuration

Add this variable to the TruDash backend service, separately in Development and Production:

TRUDASH_FULL_CSV_EXPORT_EMAILS=approved-person@wwfc.org.uk,another-approved-person@wwfc.org.uk

Use actual approved Microsoft login usernames. Named users must ALSO have membership-pilot administrator access through MEMBERSHIP_PILOT_ADMIN_EMAILS. Domain-only entries do not grant full CSV access. An absent/empty export list denies everyone. The finance, welfare, report-link and volunteer Super Admin lists do not confer this export permission. No new secret or environment variable is required in TCM.

The bridge signs the export permission and the TCM backend verifies it. Direct requests, browser-supplied identity headers and the legacy shared-password admin cookie cannot grant full CSV access. Legacy-password users may still view the non-medical admin directory where that login is enabled, but must use an authorised Microsoft account through TruDash to export.

## Deploy in this order

1. Copy TotalClubManagement files to that repository and TruDash files to the TruDash repository at matching paths. These are selected files, not complete repositories. Preserve later changes if your branch differs. Alternative patch files are provided; use either patch application or file copying, not both.
2. In TCM commit BOTH backend/prisma/schema.prisma and backend/prisma/migrations/20261014102500_add_report_export_audit/migration.sql. The migration adds only ReportExportAudit; it does not delete or alter member medical declarations.
3. Deploy TCM backend first. Run the usual Prisma client generation during build and npx prisma migrate deploy as the Railway pre-deploy command. Do not use migrate dev or reset against Production. Until the bridge update is deployed, full export is deliberately denied because old assertions lack the permission.
4. Set the new TruDash variable and deploy TruDash. Deploy the TCM frontend so its old medical profile is also removed. No new packages are required.
5. Fully refresh both apps or sign out and back in to discard already-loaded data. Test Development before repeating these steps in Production.

## What to verify

- Submit a test registration with synthetic medical and allergy values. Confirm they remain in the database and Stripe setup continues as before.
- For a pilot administrator outside the export list: the member tabs contain no medical section; there is no full-export button. Inspect /api/membership-pilot/members JSON and direct TCM /api/admin/registrations JSON where authorised: neither should contain medicalInfo or allergies. Payment cancellation/setup responses must also omit those fields.
- For an approved exporter who is also a pilot administrator: the button is labelled Full CSV (includes medical), explains the sensitive contents and asks for confirmation. The file includes declarations. Membership-pilot access alone must not grant download rights.
- Directly requesting registrations.csv without export permission returns 403 at the bridge or TCM backend. Unauthenticated access remains 401. Setting @wwfc.org.uk alone as an export entry grants no access.
- ReportExportAudit stores actor, timestamp, report type and row count. It stores no CSV, player identifiers or medical values. A row records an authorised export generated and released for sending; it cannot prove the user saved the file. If the audit write fails, the CSV is not released.

## Verification and limits

Sixteen local tests passed across the two repositories, including HTTP tests with signed bridge assertions, ordinary versus export access, JSON filtering, retained CSV declarations and audit failure. Both frontend production builds passed. Prisma format, schema validation, client generation and migration diff passed; the generated diff matches the additive migration. No live database migration, Microsoft login or Railway deployment was performed here.

This is the first restricted export, not the complete Reports Centre. Separate finance, membership and squad reports can follow with their own permissions. Agree retention for downloaded files and export audit metadata; restrict database access to the audit records. Existing downloaded files and exports cannot be recalled by this update. The browser field filtering does not anonymise other member/contact information, and full pilot administrators still see those ordinary registration details.

Bases: TruDash main ec77b04e317ba91e630e742f9f32fece83ab3b6c and TCM main 50848afe2d5e9f64a74bcde305573a87d166ba61, reviewed 14 October 2026. Earlier sign-in, aggregate-response and finance restrictions are preserved.
