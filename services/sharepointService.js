const msal = require("@azure/msal-node");
require("dotenv").config();
const XLSX = require("xlsx");

const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
};

const cca = new msal.ConfidentialClientApplication(msalConfig);


// --------------------------------------------------
// Authentication
// --------------------------------------------------

async function getAccessToken() {
  const tokenRequest = {
    scopes: ["https://graph.microsoft.com/.default"],
  };

  const authResult = await cca.acquireTokenByClientCredential(tokenRequest);

  if (!authResult || !authResult.accessToken) {
    throw new Error("Unable to obtain Microsoft Graph access token.");
  }

  return authResult.accessToken;
}


// --------------------------------------------------
// Trustees SharePoint site
// --------------------------------------------------

async function getTrusteesSite() {
  const accessToken = await getAccessToken();

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/sites/wandwfc.sharepoint.com:/sites/Trustees",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Unable to retrieve Trustees site: ${response.status}: ${error}`
    );
  }

  return await response.json();
}


// --------------------------------------------------
// Documents library
// --------------------------------------------------

async function getDocumentsLibrary() {
  const accessToken = await getAccessToken();
  const site = await getTrusteesSite();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${site.id}/drives`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Unable to retrieve document libraries: ${response.status}: ${error}`
    );
  }

  const drives = await response.json();

  const documentsDrive = drives.value.find(
    (drive) => drive.name === "Documents"
  );

  if (!documentsDrive) {
    throw new Error("Documents library not found.");
  }

  return documentsDrive;
}


// --------------------------------------------------
// Governance folder
// --------------------------------------------------

async function getGovernanceContents() {
  const accessToken = await getAccessToken();
  const documentsLibrary = await getDocumentsLibrary();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${documentsLibrary.id}/root:/Governance:/children`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Unable to retrieve Governance contents: ${response.status}: ${error}`
    );
  }

  const governance = await response.json();

  return governance.value;
}
async function getDocumentsFromGovernanceFolder(folderPath) {
  const accessToken = await getAccessToken();
  const documentsLibrary = await getDocumentsLibrary();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${documentsLibrary.id}/root:/Governance/${folderPath}:/children`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Unable to retrieve documents from ${folderPath}: ` +
      `${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  return data.value;
}

async function getPolicyDocuments() {
  const accessToken = await getAccessToken();
  const documentsLibrary = await getDocumentsLibrary();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${documentsLibrary.id}/root:/Governance/Policy Documents/Doc versions:/children`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Unable to retrieve Policy documents: ${response.status}: ${error}`
    );
  }

  const policies = await response.json();

  return policies.value;
}
async function getSharePointUser(lookupId) {
  if (!lookupId) {
    return null;
  }

  const accessToken = await getAccessToken();
  const site = await getTrusteesSite();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${site.id}/lists/User%20Information%20List/items/${lookupId}?$expand=fields`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Unable to resolve SharePoint user ${lookupId}: ${response.status}: ${error}`
    );
  }

  const user = await response.json();

  return {
    id: lookupId,
    displayName: user.fields?.Title || null,
    firstName: user.fields?.FirstName || null,
    lastName: user.fields?.LastName || null,
    email: user.fields?.EMail || null,
  };
}
async function getDocumentMetadata(document) {
  const accessToken = await getAccessToken();
  const documentsLibrary = await getDocumentsLibrary();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${documentsLibrary.id}/items/${document.id}/listItem?$expand=fields`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Unable to retrieve document metadata: ${response.status}: ${error}`
    );
  }

  const listItem = await response.json();
  const fields = listItem.fields;

const documentOwner = await getSharePointUser(
  fields.DocumentOwnerLookupId
);

const sharePointUrl = document.webUrl || null;
const missingFields = [];

// Core metadata required for every controlled document
if (!fields.GovernanceCategory?.[0]) {
  missingFields.push("Governance Category");
}

if (!fields.DocumentOwnerLookupId) {
  missingFields.push("Document Owner");
}

if (!fields.ControlledVersion) {
  missingFields.push("Controlled Version");
}

if (!fields.DocumentStatus) {
  missingFields.push("Document Status");
}

// Approval metadata is only required once the document
// has completed the draft/review stage.
const requiresApprovalMetadata = [
  "Approved",
  "Superseded",
  "Archived",
].includes(fields.DocumentStatus);

if (requiresApprovalMetadata) {
  if (!fields.ApprovedDate) {
    missingFields.push("Approved Date");
  }

  const reviewNotRequired =
    fields.ReviewRequirement === "Not Required";

  if (!reviewNotRequired && !fields.NextReviewDate) {
    missingFields.push("Next Review Date");
  }
}

const metadataComplete = missingFields.length === 0;

return {
  id: document.id,
  name: document.name,
  webUrl: sharePointUrl,
    createdDateTime: document.createdDateTime,
    lastModifiedDateTime: document.lastModifiedDateTime,

    governanceCategory: fields.GovernanceCategory?.[0] || null,
    documentOwner: documentOwner,
    controlledVersion: fields.ControlledVersion || null,
    approvedDate: fields.ApprovedDate || null,
    nextReviewDate: fields.NextReviewDate || null,
    documentStatus: fields.DocumentStatus || null,
    reviewRequirement: fields.ReviewRequirement || null,
    metadataComplete: metadataComplete,
missingFields: missingFields,
  };
}
async function getAllPolicyMetadata() {
  const policyDocuments = await getPolicyDocuments();

  const policyMetadata = await Promise.all(
    policyDocuments.map((document) =>
      getDocumentMetadata(document)
    )
  );

  return policyMetadata;
}
async function getDocumentCategorySummary(folderPath) {
  const documents =
    await getDocumentsFromGovernanceFolder(folderPath);

  const documentMetadata = await Promise.all(
    documents.map((document) =>
      getDocumentMetadata(document)
    )
  );

  const complete = documentMetadata.filter(
    (document) => document.metadataComplete
  ).length;

  const incomplete =
    documentMetadata.length - complete;

  return {
    total: documentMetadata.length,
    complete,
    incomplete,
    documents: documentMetadata,
  };
}

async function getTeamFeePayReports() {
  const documentsLibrary = await getDocumentsLibrary();

  const url =
    `https://graph.microsoft.com/v1.0/drives/${documentsLibrary.id}` +
    `/root:/TeamFeePay Reports:/children`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Unable to retrieve TeamFeePay reports: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  return data.value
    .filter((item) => item.file)
    .map((item) => ({
      id: item.id,
      name: item.name,
      webUrl: item.webUrl,
      size: item.size,
      createdDateTime: item.createdDateTime,
      lastModifiedDateTime: item.lastModifiedDateTime,
    }));
}

async function getTeamFeePayWorkbook(fileId) {
  const documentsLibrary = await getDocumentsLibrary();
  const accessToken = await getAccessToken();

  const url =
    `https://graph.microsoft.com/v1.0/drives/${documentsLibrary.id}` +
    `/items/${fileId}/content`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Unable to download TeamFeePay workbook: ${response.status} ${errorText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });
}
async function getTeamFeePaySeasonSummary() {
  const reports = await getTeamFeePayReports();

  const seasonReport = reports.find((report) =>
    report.name.includes("Season_Report")
  );

  if (!seasonReport) {
    throw new Error("TeamFeePay Season Report not found.");
  }

  const workbook = await getTeamFeePayWorkbook(
    seasonReport.id
  );

  const sheetName = "2026-2027 Season";
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(
      `Worksheet "${sheetName}" not found in TeamFeePay Season Report.`
    );
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  // Row 1 contains grouped headings.
  // Row 2 contains the actual TeamFeePay column names.
  const headers = rows[1];
  const dataRows = rows.slice(2);

  const getColumnIndex = (name, occurrence = 1) => {
    let count = 0;

    for (let i = 0; i < headers.length; i++) {
      if (headers[i] === name) {
        count++;

        if (count === occurrence) {
          return i;
        }
      }
    }

    return -1;
  };

  const columns = {
    memberFirstName: getColumnIndex("First Name", 1),
    memberLastName: getColumnIndex("Last Name", 1),
    dateOfBirth: getColumnIndex("Date of Birth", 1),
    team: getColumnIndex("Team"),
    memberStatus: getColumnIndex("Status"),
    paymentStatus: getColumnIndex("Payment Status"),
    gender: getColumnIndex("Gender"),
    faRegistrationStatus: getColumnIndex(
      "FA Registration Status"
    ),
    eligibleToPlay: getColumnIndex(
      "Eligible to play in games"
    ),
    totalPaidByUsers: getColumnIndex("Total Paid By User(s)"),
totalClubReceived: getColumnIndex("Total Club has Received"),
totalClubOverdue: getColumnIndex("Total Club Amount Overdue"),
totalClubDue: getColumnIndex("Total Club Amount Due"),
collectionsPaid: getColumnIndex("Collections Paid"),
collectionsOverdue: getColumnIndex("Collections Overdue"),
collectionsPending: getColumnIndex("Collections Pending"),
  };

  const members = dataRows.filter(
    (row) =>
      row[columns.memberFirstName] ||
      row[columns.memberLastName]
  );

  const countByValue = (columnIndex) => {
    const counts = {};

    members.forEach((row) => {
      const value = row[columnIndex];

      if (value !== null && value !== undefined && value !== "") {
        const key = String(value).trim();

        counts[key] = (counts[key] || 0) + 1;
      }
    });

    return counts;
  };

  const teamCounts = {};

members.forEach((row) => {
  const teamValue = row[columns.team];

  if (!teamValue) return;

  const teams = String(teamValue)
    .split(",")
    .map((team) => team.trim())
    .filter(Boolean);

  teams.forEach((team) => {
    teamCounts[team] = (teamCounts[team] || 0) + 1;
  });
});
const sumColumn = (columnIndex) => {
  return members.reduce((total, row) => {
    const value = Number(row[columnIndex]);

    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
};

const payments = {
  totalPaidByUsers: sumColumn(columns.totalPaidByUsers),
  totalClubReceived: sumColumn(columns.totalClubReceived),
  totalClubOverdue: sumColumn(columns.totalClubOverdue),
  totalClubDue: sumColumn(columns.totalClubDue),
  collectionsPaid: sumColumn(columns.collectionsPaid),
  collectionsOverdue: sumColumn(columns.collectionsOverdue),
  collectionsPending: sumColumn(columns.collectionsPending),
};

  return {
    source: {
      fileName: seasonReport.name,
      lastModifiedDateTime:
        seasonReport.lastModifiedDateTime,
    },

    totalMembers: members.length,

    membershipStatus: countByValue(
      columns.memberStatus
    ),

    gender: countByValue(
      columns.gender
    ),

    paymentStatus: countByValue(
      columns.paymentStatus
    ),

    payments,
    
    faRegistrationStatus: countByValue(
      columns.faRegistrationStatus
    ),

    eligibleToPlay: countByValue(
      columns.eligibleToPlay
    ),

  teams: teamCounts,
  };
}

async function getPolicyGovernanceSummary() {
  const policies = await getAllPolicyMetadata();

  const complete = policies.filter(
    (policy) => policy.metadataComplete
  ).length;

  const incomplete = policies.length - complete;

  return {
    total: policies.length,
    complete,
    incomplete,
    policies,
  };
}
// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
  getAccessToken,
  getTrusteesSite,
  getDocumentsLibrary,
  getGovernanceContents,
  getDocumentsFromGovernanceFolder,
  getPolicyDocuments,
  getDocumentMetadata,
  getAllPolicyMetadata,
  getPolicyGovernanceSummary,
  getDocumentCategorySummary,
  getTeamFeePayReports,
  getTeamFeePayWorkbook,
  getTeamFeePaySeasonSummary,
};