# Trudash

**Trudash** is the trustee governance dashboard for **Wroughton & Wichelstowe FC (WWFC)**.

It is designed as a governance cockpit for trustees rather than a general club-management platform. The application brings together controlled documentation and, over time, finance, safeguarding oversight, complaints, risk, compliance, governance actions and other trustee-level information.

## Current Status

Trudash is deployed successfully to Railway.

The current production deployment includes:

- React/Vite frontend
- Node.js/Express backend
- Microsoft Entra application authentication for server-to-server access
- Microsoft Graph integration
- Read-only access to the WWFC Trustees SharePoint site
- Six live Documentation registers
- Automatic deployment from the GitHub `main` branch via Railway

The React frontend and Express API are served by the same Railway service.

> **Important:** end-user authentication is not yet implemented. The next priority is to protect the dashboard and API with trustee sign-in before adding more sensitive governance data or exposing the custom domain.

## Architecture

```text
Trustee browser
      |
      v
Railway / Express
   |          |
   |          +--> React production build
   |
   +--> /api/*
          |
          v
     Microsoft Entra
          |
          v
     Microsoft Graph
          |
          v
WWFC Trustees SharePoint
```

SharePoint remains the authoritative repository for controlled documents. Trudash reads document metadata through Microsoft Graph rather than duplicating document binaries into its own database.

A PostgreSQL database is planned later for governance-native data such as complaints, decisions, risks, finance, compliance and KPIs.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Oxlint

### Backend
- Node.js
- Express 5
- `@azure/msal-node`
- Microsoft Graph

### Hosting and Source Control
- Railway
- GitHub private repository: `Zoomin10/Trudash`
- Production branch: `main`
- Development branch: `develop`

## Repository Structure

```text
Trudash/
├── frontend/
│   ├── public/
│   │   └── images/
│   ├── src/
│   │   └── components/
│   │       └── DocumentRegister.jsx
│   └── dist/                 # generated production build; gitignored
├── services/
│   └── sharepointService.js
├── graph-test.js
├── server.js
├── package.json
├── package-lock.json
├── .env                      # local secrets; gitignored
└── .gitignore
```

## Local Development

### Prerequisites

- Node.js
- npm
- Access to the required WWFC Entra application credentials

### Environment Variables

Create a root `.env` file containing:

```env
TENANT_ID=<tenant-id>
CLIENT_ID=<client-id>
CLIENT_SECRET=<client-secret>
```

Never commit `.env` or any client secret to Git.

### Backend

From the repository root:

```powershell
npm install
npm start
```

The Express backend runs locally on:

```text
http://localhost:3001
```

Health check:

```text
http://localhost:3001/api/health
```

Expected response:

```json
{"status":"ok","application":"Trudash"}
```

### Frontend Development

Run the Vite frontend from the `frontend` directory using its normal npm development command. Vite proxies `/api` requests to the Express backend on port 3001.

### Production Build Test

From the repository root:

```powershell
npm run build
npm start
```

Then open:

```text
http://localhost:3001
```

This tests the production architecture locally: Express serves both the compiled React application and the API.

The root build script is:

```json
"build": "npm --prefix frontend install && npm --prefix frontend run build"
```

The generated `frontend/dist/` directory is intentionally gitignored.

## API

### Health

```text
GET /api/health
```

### Generic Documentation API

```text
GET /api/documentation/:category
```

Supported categories:

| API category | SharePoint area |
| --- | --- |
| `policies` | Policy Documents |
| `governance` | Governance Documents |
| `process` | Process Documents |
| `statutory` | Statutory Documents |
| `finance` | Finance Documents |
| `digital` | Digital Governance |

Example:

```text
GET /api/documentation/policies
```

A category response contains the category name, total document count, metadata-complete count, incomplete count and document metadata.

Legacy policy/governance-specific API routes currently remain in `server.js`; the generic Documentation API is the preferred architecture.

## SharePoint Integration

Trudash reads from the WWFC Trustees SharePoint site using Microsoft Graph.

The Graph application uses **Sites.Selected** application permission and has read-only access to the Trustees site.

Controlled-document metadata currently includes:

- Governance Category
- Document Owner
- Controlled Version
- Approved Date
- Next Review Date
- Document Status

Trudash also calculates whether metadata is complete and identifies missing governance fields.

Missing metadata is intentionally surfaced as a governance-health issue rather than silently filled by the application.

## Documentation Module

The live Documentation area contains six tabs:

- Policy Documents
- Governance Documents
- Process Documents
- Statutory Documents
- Finance Documents
- Digital Governance

All six use the reusable `DocumentRegister` React component and the generic Documentation API.

The register displays:

- filename and SharePoint link
- controlled version
- document owner
- document status
- next review date
- governance metadata health

## Git Workflow

Normal development workflow:

```text
local development
      |
      v
   develop
      |
      v
GitHub Pull Request
      |
      v
     main
      |
      v
Railway automatic deployment
```

Do feature work on `develop`.

Typical flow:

```powershell
git checkout develop
git pull
# make and test changes
git add .
git commit -m "Description of change"
git push
```

Create a pull request from `develop` to `main`. Merge only after the change has been tested.

Railway production deploys from `main`.

## Railway

Production requires these Railway environment variables:

```text
TENANT_ID
CLIENT_ID
CLIENT_SECRET
NODE_ENV=production
```

The client secret must remain in Railway's environment configuration and must never be committed to Git or exposed to the browser.

Railway successfully serves:

- the React application at `/`
- the Express API at `/api/*`
- live SharePoint-backed Documentation data

## Security

Current security design:

- SharePoint access is server-side only.
- The Graph application has read-only access to the Trustees SharePoint site.
- Secrets are stored in `.env` locally and Railway Variables in production.
- `.env` is gitignored.
- SharePoint document binaries are not duplicated into Trudash.

### Next security milestone

Add trustee user authentication through Microsoft Entra and protect both:

- dashboard routes
- API routes

This is separate from the existing application authentication used by the backend to call Microsoft Graph.

Future security work should also consider:

- trustee role-based access control
- MFA through Microsoft identity policies
- audit logging
- backup/recovery arrangements
- replacing the client secret with a stronger production credential approach where practical

## Planned Modules

The sidebar currently provides the wider Trudash structure:

- Overview
- Documentation
- Finance
- Safeguarding
- Complaints
- Risk & Compliance
- Governance
- Organisation

Documentation is the first live integrated module.

The next planned sequence is:

1. Trustee authentication and API protection
2. Custom domain: `governance.wwfc.org.uk`
3. Finance module
4. Further governance-native modules and PostgreSQL persistence
5. Trustee Governance Pack generation

## Known Follow-up

The Overview Documentation attention count currently reflects policy-document metadata rather than an aggregate of all six documentation categories.

A future backend summary endpoint should calculate the live combined documentation health across all categories.

## Design Principles

- Trudash is a trustee governance tool, not a replacement for the club's operational management platforms.
- SharePoint is the source of truth for controlled documents.
- Governance gaps should be visible rather than hidden.
- Sensitive safeguarding information on the main dashboard should be aggregate/oversight information only.
- Access should follow least-privilege principles.
- Production changes should move through `develop` → pull request → `main`.
