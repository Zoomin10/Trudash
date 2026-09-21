function formatDocumentName(filename) {
  if (!filename) return "";

  return filename
    // Remove file extension
    .replace(/\.(docx|pdf|xlsx|xls)$/i, "")

    // Remove version suffixes such as _v1, _v1.0, " v1"
    .replace(/[_\s-]+v\d+(\.\d+)?$/i, "")

    // Replace underscores with spaces
    .replace(/_/g, " ")

    // Remove WWFC after the document reference
    .replace(/^([A-Z]+\d+)\s+WWFC\s+/i, "$1 — ")

    // Clean up repeated spaces
    .replace(/\s+/g, " ")

    .trim();
}

function DocumentRegister({ data, title, description }) {

  if (!data) {
    return (
      <section className="panel">
        <p>Loading documents...</p>
      </section>
    );
  }

  return (
    <>
      <div className="summary-grid">

        <div className="summary-card total">
          <div className="summary-number">
            {data.total}
          </div>
          <div className="summary-label">
            Total Documents
          </div>
        </div>

        <div className="summary-card complete">
          <div className="summary-number">
            {data.complete}
          </div>
          <div className="summary-label">
            Governance Complete
          </div>
        </div>

        <div className="summary-card attention">
          <div className="summary-number">
            {data.incomplete}
          </div>
          <div className="summary-label">
            Require Attention
          </div>
        </div>

      </div>

      <section className="panel">

        <div className="panel-header">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <table className="policy-table">

          <thead>
            <tr>
              <th>Document</th>
              <th>Version</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Next Review</th>
              <th>Hygiene</th>
            </tr>
          </thead>

         <tbody>

  {data.documents.length === 0 ? (

    <tr>
      <td colSpan="6">
        <div className="empty-state">
          <strong>No controlled documents found</strong>
          <p>
            There are currently no documents recorded in this
            SharePoint category.
          </p>
        </div>
      </td>
    </tr>

  ) : (

    data.documents.map((document) => (

      <tr key={document.id}>

        <td>
          <a
            href={document.webUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
           <strong>
  {formatDocumentName(document.name)}
</strong>
          </a>
        </td>

        <td>
          {document.controlledVersion || "Not set"}
        </td>

        <td>
          {document.documentOwner?.displayName ||
            "Not set"}
        </td>

        <td>
          {document.documentStatus ? (
            <span className="status document-status">
              {document.documentStatus}
            </span>
          ) : (
            "Not set"
          )}
        </td>

        <td>
          {document.nextReviewDate
            ? new Date(
                document.nextReviewDate
              ).toLocaleDateString("en-GB")
            : "Not set"}
        </td>

        <td>

          {document.metadataComplete ? (

            <span className="status complete">
              Complete
            </span>

          ) : (

           <div
  className="metadata-health"
  title={`Missing: ${document.missingFields.join(", ")}`}
>
  <span className="status incomplete">
    {document.missingFields.length} fields missing
  </span>
</div>

          )}

        </td>

      </tr>

    ))

  )}

</tbody>

        </table>

      </section>
    </>
  );
}

export default DocumentRegister;