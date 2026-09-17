const {
  getAccessToken,
  getTrusteesSite,
  getDocumentsLibrary,
  getGovernanceContents,
  getDocumentsFromGovernanceFolder,
  getPolicyDocuments,
  getDocumentMetadata,
  getAllPolicyMetadata,
  getPolicyGovernanceSummary,
} = require("./services/sharepointService");

async function runTests() {
  console.log("Testing SharePoint service...");
  console.log("-------------------------");

  const token = await getAccessToken();

  console.log("Authentication: OK");
  console.log("Token received:", !!token);

  const site = await getTrusteesSite();

  console.log("\nTRUSTEES SITE");
  console.log("-------------------------");
  console.log("Site:", site.displayName);
  console.log("URL:", site.webUrl);

  const documentsLibrary = await getDocumentsLibrary();

  console.log("\nDOCUMENT LIBRARY");
  console.log("-------------------------");
  console.log("Library:", documentsLibrary.name);

  const governanceContents = await getGovernanceContents();

  console.log("\nGOVERNANCE CONTENTS");
  console.log("-------------------------");

  for (const item of governanceContents) {
    const type = item.folder ? "Folder" : "File";
    console.log(`[${type}] ${item.name}`);
  }

  const policyDocuments = await getPolicyDocuments();

  console.log("\nPOLICY DOCUMENTS");
  console.log("-------------------------");

  for (const document of policyDocuments) {
    console.log(document.name);
  }

  const pol008 = policyDocuments.find(
    (document) => document.name.startsWith("POL008")
  );

  if (!pol008) {
    throw new Error("POL008 safeguarding policy not found.");
  }

  const metadata = await getDocumentMetadata(pol008);
console.log("\nCOMPLETE POLICY REGISTER");
console.log("-------------------------");

const allPolicies = await getAllPolicyMetadata();

for (const policy of allPolicies) {
  console.log({
    name: policy.name,
    category: policy.governanceCategory,
    owner: policy.documentOwner?.displayName || "Not set",
    version: policy.controlledVersion || "Not set",
    approved: policy.approvedDate || "Not set",
    nextReview: policy.nextReviewDate || "Not set",
    status: policy.documentStatus || "Not set",

    governanceHealth: policy.metadataComplete
      ? "COMPLETE"
      : `INCOMPLETE (${policy.missingFields.length} missing)`,

    missingFields: policy.missingFields,
  });
}
const completePolicies = allPolicies.filter(
  (policy) => policy.metadataComplete
).length;

const incompletePolicies = allPolicies.length - completePolicies;

console.log("\nPOLICY GOVERNANCE SUMMARY");
console.log("-------------------------");
console.log("Total:", allPolicies.length);
console.log("Complete:", completePolicies);
console.log("Incomplete:", incompletePolicies);

console.log(`\nTotal policies: ${allPolicies.length}`);
  console.log("\nPOL008 METADATA");
  console.log("-------------------------");
  console.dir(metadata, { depth: null });
console.log("\nGOVERNANCE DOCUMENTS TEST");
console.log("-------------------------");

const governanceDocuments =
  await getDocumentsFromGovernanceFolder(
    "Governance Documents/Doc Versions"
  );

for (const document of governanceDocuments) {
  console.log({
    name: document.name,
    id: document.id,
  });
}
console.log("\nGOVERNANCE DOCUMENT METADATA");
console.log("----------------------------");

for (const document of governanceDocuments) {
  const metadata = await getDocumentMetadata(document);

  console.log({
    name: metadata.name,
    category: metadata.governanceCategory,
    owner: metadata.documentOwner?.displayName || "Not set",
    version: metadata.controlledVersion || "Not set",
    approved: metadata.approvedDate || "Not set",
    nextReview: metadata.nextReviewDate || "Not set",
    status: metadata.documentStatus || "Not set",
    health: metadata.metadataComplete
      ? "COMPLETE"
      : `INCOMPLETE (${metadata.missingFields.length} missing)`,
    missingFields: metadata.missingFields,
  });
}
console.log("\nREMAINING DOCUMENTATION FOLDERS");
console.log("--------------------------------");

const documentationFolders = [
  "Process Documents",
  "Statuatory Documents",
  "Finance Dcouments",
  "Digital Governance",
];

for (const folder of documentationFolders) {
  console.log(`\n${folder}`);

  try {
    const contents =
      await getDocumentsFromGovernanceFolder(folder);

    for (const item of contents) {
      console.log({
        name: item.name,
        type: item.folder ? "Folder" : "File",
        id: item.id,
      });
    }

    console.log(`Total items: ${contents.length}`);
  } catch (error) {
    console.log(`Unable to read folder: ${error.message}`);
  }
}

console.log(
  `\nTotal governance documents: ${governanceDocuments.length}`
);
  console.log("\n-------------------------");
  console.log("ALL TESTS PASSED");
}

runTests().catch((error) => {
  console.error("\nTEST FAILED");
  console.error(error.message);
});