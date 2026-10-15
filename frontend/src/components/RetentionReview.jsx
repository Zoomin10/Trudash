import { useCallback, useEffect, useState } from "react";
import "./MembershipPilot.css";
const labels = {
  ARCHIVED: "Archived",
  CONFIRM_SEASON: "Confirm actual season",
  CURRENT_OR_RENEWED: "Current or renewed",
  RETAIN_TO_SEASON_END: "Retain until season end",
  REVIEW_ARCHIVE: "Review for archive",
};
const date = (v) =>
  v
    ? new Date(v.length === 10 ? `${v}T12:00:00Z` : v).toLocaleDateString(
        "en-GB",
        { timeZone: "Europe/London" },
      )
    : "—";
export default function RetentionReview({ onBack, onSessionExpired }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [filter, setFilter] = useState(""),
    [search, setSearch] = useState(""),
    [action, setAction] = useState(null),
    [reason, setReason] = useState(""),
    [reviewDate, setReviewDate] = useState(""),
    [confirm, setConfirm] = useState(false),
    [notice, setNotice] = useState("");
  const refresh = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const r = await fetch("/api/membership-pilot/retention-review", {
          credentials: "include",
          signal,
        });
        if (r.status === 401) {
          onSessionExpired();
          return;
        }
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (!signal?.aborted) setData(d);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [onSessionExpired],
  );
  useEffect(() => {
    const c = new AbortController();
    refresh(c.signal);
    return () => c.abort();
  }, [refresh]);
  function begin(member, kind) {
    setAction({ member, kind });
    setReason("");
    setReviewDate("");
    setConfirm(false);
    setError("");
    setNotice("");
  }
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        confirm,
        reason,
        ...(action.kind === "archive" || action.kind === "review"
          ? {
              reviewDate,
              ...(action.kind === "archive"
                ? { nonRenewalConfirmed: confirm }
                : {}),
            }
          : {}),
        ...(action.kind === "hold"
          ? { enabled: !action.member.retentionHold }
          : {}),
      };
      const r = await fetch(
        `/api/membership-pilot/retention/${action.member.id}/${action.kind}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (r.status === 401) {
        onSessionExpired();
        return;
      }
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setAction(null);
      setNotice(
        action.kind === "restore"
          ? "Record restored; billing and renewal links remain stopped."
          : "Retention action recorded.",
      );
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  const rows = (data?.members || []).filter(
    (m) =>
      (!filter || m.state === filter) &&
      `${m.playerFirstName} ${m.playerSurname} ${m.team || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="admin-page membership-pilot">
      <div className="members-shell">
        <div className="page-heading">
          <div>
            <p className="eyebrow">SUPERVISED DATA RETENTION</p>
            <h1>Retention &amp; archive</h1>
            <p>
              Confirmed seasons · Restricted archive · No permanent deletion
            </p>
          </div>
          <div className="heading-actions">
            <button className="secondary-btn" onClick={onBack}>
              Back to members
            </button>
            <button
              className="secondary-btn"
              disabled={loading}
              onClick={() => {
                setError("");
                refresh();
              }}
            >
              Refresh review
            </button>
          </div>
        </div>
        <section className="detail">
          <strong>Archive review dates do not authorise deletion</strong>
          <p>{data?.notice}</p>
          <p>
            Only Super Admins with member-management permission may use this
            area. Medical declarations and contact details are not displayed.
            Retention holds preserve records for a documented purpose; record
            only a general reason or case reference, never sensitive case
            details.
          </p>
        </section>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {data && (
          <>
            <div className="stats-grid">
              {[
                ["Records", data.counts.total],
                ["Archive candidates", data.counts.archiveCandidates],
                ["Archived", data.counts.archived],
                ["Reviews due", data.counts.reviewDue],
                ["Holds", data.counts.holds],
              ].map(([label, value]) => (
                <div className="stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="admin-actions">
              <label>
                Search member or team
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                Review state
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">All records (including archive)</option>
                  {Object.entries(labels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {action && (
              <section className="admin-card" style={{ marginBottom: 20 }}>
                <h2>
                  {action.kind === "archive"
                    ? "Archive"
                    : action.kind === "restore"
                      ? "Restore"
                      : action.kind === "review"
                        ? "Review continued retention"
                        : action.member.retentionHold
                          ? "Release retention hold"
                          : "Set retention hold"}{" "}
                  — {action.member.playerFirstName}{" "}
                  {action.member.playerSurname}
                </h2>
                <form onSubmit={submit}>
                  <label>
                    General reason / reference (no health or complaint details)
                    <textarea
                      required
                      minLength={10}
                      maxLength={300}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  {(action.kind === "archive" || action.kind === "review") && (
                    <>
                      <label>
                        Next archive review date
                        <input
                          type="date"
                          required
                          value={reviewDate}
                          onChange={(e) => setReviewDate(e.target.value)}
                        />
                      </label>
                      <p>
                        Select a justified review date under the club's approved
                        procedure. The proposed 12 months is not automatically
                        applied. Stripe will be checked before archiving; active
                        plans or open invoices block the action.
                      </p>
                    </>
                  )}
                  <label>
                    <input
                      type="checkbox"
                      required
                      checked={confirm}
                      onChange={(e) => setConfirm(e.target.checked)}
                    />
                    {action.kind === "archive"
                      ? " I confirm this member is not continuing or renewing, their confirmed season has ended, and this archive/review date is appropriate."
                      : " I confirm this retention action and its stated reason."}
                  </label>
                  <div className="heading-actions">
                    <button className="secondary-btn" disabled={loading}>
                      Confirm {action.kind}
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={loading}
                      onClick={() => setAction(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}
            <p>{rows.length} records shown · Dates use Europe/London</p>
            <div className="table-wrap">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Season</th>
                    <th>Review</th>
                    <th>Hold</th>
                    <th>Archive</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.playerFirstName} {m.playerSurname}
                        <small className="cell-subtitle">
                          {m.team || "No team"}
                        </small>
                      </td>
                      <td>
                        {m.confirmedSeason || "Not confirmed"}
                        <small className="cell-subtitle">
                          {m.confirmedSeason
                            ? `Season ends ${date(m.seasonEnd)}`
                            : `Registration-date estimate: ${m.inferredSeason || "Unavailable"}`}
                        </small>
                      </td>
                      <td>
                        {labels[m.state]}
                        {m.archiveBlockers.map((text) => (
                          <small className="cell-subtitle" key={text}>
                            {text}
                          </small>
                        ))}
                        {m.billingReviewRequired && (
                          <small className="cell-subtitle">
                            Live Stripe check required before archive
                          </small>
                        )}
                      </td>
                      <td>
                        {m.retentionHold ? "Hold active" : "No hold"}
                        <small className="cell-subtitle">
                          {m.retentionHoldReason}
                        </small>
                      </td>
                      <td>
                        {m.archivedAt
                          ? `Archived ${date(m.archivedAt)}`
                          : "Not archived"}
                        {m.archiveReviewAt && (
                          <small className="cell-subtitle">
                            {m.archiveReviewDue ? "REVIEW DUE" : "Review"}{" "}
                            {date(m.archiveReviewAt)}
                          </small>
                        )}
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          {m.archivedAt ? (
                            <>
                              <button
                                className="secondary-btn compact-btn"
                                disabled={loading}
                                onClick={() => begin(m, "restore")}
                              >
                                Restore
                              </button>
                              <button
                                className="secondary-btn compact-btn"
                                disabled={loading}
                                onClick={() => begin(m, "review")}
                              >
                                Record review
                              </button>
                            </>
                          ) : (
                            <button
                              className="secondary-btn compact-btn"
                              disabled={loading || !m.archiveEligible}
                              onClick={() => begin(m, "archive")}
                            >
                              Review archive
                            </button>
                          )}
                          <button
                            className="secondary-btn compact-btn"
                            disabled={loading}
                            onClick={() => begin(m, "hold")}
                          >
                            {m.retentionHold ? "Release hold" : "Set hold"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <p>No matching records.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
