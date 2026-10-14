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

// Never forward workbook-derived objects wholesale to summary viewers.
function collectionResponse(summary, canViewDetails = false) {
  const result = {};
  for (const key of ['collectionRate', 'totalCollections', 'totalPayableCollections',
    'successfulCollections', 'failedCollections', 'pausedMemberships',
    'totalPaidByUsers', 'totalDueToClub', 'totalOverdue', 'totalClubCollected']) {
    result[key] = summary[key];
  }
  result.months = (summary.months || []).map(month => {
    const output = {};
    for (const key of ['month', 'collections', 'payableCollections', 'successful',
      'failed', 'collectionRate', 'paidByUsers', 'dueToClub', 'overdue', 'clubCollected']) output[key] = month[key];
    return output;
  });
  result.canViewOverdueDetails = canViewDetails;
  if (canViewDetails) {
    result.overdueMembers = (summary.overdueMembers || []).map(member => ({
      firstName: member.firstName, lastName: member.lastName, teams: member.teams,
      amountDue: member.amountDue, clubOverdue: member.clubOverdue, status: member.status,
    }));
  }
  return result;
}
module.exports.collectionResponse = collectionResponse;
