# TruDash privacy controls phase 1

Based on production main commit 35c8939e08edb6c6c681a907312c62ffff8f0c76, reviewed 14 October 2026. This is a reviewed code change for Development deployment first; it is not a GDPR compliance certification. No database migration or new dependency is needed. No production settings were read or changed.

## Changes

- Microsoft sign-in uses a session-bound, ten-minute state and nonce, consumes the attempt before code redemption, and regenerates the authenticated session ID. Logs no longer print the successful user's email.
- API responses use Cache-Control no-store.
- Agreement analytics use an explicit response allow-list, excluding pending members' names, team memberships and source filenames. The UI directs individual follow-up to TeamFeePay.
- Complaint records (case reference, owner, review and status) are returned only to named welfare users. Other authenticated users receive the open count and a restricted-details indicator.
- Direct TFP report listings and their source links require named report administrators.
- Membership pilot access accepts explicit email addresses only. A domain-only entry no longer authorises member, volunteer, invoice or CSV access. This intentionally restricts the existing broad pilot rather than pretending a member-directory response is anonymous.

## TruDash Railway configuration

Set these in Development before testing, then independently in Production when releasing:

MEMBERSHIP_PILOT_ADMIN_EMAILS=approved-person@wwfc.org.uk,another-approved-person@wwfc.org.uk
TRUDASH_WELFARE_ADMIN_EMAILS=approved-welfare-person@wwfc.org.uk
TRUDASH_REPORT_ADMIN_EMAILS=approved-report-person@wwfc.org.uk

The example addresses are placeholders. Use actual Microsoft login usernames approved for each responsibility, not display names, role titles, or @wwfc.org.uk. An empty welfare or report setting denies detailed access. Leaving MEMBERSHIP_PILOT_ADMIN_EMAILS as @wwfc.org.uk hides the pilot and volunteer tabs for everyone. Named pilot administrators still have broad access to the existing personal member and volunteer records; give that setting only to people authorised for that scope. Super Admin bootstrap emails must also be named in the pilot list. Keep all other existing integration settings unchanged.

On TCM, confirm TRUDASH_ONLY_ADMIN_AUTH=true if Microsoft sign-in is intended to be the only administrative login. Otherwise the separate shared-password login remains usable; this patch does not remove it.

## Apply and verify

Copy the supplied application files over the matching paths in the TruDash repository, or apply the patch at the repository root with git apply --check then git apply. Do not use both methods. Keep tests in the repository's tests folder. Preserve later edits if main has changed since the base commit.

Run node --test tests/*.test.cjs and npm --prefix frontend run build after installing locked dependencies with npm ci and npm --prefix frontend ci. Seven tests passed and the Vite production build passed in this review. No live Entra, Railway, SharePoint or Stripe actions were performed.

Deploy Development. Start sign-in afresh after deployment. Check successful Microsoft sign-in and logout; reject an invalid/expired callback; check a named pilot administrator, a normal WWFC user and a welfare user. Inspect Network JSON to confirm agreement names/member details are absent, complaint details are restricted and source reports return 403 unless explicitly approved. A normal user should retain ordinary aggregate dashboards. Check the named pilot administrator can still use existing member/volunteer tools. Test Production only after those checks pass. To roll back, revert this patch and restore the previous environment values, recognising that doing so restores the older broad-access behaviour.

## Remaining work identified in current main

1. Split member finance, medical, volunteer administration and coach/team access at both the TruDash bridge and TCM backend. The existing volunteer None/Admin/Super Admin labels do not authorise ordinary directory access; this phase restricts that directory to the named pilot list but does not redefine the labels. Do not add ordinary coaches to the broad list to give them only squad medical access.
2. Review Microsoft Entra tenant, app assignment, MFA/Conditional Access and Graph application permissions. SharePoint data is fetched using the app's identity, not each viewer's own SharePoint permissions. Browser authentication alone cannot establish equivalent SharePoint access. No tenant configuration was inspected.
3. Replace express-session's default in-memory store for production and establish session revocation and appropriate expiry. Add durable access/audit records with a justified retention schedule.
4. Assess small-cohort and combined-report identification risk before distributing gender/team/payment/agreement/complaint aggregates widely. Counts are not automatically anonymous; this patch does not certify them as anonymous or suppress small cells.
5. Set and implement export, source-record, volunteer acceptance, audit and backup retention; rights-request and incident procedures; supplier contracts and actual Railway hosting/transfer arrangements.
6. Review public signup consent, test data, rate limiting, application/error logging and third-party embeds. The main membership directory still includes health and contact data for authorised full administrators.

The updated policy documents describe the intended controls; code, tenant settings and operational procedures must all match before production approval.
