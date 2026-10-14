# Overdue payment access correction

Apply this update to the TruDash repository that already has the corrected phase 1 package. It preserves the nonce sign-in correction. Copy the supplied files to their matching paths, commit and deploy Development first, then Production after verification. No TCM changes, database migration or new dependencies are required.

In the TruDash backend Railway variables, add:

TRUDASH_FINANCE_ADMIN_EMAILS=approved-finance-person@wwfc.org.uk,another-approved-person@wwfc.org.uk

Replace the example addresses with approved individual Microsoft login usernames. Domain-only entries do not grant access. This setting is independent of MEMBERSHIP_PILOT_ADMIN_EMAILS and TRUDASH_REPORT_ADMIN_EMAILS; being in those lists does not grant personal arrears access. With the new setting absent or empty, everyone receives totals only. Add your own login if you are authorised to see the overdue names. Do not add magic@wwfc.org.uk if it should remain a summary-only account.

The backend excludes overdueMembers entirely for ordinary users. It uses explicit permitted fields for both top-level and monthly totals. Named finance users receive an explicitly selected overdue-member list. The UI disables the pop-out for ordinary users and displays an access-restriction message. Removing the button alone would not protect Network responses; both changes are included.

After deployment, reload TruDash fully or sign out and back in to discard previously loaded browser data. Test magic@wwfc.org.uk: totals should remain but no overdue pop-out is available. In browser Network, inspect /api/members/collections: there must be no overdueMembers property, member names, teams or individual debt entries. Test an explicitly listed finance user: the pop-out should still work. A request without a session must return 401. Changing variables requires the updated backend deployment/restart.

Verification: ten local tests passed, including an HTTP test of the actual server route for ordinary, named finance, domain-only and unauthenticated users. The Vite frontend production build and server syntax check passed. Live Entra/Railway access was not used. Wider role segregation and small-group disclosure controls remain separate work; this patch fixes the personal arrears disclosure.
