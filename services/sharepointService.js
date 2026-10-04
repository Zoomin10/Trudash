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

async function getDocumentsFromRootFolder(folderPath) {
  const accessToken = await getAccessToken();
  const documentsLibrary = await getDocumentsLibrary();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/drives/${documentsLibrary.id}/root:/${folderPath}:/children`,
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

async function getTeamFeePayVolunteerSummary() {
  const reports = await getTeamFeePayReports();

  const volunteerReports = reports
    .filter((report) =>
      report.name
        .toLowerCase()
        .includes("user roles - teamfeepay")
    )
    .sort(
      (a, b) =>
        new Date(b.lastModifiedDateTime) -
        new Date(a.lastModifiedDateTime)
    );

  const volunteerReport = volunteerReports[0];

  if (!volunteerReport) {
    throw new Error(
      "TeamFeePay User Roles report not found."
    );
  }

  const workbook = await getTeamFeePayWorkbook(
    volunteerReport.id
  );

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(
      "Worksheet not found in TeamFeePay User Roles report."
    );
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  // Row 1 is the report title.
  // Row 2 contains the actual column headings.
  const headers = rows[1];
  const dataRows = rows.slice(2);

  const userColumn = headers.indexOf("User");
  const roleColumn = headers.indexOf("Role");

  if (userColumn === -1 || roleColumn === -1) {
    throw new Error(
      "Expected User or Role column not found in TeamFeePay User Roles report."
    );
  }

  const volunteerRows = dataRows.filter((row) => {
    const user = row[userColumn];
    const role = row[roleColumn];

    return (
      user !== null &&
      user !== undefined &&
      String(user).trim() !== "" &&
      role !== null &&
      role !== undefined &&
      String(role).trim() !== ""
    );
  });

  const uniqueUsers = new Set(
    volunteerRows.map((row) =>
      String(row[userColumn])
        .trim()
        .toLowerCase()
    )
  );

  return {
    volunteers: uniqueUsers.size,
  };
}

async function getTeamFeePaySeasonSummary() {
  const reports = await getTeamFeePayReports();

const seasonReports = reports
  .filter((report) =>
    report.name.includes("Season_Report")
  )
  .sort(
    (a, b) =>
      new Date(b.lastModifiedDateTime) -
      new Date(a.lastModifiedDateTime)
  );

const seasonReport = seasonReports[0];

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

  totalPaidByUsers: getColumnIndex(
    "Total Paid By User(s)"
  ),

  totalClubReceived: getColumnIndex(
    "Total Club has Received"
  ),

  totalClubOverdue: getColumnIndex(
    "Total Club Amount Overdue"
  ),

  totalClubDue: getColumnIndex(
    "Total Club Amount Due"
  ),

  collectionsPaid: getColumnIndex(
    "Collections Paid"
  ),

  collectionsOverdue: getColumnIndex(
    "Collections Overdue"
  ),

  collectionsPending: getColumnIndex(
    "Collections Pending"
  ),

  discountName: getColumnIndex("Discount name"),
  discount: getColumnIndex("Discount"),

  reasonForDiscount: getColumnIndex(
    "Reason for discount"
  ),
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

    if (
      value !== null &&
      value !== undefined &&
      value !== ""
    ) {
      const key = String(value).trim();

      counts[key] = (counts[key] || 0) + 1;
    }
  });

  return counts;
};


const sumColumn = (columnIndex) => {
  return members.reduce((total, row) => {
    const value = Number(row[columnIndex]);

    return total + (
      Number.isFinite(value) ? value : 0
    );
  }, 0);
};


const discountedMembers = members.filter((row) => {
  const discountName = row[columns.discountName];
  const discount = Number(row[columns.discount]);

  return (
    (
      discountName &&
      String(discountName).trim() !== ""
    ) ||
    (
      Number.isFinite(discount) &&
      discount !== 0
    )
  );
});


const discounts = {
  discountedMembers: discountedMembers.length,
  totalDiscount: sumColumn(columns.discount),
  discountTypes: countByValue(columns.discountName),
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
    teamCounts[team] =
      (teamCounts[team] || 0) + 1;
  });
});
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

    discounts,

    faRegistrationStatus: countByValue(
      columns.faRegistrationStatus
    ),

    eligibleToPlay: countByValue(
      columns.eligibleToPlay
    ),

  teams: teamCounts,
  };
}
async function getComplaintsSummary() {
const folderPath = "Safeguarding & Complaints";

const documents =
  await getDocumentsFromRootFolder(folderPath);

  const complaintsRegister = documents.find((document) =>
    document.name.includes("WWFC_Complaints_Register")
  );

  if (!complaintsRegister) {
    throw new Error("WWFC Complaints Register not found.");
  }

  const workbook = await getTeamFeePayWorkbook(
    complaintsRegister.id
  );

  const sheetName = "Complaints Register";
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(
      `Worksheet "${sheetName}" not found in Complaints Register.`
    );
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
  });

  const cases = rows
    .filter((row) => row["Case Ref"])
    .map((row) => ({
      caseRef: row["Case Ref"],
      caseOwner: row["Case Owner"] || null,
      lastReview: row["Committee Review Date"] || null,
      status: row["Status"] || null,
    }));

  const openCases = cases.filter(
    (complaint) =>
      complaint.status &&
      complaint.status.trim() !== "Closed"
  );

  return {
    openComplaints: openCases.length,
    cases: openCases,
  };
}
async function getTeamFeePayCollectionSummary() {
  const reports = await getTeamFeePayReports();

  const monthlyReports = reports
    .filter((report) =>
      report.name.includes("Monthly_By_Team_Report")
    )
    .sort(
      (a, b) =>
        new Date(a.lastModifiedDateTime) -
        new Date(b.lastModifiedDateTime)
    );

  let totalCollections = 0;
  let successfulCollections = 0;
  let failedCollections = 0;
  let totalPaidByUsers = 0;
  let totalDueToClub = 0;
  let totalOverdue = 0;
  let totalPayableCollections = 0;
  let pausedMemberships = 0;
  let totalClubCollected = 0;
  let totalPausedDueToClub = 0;
  let overdueMembers = [];
  

  const months = [];

  for (const report of monthlyReports) {
    const workbook = await getTeamFeePayWorkbook(report.id);

    const summarySheet = workbook.Sheets["Summary"];
const recurringCollectionSheet =
  workbook.Sheets["Recurring Collection"];
    if (!summarySheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(summarySheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });
 

    /*
      TeamFeePay Summary sheet:
      Find values by their labels rather than relying
      on fixed row numbers.
    */

    const findValue = (label) => {
      for (const row of rows) {
        if (
          String(row[0] || "")
            .trim()
            .toLowerCase() === label.toLowerCase()
        ) {
          return Number(row[1]) || 0;
        }
      }

      return 0;
    };
let payableCollections = 0;
let clubCollected = 0;
let pausedDueToClub = 0;

if (recurringCollectionSheet) {
  const recurringRows = XLSX.utils.sheet_to_json(
    recurringCollectionSheet,
    {
      defval: null,
      blankrows: false,
    }
  );

  // Count collections where money is actually due to the club
  payableCollections = recurringRows.filter((row) => {
    const amountDueToClub =
      Number(row["Amount Due to Club"]) || 0;

    return amountDueToClub > 0;
  }).length;

  // Sum the net amount actually collected for the club
  clubCollected = recurringRows.reduce((total, row) => {
    const amountCollected =
      Number(row["Amount Collected"]) || 0;

    return total + amountCollected;
  }, 0);

pausedDueToClub = recurringRows
  .filter((row) => {
    const status = String(row["Status"] || "")
      .trim()
      .toLowerCase();

    return status === "paused";
  })
  .reduce(
    (total, row) =>
      total + (Number(row["Amount Due to Club"]) || 0),
    0
  );
console.log("MONTHLY COLLECTION DEBUG", {
  report: report.name,
  pausedDueToClub,
  pausedRows: recurringRows
    .filter(
      (row) =>
        String(row["Status"] || "")
          .trim()
          .toLowerCase() === "paused"
    )
    .map((row) => ({
      amountDueFromUser: row["Amount Due from User"],
      amountDueToClub: row["Amount Due to Club"],
      amountCollected: row["Amount Collected"],
      status: row["Status"],
    })),
});
// Use the latest monthly report for current
// membership and overdue information
if (report === monthlyReports[monthlyReports.length - 1]) {
const pausedRows = recurringRows.filter((row) => {
  const status = String(row["Status"] || "")
    .trim()
    .toLowerCase();

  return status === "paused";
});

pausedMemberships = pausedRows.length;

totalPausedDueToClub = pausedRows.reduce(
  (total, row) =>
    total + (Number(row["Amount Due to Club"]) || 0),
  0
);

  overdueMembers = recurringRows
    .filter((row) => {
      const status = String(row["Status"] || "")
        .trim()
        .toLowerCase();

      return status === "overdue";
    })
    .map((row) => ({
      firstName: row["First Name"] || "",
      lastName: row["Last Name"] || "",
      teams: row["Teams"] || "",
      amountDue:
        Number(row["Amount Due from User"]) || 0,
      clubOverdue:
        Number(row["Amount Due to Club"]) || 0,
      status: row["Status"] || "",
    }));
}
}
   const collections =
  findValue("Total Number of Collections");

const successful =
  findValue("Total Number of Successful Collections");

const failed =
  findValue("Total Number of Failed Collections");

const paidByUsers =
  findValue("Total Amount Collected");

const dueToClub =
  findValue("Total Amount Due to Club");

const overdue =
  findValue("Total Overdue for Club");
  

    totalCollections += collections;
    successfulCollections += successful;
    failedCollections += failed;
    totalPaidByUsers += paidByUsers;
    totalDueToClub += dueToClub;
    totalOverdue += overdue;
    totalPayableCollections += payableCollections;
    totalClubCollected += clubCollected;
    totalPausedDueToClub += pausedDueToClub;

    const monthMatch = report.name.match(
      /Monthly_By_Team_Report_for_(\d{4})-(\d{2})/
    );

    const month =
      monthMatch
        ? `${monthMatch[1]}-${monthMatch[2]}`
        : report.name;

    months.push({
      month,
      collections,
      payableCollections,
      successful,
      failed,
collectionRate:
  dueToClub + overdue + pausedDueToClub > 0
    ? Math.round(
        (
          dueToClub /
          (dueToClub + overdue + pausedDueToClub)
        ) * 1000
      ) / 10
    : 0,
     paidByUsers,
  dueToClub,
  overdue,
  clubCollected:
    Math.round(clubCollected * 100) / 100,
});
  }

const collectionRate =
  totalDueToClub + totalOverdue + totalPausedDueToClub > 0
    ? Math.round(
        (
          totalDueToClub /
          (
            totalDueToClub +
            totalOverdue +
            totalPausedDueToClub
          )
        ) * 1000
      ) / 10
    : 0;

  return {
    collectionRate,
    totalCollections,
     totalPayableCollections, 
    successfulCollections,
    failedCollections,
      pausedMemberships,
      overdueMembers,

    totalPaidByUsers:
      Math.round(totalPaidByUsers * 100) / 100,

    totalDueToClub:
      Math.round(totalDueToClub * 100) / 100,

    totalOverdue:
      Math.round(totalOverdue * 100) / 100,

      totalClubCollected:
  Math.round(totalClubCollected * 100) / 100,

    months,
  };
}
async function getTeamFeePayFamilySummary() {
  const reports = await getTeamFeePayReports();

  const memberReports = reports
    .filter((report) =>
      report.name
        .toLowerCase()
        .includes("members - teamfeepay")
    )
    .sort(
      (a, b) =>
        new Date(b.lastModifiedDateTime) -
        new Date(a.lastModifiedDateTime)
    );

  const memberReport = memberReports[0];

  if (!memberReport) {
    throw new Error(
      "TeamFeePay Members report not found."
    );
  }

  const workbook = await getTeamFeePayWorkbook(
    memberReport.id
  );

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(
      "Worksheet not found in TeamFeePay Members report."
    );
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  // Row 1 contains the report title.
  // Row 2 contains the actual column headings.
  const headers = rows[1];
  const dataRows = rows.slice(2);

  const userColumn = headers.indexOf("User");
  const memberColumn = headers.indexOf("Member");
  const familySizeColumn = headers.indexOf(
    "Members in Family"
  );

  if (
    userColumn === -1 ||
    memberColumn === -1 ||
    familySizeColumn === -1
  ) {
    throw new Error(
      "Expected family columns not found in TeamFeePay Members report."
    );
  }

  const familyRows = dataRows.filter((row) => {
    const user = row[userColumn];
    const member = row[memberColumn];
    const familySize = Number(row[familySizeColumn]);

    return (
      user !== null &&
      user !== undefined &&
      String(user).trim() !== "" &&
      member !== null &&
      member !== undefined &&
      String(member).trim() !== "" &&
      familySize > 1
    );
  });

  const uniqueFamilies = new Set(
    familyRows.map((row) =>
      String(row[userColumn])
        .trim()
        .toLowerCase()
    )
  );

  return {
    familyGroups: uniqueFamilies.size,
    membersInFamilyGroups: familyRows.length,
  };
}

async function getAgreementDocumentVersions() {
  const policyDocuments = await getPolicyDocuments();

  const governanceDocuments =
    await getDocumentsFromGovernanceFolder(
      "Governance Documents/Doc versions"
    );

  const documents = [
    ...policyDocuments,
    ...governanceDocuments,
  ];

  const metadata = await Promise.all(
    documents.map((document) =>
      getDocumentMetadata(document)
    )
  );


const agreementMappings = {
  "WWFC Member Terms & Conditions":
    "WWFC_Player_Membership_Terms_and_Conditions",

  "Adult Code of Conduct":
    "POL005",

  "Coaches and Managers Code of Conduct":
    "POL003",

  "Parents Code of Conduct":
    "POL002",

  "Young Player Code of Conduct":
    "POL004",
};

  const versions = {};

  for (const [agreementName, documentName] of Object.entries(
    agreementMappings
  )) {
    const match = metadata.find((document) =>
      document.name
        ?.toLowerCase()
        .includes(documentName.toLowerCase())
    );

    versions[agreementName] =
      match?.controlledVersion || null;
  }

  return versions;
}

async function getTeamFeePayAgreementSummary() {
    const agreementVersions =
    await getAgreementDocumentVersions();
  const reports = await getTeamFeePayReports();

  const agreementReports = reports
    .filter((report) =>
      report.name.includes("member_document_agreement_status")
    )
    .sort(
      (a, b) =>
        new Date(b.lastModifiedDateTime) -
        new Date(a.lastModifiedDateTime)
    );

  if (agreementReports.length === 0) {
    throw new Error("No TeamFeePay agreement report found");
  }

  const report = agreementReports[0];
  const workbook = await getTeamFeePayWorkbook(report.id);

  const signedSheet = workbook.Sheets["Signed"];
  const notSignedSheet = workbook.Sheets["Not Signed"];

  if (!signedSheet || !notSignedSheet) {
    throw new Error(
      "Expected Signed and Not Signed sheets were not found"
    );
  }

  const signedRows = XLSX.utils.sheet_to_json(signedSheet, {
    defval: null,
  });

  const notSignedRows = XLSX.utils.sheet_to_json(notSignedSheet, {
    defval: null,
  });

  const agreements = {};

  // Count signed documents
 // Count signed agreements
for (const row of signedRows) {
  const documentName = row["Document Name"];

  if (!documentName) continue;

  const cleanName = String(documentName).trim();

if (!agreements[cleanName]) {
  agreements[cleanName] = {
    documentName: cleanName,
    signed: 0,
    pending: 0,
    pendingMembers: [],
  };
}
  agreements[cleanName].signed += 1;
}


// Count pending agreements
for (const row of notSignedRows) {
  const pendingDocuments = row["Pending Documents"];

  if (!pendingDocuments) continue;

  const documentNames = String(pendingDocuments)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  for (const documentName of documentNames) {
  if (!agreements[documentName]) {
  agreements[documentName] = {
    documentName,
    signed: 0,
    pending: 0,
    pendingMembers: [],
  };
}

    agreements[documentName].pending += 1;
    agreements[documentName].pendingMembers.push({
  firstName: row["First Name"] || "",
  lastName: row["Last Name"] || "",
  teams: row["Teams"] || "",
});
  } 
}
  const agreementSummary = Object.values(agreements)
    .map((agreement) => {
      const total = agreement.signed + agreement.pending;

 return {
  ...agreement,
  version:
    agreementVersions[agreement.documentName] || null,
  total,
  completionPercentage:
    total > 0
      ? Math.round((agreement.signed / total) * 100)
      : 0,
};
    })
    .sort((a, b) =>
      a.documentName.localeCompare(b.documentName)
    );

  return {
    source: {
      fileName: report.name,
      lastModifiedDateTime: report.lastModifiedDateTime,
    },
    agreements: agreementSummary,
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
  getTeamFeePayVolunteerSummary,
  getTeamFeePayFamilySummary,
getTeamFeePayAgreementSummary, 
getTeamFeePayCollectionSummary,
getComplaintsSummary,
  
};