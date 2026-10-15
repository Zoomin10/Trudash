import { useCallback, useEffect, useState } from "react";
import "./MembershipPilot.css";
const base = "/api/membership-pilot";
const money = (p) => `£${((p || 0) / 100).toFixed(2)}`;
const labels = {
  MATCHES_AND_TRAINING: "Matches & Training",
  TRAINING_ONLY: "Training only",
};
export default function SeasonManagement({ onBack, onSessionExpired }) {
  const [data, setData] = useState(null),
    [members, setMembers] = useState([]),
    [seasonId, setSeasonId] = useState(""),
    [memberId, setMemberId] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [link, setLink] = useState(null);
  const [draft, setDraft] = useState({
    startYear: new Date().getUTCFullYear() + 1,
    termsVersion: "",
    termsContent: "",
    matches: "21",
    training: "11",
    matchesPrice: "",
    trainingPrice: "",
  });
  const request = useCallback(
    async (path, body) => {
      const r = await fetch(`${base}${path}`, {
        credentials: "include",
        ...(body
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      if (r.status === 401) {
        onSessionExpired();
        throw Error("Session expired");
      }
      const d = await r.json();
      if (!r.ok) throw Error(d.error || "Season action failed");
      return d;
    },
    [onSessionExpired],
  );
  const refresh = useCallback(async () => {
    const [d, m] = await Promise.all([
      request("/season-admin"),
      request("/members"),
    ]);
    setData(d);
    setMembers(m.members || []);
    setSeasonId((old) => old || d.seasons[0]?.id || "");
  }, [request]);
  useEffect(() => {
    let active = true;
    refresh().catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [refresh]);
  async function action(path, body, message) {
    setBusy(true);
    setError("");
    setNotice("");
    setLink(null);
    try {
      const d = await request(path, body);
      if (d.url) setLink(d);
      if (d.checkoutUrl) setLink({ url: d.checkoutUrl });
      setNotice(message);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const selected = data?.seasons.find((s) => s.id === seasonId);
  const member = members.find((m) => m.id === memberId);
  const target = () => `/season-admin/${seasonId}/members/${memberId}`;
  function create(event) {
    event.preventDefault();
    action(
      "/season-admin",
      {
        startYear: Number(draft.startYear),
        termsVersion: draft.termsVersion,
        termsContent: draft.termsContent,
        plans: [
          {
            paymentPlan: "MATCHES_AND_TRAINING",
            amountPence: Math.round(Number(draft.matches) * 100),
            stripePriceId: draft.matchesPrice,
          },
          {
            paymentPlan: "TRAINING_ONLY",
            amountPence: Math.round(Number(draft.training) * 100),
            stripePriceId: draft.trainingPrice,
          },
        ],
      },
      "Draft season created. Check the amounts and terms before publishing.",
    );
  }
  return (
    <div className="admin-page membership-pilot">
      <div className="members-shell">
        <div className="page-heading">
          <div>
            <p className="eyebrow">MEMBERSHIP SEASONS</p>
            <h1>Seasons &amp; renewals</h1>
            <p>1 June–31 May · Final scheduled collection 1 May</p>
          </div>
          <button className="secondary-btn" onClick={onBack}>
            Back to members
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {!data ? (
          <p>Loading season records…</p>
        ) : (
          <>
            <section className="detail">
              <strong>
                {data.enabled
                  ? "Seasonal new registrations enabled"
                  : "Seasonal new registrations are not enabled yet"}
              </strong>
              <p>
                Parents must accept each new season and finish card setup. An
                offer or accepted renewal without completed setup will not
                schedule payments. Existing open-ended plans must be given an
                end date before a new season can be scheduled.
              </p>
            </section>
            <section className="admin-card" style={{ marginTop: 20 }}>
              <h2>Manage a season</h2>
              <label>
                Season
                <select
                  value={seasonId}
                  onChange={(e) => {
                    setSeasonId(e.target.value);
                    setLink(null);
                  }}
                >
                  <option value="">Select season</option>
                  {data.seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — {s.status}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <>
                  <p>
                    {selected.plans
                      .map(
                        (p) =>
                          `${labels[p.paymentPlan]} ${money(p.amountPence)} / month`,
                      )
                      .join(" · ")}
                  </p>
                  <details>
                    <summary>Agreed terms — {selected.termsVersion}</summary>
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {selected.termsContent}
                    </p>
                  </details>
                  {data.canConfigure && selected.status === "DRAFT" && (
                    <button
                      className="secondary-btn"
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Publish these fees and terms? They become fixed for this season.",
                          )
                        )
                          action(
                            `/season-admin/${seasonId}/publish`,
                            { confirm: true },
                            "Season published.",
                          );
                      }}
                    >
                      Publish season
                    </button>
                  )}
                </>
              )}
              <label>
                Member
                <select
                  value={memberId}
                  onChange={(e) => {
                    setMemberId(e.target.value);
                    setLink(null);
                  }}
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option value={m.id} key={m.id}>
                      {m.playerFirstName} {m.playerSurname} —{" "}
                      {m.wwfcTeam || "No team"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="heading-actions">
                <button
                  className="secondary-btn"
                  disabled={
                    busy ||
                    !memberId ||
                    !selected ||
                    selected.status !== "PUBLISHED"
                  }
                  onClick={() =>
                    action(
                      `${target()}/renewal-link`,
                      {},
                      "Private renewal link created. Share it only with the parent or carer.",
                    )
                  }
                >
                  Create renewal link
                </button>
                <button
                  className="secondary-btn"
                  disabled={busy || !memberId || !selected}
                  onClick={() => {
                    if (
                      window.confirm(
                        `End ${member?.playerFirstName}’s existing plan after the final May payment for ${selected.label}? No new plan is created.`,
                      )
                    )
                      action(
                        `${target()}/end-legacy`,
                        { confirm: true },
                        "Previous plan given a fixed season end.",
                      );
                  }}
                >
                  Set existing plan’s season end
                </button>
                <button
                  className="delete-btn"
                  disabled={busy || !memberId}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Mark this member as left and immediately cancel ALL recorded current and future plans? No refund is issued; existing unpaid invoices remain.",
                      )
                    )
                      action(
                        `/season-admin/members/${memberId}/leave`,
                        { confirm: true },
                        "Member marked as left; recorded current and future payments cancelled.",
                      );
                  }}
                >
                  Member has left
                </button>
              </div>
              {link && (
                <div className="detail">
                  <label>
                    Private link{" "}
                    {link.expiresAt
                      ? `— expires ${new Date(link.expiresAt).toLocaleDateString("en-GB")}`
                      : "— complete card setup promptly"}
                    <input
                      readOnly
                      value={link.url}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <p>
                    Creating another link invalidates the previous link. The
                    link grants access to this member’s renewal details.
                  </p>
                </div>
              )}
            </section>
            <section className="admin-card" style={{ marginTop: 20 }}>
              <h2>Season memberships</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Season</th>
                      <th>Renewal</th>
                      <th>Plan</th>
                      <th>Billing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.memberships
                      .filter((m) => !seasonId || m.seasonId === seasonId)
                      .map((m) => (
                        <tr key={m.id}>
                          <td>
                            {m.registration.playerFirstName}{" "}
                            {m.registration.playerSurname}
                          </td>
                          <td>
                            {
                              data.seasons.find((s) => s.id === m.seasonId)
                                ?.label
                            }
                          </td>
                          <td>
                            {m.state === "LEFT"
                              ? "Left"
                              : m.origin === "LEGACY_CONFIRMED_BY_ADMIN"
                                ? "Existing membership confirmed"
                                : m.state === "ACCEPTED"
                                  ? "Accepted"
                                  : "Not yet accepted"}
                          </td>
                          <td>
                            {labels[m.paymentPlan] || "Not chosen"}{" "}
                            {m.amountPence != null && money(m.amountPence)}
                          </td>
                          <td>
                            {m.billingStatus ||
                              (m.state === "ACCEPTED"
                                ? "Awaiting payment setup"
                                : "No plan scheduled")}
                            {m.state === "ACCEPTED" && !m.billingStatus && (
                              <button
                                className="secondary-btn compact-btn"
                                disabled={busy}
                                onClick={() =>
                                  action(
                                    `/season-admin/memberships/${m.id}/payment-setup`,
                                    {},
                                    "Share this private setup link with the parent or carer.",
                                  )
                                }
                              >
                                Get payment setup link
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
            {data.canConfigure && (
              <section className="admin-card" style={{ marginTop: 20 }}>
                <h2>Create a season</h2>
                <p>
                  Use Stripe test monthly prices. Published fees and terms are
                  fixed; a new fee belongs to a new season.
                </p>
                <form onSubmit={create}>
                  <div className="modal-grid">
                    {[
                      ["startYear", "Season start year", "number"],
                      ["termsVersion", "Terms version", "text"],
                      ["matches", "Matches & Training (£ monthly)", "number"],
                      [
                        "matchesPrice",
                        "Matches & Training Stripe Price ID",
                        "text",
                      ],
                      ["training", "Training only (£ monthly)", "number"],
                      [
                        "trainingPrice",
                        "Training only Stripe Price ID",
                        "text",
                      ],
                    ].map(([key, label, type]) => (
                      <label key={key}>
                        {label}
                        <input
                          required
                          type={type}
                          step={key === "startYear" ? 1 : ".01"}
                          min={key === "startYear" ? 2026 : ".01"}
                          value={draft[key]}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [key]: e.target.value }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Approved season terms
                    <textarea
                      required
                      minLength={20}
                      maxLength={15000}
                      rows={8}
                      value={draft.termsContent}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          termsContent: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <button className="secondary-btn" disabled={busy}>
                    Save draft season
                  </button>
                </form>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
