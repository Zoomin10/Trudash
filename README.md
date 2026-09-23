# TruDash

Trustee governance dashboard for **Wroughton & Wichelstowe FC (WWFC)**.

TruDash is a web-based governance cockpit for the club's trustees. It brings together controlled-document oversight, membership and subscription KPIs, and future governance modules while keeping SharePoint and TeamFeePay as authoritative source systems.

## Current status

TruDash is deployed to Railway with separate Development and Production environments.

Working areas:

- Microsoft Entra ID trustee sign-in
- Server-side authenticated sessions and protected API routes
- Microsoft Graph / SharePoint integration
- Document Control dashboard and metadata hygiene
- Members Overview
- Team Membership
- Payments and FYTD subscription collection
- Registration
- Membership Agreements
- Responsive desktop/mobile navigation and tables
- Main trustee Overview dashboard

Planned areas include Club Welfare, Finance, Risk, Decisions, Compliance and Strategy.

## Technology

**Frontend:** React, Vite, Lucide React, responsive CSS  
**Backend:** Node.js, Express, express-session, @azure/msal-node, xlsx  
**Services:** Microsoft Entra ID, Microsoft Graph, SharePoint, Railway, GitHub

PostgreSQL/Prisma is intended later for governance-native records such as risks, decisions, complaints, actions and finance data.

## Repository and deployment

Repository: `Zoomin10/Trudash`

Branches:

- `develop` — active development / Railway Development
- `main` — stable / Railway Production

Workflow:

`develop → Railway Development → test → PR/merge → main → Railway Production`

The project is tested through Railway environments rather than localhost.

## Authentication

Flow:

`Trustee → Entra sign-in → Express session → protected TruDash API → app-only Microsoft Graph identity → SharePoint`

Entra authenticates the trustee. The backend's separate application identity accesses SharePoint.

Important environment variables:

- `TENANT_ID`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `SESSION_SECRET`
- `APP_BASE_URL`
- `NODE_ENV`

Secrets must never be committed to Git.

## SharePoint document architecture

SharePoint remains the authoritative repository for controlled governance documents. TruDash reads document metadata through Microsoft Graph rather than duplicating document binaries.

Current areas include:

- Governance Documents
- Policy Documents
- Process Documents
- Finance Dcouments
- Statuatory Documents
- Digital Governance

The misspelled Finance/Statuatory folder names above are retained in backend paths because they are the actual SharePoint folder names.

### Controlled-document metadata

- Governance Category
- Document Owner
- Controlled Version
- Approved Date
- Next Review Date
- Document Status
- Review Requirement

Every controlled document requires Governance Category, Document Owner, Controlled Version and Document Status.

Approved, Superseded and Archived documents additionally require Approved Date. Next Review Date is required at those statuses unless Review Requirement is `Not Required`.

Draft and Under Review documents can legitimately omit approval/review dates.

## TeamFeePay reporting

TeamFeePay reports are held in SharePoint under `TeamFeePay Reports`. TruDash processes the workbooks server-side and exposes trustee-level aggregates rather than raw personal data.

### Season Report

The Season Report provides the current snapshot used by Members Overview, Teams, Payments and Registration.

When multiple files matching `Season_Report` exist, TruDash sorts them by SharePoint `lastModifiedDateTime` and uses the most recently modified report. Old Season Reports can therefore remain in SharePoint as historical snapshots.

Current worksheet: `2026-2027 Season`

### Monthly collection reports

Files containing `Monthly_By_Team_Report` are retained and aggregated to produce FYTD subscription collection metrics:

- collections due
- successful collections
- failed collections
- collection success rate
- gross amount paid by members
- amount due to WWFC
- club overdue amount
- monthly collection history

Monthly reports should be retained because each month contributes to the FYTD result.

Future scheduled collections are **not** treated as overdue debt.

### Agreements

The Agreements area reports aggregate signing/completion by controlled membership document. Its applicable population can differ from the Season Report population.

## Main Overview

Current headline KPIs:

1. Subscription Collection
2. Members
3. Document Control
4. Club Welfare

Subscription Collection uses monthly TeamFeePay collection reports. Members uses the latest Season Report. Document Control uses live SharePoint metadata. Club Welfare is not yet connected to a live data source.

## Members module

Tabs:

- Overview
- Teams
- Payments
- Registration
- Agreements

Payments includes current payment metrics plus FYTD Monthly Collection History.

Teams uses the latest Season Report and a compact responsive mobile layout.

## Backend responsibilities

`services/sharepointService.js` handles:

- Microsoft Graph access token acquisition
- Trustees site and Documents library access
- governance document/folder retrieval
- controlled-document metadata extraction
- governance summary calculations
- TeamFeePay report discovery/download
- newest Season Report selection
- membership/team/payment/registration aggregation
- agreement aggregation
- monthly subscription collection aggregation

## Security principles

- Never commit Microsoft client secrets or session secrets.
- Keep secrets in Railway/environment variables.
- Graph access is read-only and restricted to the Trustees SharePoint site.
- Protect trustee API routes with authenticated sessions.
- Do not expose raw TeamFeePay personal/sensitive data through frontend APIs.
- Keep detailed safeguarding information outside the general dashboard.
- Add explicit trustee authorization/role controls before widening access.
- Replace the default in-memory session store with production-grade persistent session storage as the platform matures.

## Commands

```bash
npm install
npm run build
npm start
npm run test:sharepoint
```

The Express backend serves the production Vite build from `frontend/dist`. API/authentication routes must remain before the SPA fallback.

## Design principle

TruDash is a **governance layer**, not a replacement for TeamFeePay, SharePoint or an accounting platform.

It should surface exceptions and trustee-level KPIs, preserve authoritative source systems, minimise personal-data storage, and make governance-control failures visible.

## Near-term roadmap

- Club Welfare
- Finance Overview
- Risk Register
- Trustee decisions/actions
- Compliance calendar
- Conflicts register
- Grants
- Strategy / benefits tracking
- PostgreSQL/Prisma governance data
- stronger authorization
- production-grade session storage
- Trustee Governance Pack generation

---

**Organisation:** Wroughton & Wichelstowe FC  
**Updated:** 23 September 2026
