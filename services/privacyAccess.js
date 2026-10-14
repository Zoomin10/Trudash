// Identity and permission are separate. Personal-data access requires named users.
function namedUserAllowed(value, username) {
  const email = String(username || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return false;
  return String(value || "").split(",").some(entry => {
    const candidate = entry.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+$/.test(candidate) && candidate === email;
  });
}
function agreementAnalytics(summary) {
  return {
    source: { lastModifiedDateTime: summary.source?.lastModifiedDateTime || null },
    agreements: (summary.agreements || []).map(item => ({
      documentName: item.documentName, version: item.version,
      signed: item.signed, pending: item.pending, total: item.total,
      completionPercentage: item.completionPercentage,
    })),
  };
}
function complaintAnalytics(summary) {
  return { openComplaints: summary.openComplaints, detailsRestricted: true };
}
module.exports = { namedUserAllowed, agreementAnalytics, complaintAnalytics };
