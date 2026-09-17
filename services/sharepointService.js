const msal = require("@azure/msal-node");
require("dotenv").config();

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

if (!fields.GovernanceCategory?.[0]) {
  missingFields.push("Governance Category");
}

if (!fields.DocumentOwnerLookupId) {
  missingFields.push("Document Owner");
}

if (!fields.ControlledVersion) {
  missingFields.push("Controlled Version");
}

if (!fields.ApprovedDate) {
  missingFields.push("Approved Date");
}

if (!fields.NextReviewDate) {
  missingFields.push("Next Review Date");
}

if (!fields.DocumentStatus) {
  missingFields.push("Document Status");
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
};