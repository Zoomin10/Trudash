# Season retention review report

This is the agreed first, read-only step. The club season ends on 31 May and starts on 1 June. A reduced non-renewing-member archive for twelve months after season-end is displayed as a proposal requiring approval, not a legal requirement or an instruction to delete.

## Behaviour

Membership pilot now offers Season retention review beside Refresh members for users who have BOTH active Super Admin authority and the Manage member registrations and payments permission. Recovery Super Admin alone does not automatically grant member access. Both the TruDash bridge and TCM backend enforce these requirements. No new permission or environment variable is added.

The report shows a minimal member name/team/reference record, original registration date, an inferred season, a proposed archive review date, and checks needed. It excludes medical declarations, allergies, DOBs, emergency contacts, addresses, emails, individual payment amounts and Stripe identifiers. Billing flags and open-invoice counts indicate separate review is needed, not authority to cancel or erase anything.

The database currently lacks confirmed season memberships, renewals, departure dates, archive start dates and retention holds. A season derived from createdAt cannot establish those facts. Every record is explicitly marked renewal status unconfirmed. The report labels are:

- Current inferred season: registration-date season has not ended.
- Confirm renewal or departure: inferred season ended, but proposed twelve-month period has not elapsed.
- Older registration needs review: more than twelve months after inferred season-end; still not deletion eligible.
- Check registration date: invalid or future registration date.

An October 2026 registration is inferred as 2026/27, ending 31 May 2027, with a proposed archive review date of 31 May 2028. Those are planning dates only. The report uses Europe/London dates, including daylight-saving boundaries. There may be no records needing review yet; that is expected if all registrations fall in the current inferred season.

No record is archived, updated, anonymised or deleted. No billing, invoice, agreement or medical information is changed. No scheduler, new archive store or automatic deletion endpoint exists. Financial, contractual, incident and safeguarding requirements, investigations and holds must be checked separately; routine medical declarations should not be kept in the eventual reduced membership archive merely because invoices are retained longer.

## Apply and deploy

Copy the selected files from each repository folder to the matching paths in TruDash and TotalClubManagement, or apply the matching patch from its repository root after git apply --check. Do not use both methods. Preserve later edits if the branches differ from the bases below.

Commit/push/merge to the branches Railway deploys. Deploy TCM backend first, then TruDash, Development before Production. There is no new database migration, package or environment variable for this report. Existing PostgreSQL sessions, application-permission checks and session setup command remain unchanged. The standalone TCM frontend has no changes.

## Open and test

1. As Chair, confirm your volunteer is Active with current agreements and has membership-management permission as well as saved or recovery Super Admin authority.
2. Open Membership pilot. Beside Refresh members, click Season retention review.
3. Confirm the May season boundary and registration-date inference notice are visible. Try the review-state and member/team search filters, then Back to members.
4. Inspect /api/membership-pilot/retention-review: it must contain no health/contact/DOB values, destructiveActionsEnabled must be false, and each deletionEligible must be false.
5. An ordinary member administrator must receive 403 for the same URL and have no review button. A Super Admin without membership-management permission must also be denied. Standard summary users remain blocked from this member endpoint.
6. Confirm public registration and ordinary member/billing tools still behave normally. The report makes no calls to Stripe and cannot cancel payment plans.

Eight new local tests passed: London May/June boundaries, the twelve-month proposal, future/old date safeguards, minimized responses, backend and bridge permission enforcement, and absence of destructive operations. The TruDash frontend production build and changed backend syntax checks passed. No live database or Railway deployment was touched here.

Run node --test tests/retentionAccess.test.cjs in TruDash and node --test tests/retentionReview.test.cjs in TCM after their existing locked dependencies are installed. No test-only package is needed for these tests.

## Next decision before real archiving

Agree the retention schedule and reduced archive fields; identify insurer/claims/financial requirements. Record actual season membership, renewal/departure and holds. Then add a separately authorised, auditable preview-and-approve archive process and later a deletion review. This report does not infer non-renewal from a cancelled Stripe subscription or automatically roll subscriptions into a new season.

Bases: TruDash dc8aff0 and TotalClubManagement 59027b6, reviewed 14 October 2026. It includes the previously deployed application-permission and PostgreSQL-session changes through those bases.
