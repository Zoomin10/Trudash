import { useCallback, useEffect, useRef, useState } from "react";
import "./MembershipPilot.css";
import "./ClubVolunteers.css";

const API = "/api/membership-pilot/volunteers";
const statuses = ["Awaiting review", "Acceptance required", "Active", "Inactive"];
const tones = { Active: "green", "Awaiting review": "blue", "Acceptance required": "amber", Inactive: "neutral" };
const fullName = (volunteer) => `${volunteer.firstName} ${volunteer.lastName}`;
const accessLabel = (role) => ({ NONE: "None", ADMIN: "Admin", SUPER_ADMIN: "Super Admin" }[role] || role);
const agreementLabel = (key) => key === "COACH" ? "Coach Code of Conduct" : "Volunteer Agreement";
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-GB") : "—";

async function request(path = "", options = {}) {
  const response = await fetch(API + path, options);
  if (response.status === 401) {
    window.location.assign("/auth/login");
    throw new Error("Please sign in again.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
function Badge({ children, tone = "neutral" }) {
  return <span className={`member-badge badge-${tone}`}>{children}</span>;
}
function Metric({ label, value, note, tone = "blue" }) {
  return <div className={`member-metric metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
function Detail({ label, children }) {
  return <div className="detail"><span>{label}</span><strong>{children || "Not recorded"}</strong></div>;
}

function VolunteerPanel({ volunteer, roles, permissionOptions, superAdmin, onClose, onSaved }) {
  const [tab, setTab] = useState("roles");
  const [form, setForm] = useState({
    assignedRoles: volunteer.assignedRoles, status: volunteer.status, notes: volunteer.notes,
    applicationPermissions: volunteer.applicationPermissions || [], accessRole: volunteer.accessRole, updatedAt: volunteer.updatedAt,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const panel = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current.querySelector("button")?.focus();
    function keys(event) {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key !== "Tab") return;
      const items = [...panel.current.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']")]
        .filter((element) => element.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keys);
      previousFocus?.focus();
    };
  }, [onClose]);

  async function save(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const data = await request(`/${volunteer.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      onSaved(data); onClose();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function createLink() {
    setBusy(true); setError("");
    try {
      const data = await request(`/${volunteer.id}/acceptance-link`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      setLink(data.url);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(link); }
    catch { setError("Select the link below and copy it to share with the volunteer."); }
  }
  const locked = (volunteer.accessRole === "SUPER_ADMIN" || (volunteer.applicationPermissions || []).length > 0) && !superAdmin;
  const rolesChanged = [...form.assignedRoles].sort().join("|") !== [...volunteer.assignedRoles].sort().join("|");

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-card" ref={panel} role="dialog" aria-modal="true" aria-labelledby="volunteer-title" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <div><p className="eyebrow">VOLUNTEER PROFILE</p><h2 id="volunteer-title">{fullName(volunteer)}</h2><p>{volunteer.team || "Team not recorded"} · Joined {formatDate(volunteer.createdAt)}</p><Badge tone={tones[volunteer.onboardingStatus]}>{volunteer.onboardingStatus}</Badge></div>
        <button className="modal-close" onClick={onClose} aria-label="Close volunteer details">×</button>
      </div>
      <div className="member-tabs profile-tabs" aria-label="Volunteer profile sections">
        {[["roles", "Roles & access"], ["details", "Volunteer details"], ["agreements", "Agreements"]].map(([key, label]) =>
          <button key={key} aria-pressed={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>)}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <form onSubmit={save}>
        <div hidden={tab !== "roles"}>
          <section className="modal-section"><h3>Requested roles</h3><p className="volunteer-hint">Roles selected during signup. Confirm appointments using the assigned roles below.</p><div className="volunteer-role-tags">{volunteer.requestedRoles.map((role) => <Badge tone="blue" key={role}>{role}</Badge>)}</div></section>
          <section className="modal-section"><h3>Assigned club roles</h3><div className="volunteer-role-grid">{roles.map((role) =>
            <label key={role} className={`volunteer-role-choice ${form.assignedRoles.includes(role) ? "is-selected" : ""}`}>
              <input type="checkbox" disabled={locked || busy} checked={form.assignedRoles.includes(role)} onChange={(event) => setForm({ ...form, assignedRoles: event.target.checked ? [...form.assignedRoles, role] : form.assignedRoles.filter((item) => item !== role) })} />
              <span>{role}</span>
            </label>)}</div></section>
          <section className="modal-section"><h3>Review & administration</h3><div className="modal-grid volunteer-form-grid">
            <label>Review status<select disabled={locked || busy} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="AWAITING_REVIEW">Awaiting review</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
            <label>Permission administration level<select disabled={!superAdmin || busy} value={form.accessRole} onChange={(event) => setForm({ ...form, accessRole: event.target.value })}><option value="NONE">Standard user</option><option value="ADMIN">Standard user (legacy Admin)</option><option value="SUPER_ADMIN">Super Admin</option></select></label>
          </div><p className="volunteer-hint">{superAdmin ? "Super Admin can assign application permissions. Other access comes from the permissions selected below. Active status and current agreements are required." : "Only a Super Admin can grant administration access. Access requires Active status and current agreements."}</p>{locked && <p className="volunteer-hint">A Super Admin must update records that hold application permissions.</p>}</section>
        </div>
        <section className="modal-section"><h3>Application permissions</h3><p className="volunteer-hint">These permissions are separate from club roles. Only a Super Admin can change them. Full CSV export also requires membership management.</p><div className="volunteer-role-grid">{permissionOptions.map(option => <label key={option.key}><input type="checkbox" disabled={!superAdmin || busy} checked={form.applicationPermissions.includes(option.key)} onChange={event => setForm({...form, applicationPermissions:event.target.checked ? [...form.applicationPermissions, option.key] : form.applicationPermissions.filter(key => key !== option.key)})} />{option.label}</label>)}</div></section>
        <div hidden={tab !== "details"}>
          <section className="modal-section"><h3>Contact details</h3><div className="modal-grid"><Detail label="Full name">{fullName(volunteer)}</Detail><Detail label="Email address">{volunteer.email}</Detail><Detail label="Telephone">{volunteer.phone}</Detail><Detail label="Team">{volunteer.team}</Detail><Detail label="Registered">{formatDate(volunteer.createdAt)}</Detail><Detail label="Registration reference">{volunteer.id}</Detail></div></section>
          <section className="modal-section"><h3>Internal notes</h3><label className="volunteer-form-label">Notes for club administrators<textarea rows={5} maxLength={4000} disabled={locked || busy} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></section>
        </div>
        <div hidden={tab !== "agreements"}>
          <section className="modal-section"><h3>Agreement status</h3>{volunteer.missingAgreements.length ? <p className="volunteer-acceptance-alert">Acceptance required: {volunteer.missingAgreements.map(agreementLabel).join(", ")}.</p> : <p className="volunteer-acceptance-success">All current required agreements have been accepted.</p>}</section>
          <section className="modal-section"><h3>Acceptance history</h3>{volunteer.acceptances.length ? volunteer.acceptances.map((acceptance) => <div className="volunteer-agreement-record" key={acceptance.id}>
            <div className="volunteer-agreement-heading"><strong>{agreementLabel(acceptance.agreement)}</strong><Badge tone="green">Accepted</Badge></div>
            <p className="volunteer-hint">Version {acceptance.version} · {new Date(acceptance.acceptedAt).toLocaleString("en-GB")}</p>
            <details><summary>Read accepted terms</summary><div className="volunteer-agreement-text" tabIndex={0}>{acceptance.content}</div></details>
          </div>) : <p className="volunteer-hint">No saved acceptance records.</p>}</section>
          <section className="modal-section"><h3>Request agreement acceptance</h3><p className="volunteer-hint">Share a private acceptance link with the volunteer. It lasts 30 days; creating another replaces the previous link.</p>{rolesChanged && <p className="volunteer-acceptance-alert">Save your role changes before creating a link.</p>}<button type="button" className="secondary-btn" disabled={busy || rolesChanged} onClick={createLink}>Create acceptance link</button>
            {link && <div className="volunteer-link-box"><label className="volunteer-form-label">Private acceptance link<input readOnly value={link} onFocus={(event) => event.target.select()} /></label><button type="button" className="secondary-btn compact-btn" onClick={copyLink}>Copy link</button></div>}
          </section>
        </div>
        <div className="volunteer-profile-footer"><span>Changes are saved to this volunteer's record.</span><button className="download-btn" disabled={busy || locked}>{busy ? "Saving…" : "Save volunteer"}</button></div>
      </form>
    </div>
  </div>;
}

export default function ClubVolunteers({ registrationUrl }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [access, setAccess] = useState("");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const requestNumber = useRef(0);
  async function refresh() {
    const sequence = ++requestNumber.current;
    setError(""); setLoading(true);
    try { const result = await request(); if (sequence === requestNumber.current) setData(result); }
    catch (failure) { if (sequence === requestNumber.current) setError(failure.message); }
    finally { if (sequence === requestNumber.current) setLoading(false); }
  }
  useEffect(() => {
    const sequence = ++requestNumber.current;
    let active = true;
    request().then((result) => { if (active && sequence === requestNumber.current) { setData(result); setLoading(false); } })
      .catch((failure) => { if (active && sequence === requestNumber.current) { setError(failure.message); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const closePanel = useCallback(() => setSelected(null), []);
  const volunteers = data?.volunteers || [];
  const counts = Object.fromEntries(statuses.map((status) => [status, volunteers.filter((volunteer) => volunteer.onboardingStatus === status).length]));
  const filtered = volunteers.filter((volunteer) =>
    (!role || volunteer.assignedRoles.includes(role) || volunteer.requestedRoles.includes(role)) &&
    (!access || volunteer.accessRole === access) &&
    (tab === "all" || volunteer.onboardingStatus === tab) &&
    `${fullName(volunteer)} ${volunteer.email} ${volunteer.team || ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const signupUrl = new URL("/volunteers", registrationUrl).href;
  function saved(volunteer) {
    setData((previous) => ({ ...previous, volunteers: previous.volunteers.map((old) => old.id === volunteer.id ? volunteer : old) }));
  }

  return <div className="admin-page membership-pilot club-volunteers">
    <header className="admin-header"><div><p className="eyebrow">CLUB PEOPLE</p><strong>Volunteer management</strong></div><div className="header-actions"><Badge tone="blue">Club volunteers</Badge><a className="secondary-btn" href={signupUrl} target="_blank" rel="noopener noreferrer">Public volunteer signup</a></div></header>
    <main className="members-shell">
      <div className="page-heading"><div><p className="eyebrow">VOLUNTEER MANAGEMENT</p><h1>Club volunteers</h1><p>Your club team, roles and onboarding agreements in one place.</p></div><div className="heading-actions"><button className="secondary-btn" onClick={refresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh volunteers"}</button></div></div>
      <section className="stats-grid" aria-label="Volunteer summary">
        <Metric label="Total volunteers" value={data ? volunteers.length : "—"} note="All registered volunteers" />
        <Metric label="Active" value={data ? counts.Active : "—"} note="Reviewed and active" tone="green" />
        <Metric label="Awaiting review" value={data ? counts["Awaiting review"] : "—"} note="Applications to review" />
        <Metric label="Acceptance required" value={data ? counts["Acceptance required"] : "—"} note="Agreements to complete" tone="amber" />
        <Metric label="Inactive" value={data ? counts.Inactive : "—"} note="Inactive volunteer records" tone="neutral" />
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="admin-card">
        <div className="directory-heading"><div><h2>Volunteer directory</h2><p>Review applications, confirm roles and track agreement acceptance.</p></div><span className="record-count">{filtered.length} volunteers</span></div>
        <div className="member-tabs" aria-label="Filter volunteers">{["all", ...statuses].map((status) => <button key={status} className={tab === status ? "is-active" : ""} aria-pressed={tab === status} onClick={() => { setTab(status); setPage(1); }}>{status === "all" ? "All volunteers" : status}<span>{data ? status === "all" ? volunteers.length : counts[status] : "—"}</span></button>)}</div>
        <div className="member-filters volunteer-filters">
          <label>Search volunteers<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, email or team" /></label>
          <label>Club role<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">All roles</option>{data?.roles.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Administration access<select value={access} onChange={(event) => { setAccess(event.target.value); setPage(1); }}><option value="">All access levels</option>{["NONE", "ADMIN", "SUPER_ADMIN"].map((item) => <option key={item} value={item}>{accessLabel(item)}</option>)}</select></label>
        </div>
        <div className="results-caption"><span>{filtered.length} matching volunteers</span>{(search || role || access || tab !== "all") && <button className="text-btn" onClick={() => { setSearch(""); setRole(""); setAccess(""); setTab("all"); setPage(1); }}>Clear filters</button>}</div>
        <div className="table-wrap"><table className="members-table volunteers-table"><thead><tr><th>Volunteer</th><th>Club roles</th><th>Team</th><th>Onboarding status</th><th>Administration access</th><th>Action</th></tr></thead><tbody>
          {visible.map((volunteer) => <tr key={volunteer.id}>
            <td><button className="member-name" onClick={() => setSelected(volunteer)}><span className="member-avatar" aria-hidden="true">{volunteer.firstName?.[0]}{volunteer.lastName?.[0]}</span><span><strong>{fullName(volunteer)}</strong><small>{volunteer.email}</small></span></button></td>
            <td><strong className="cell-title">{volunteer.assignedRoles.join(", ") || "Not assigned"}</strong><small className="cell-subtitle">{volunteer.assignedRoles.length ? `${volunteer.assignedRoles.length} assigned ${volunteer.assignedRoles.length === 1 ? "role" : "roles"}` : `${volunteer.requestedRoles.length} requested ${volunteer.requestedRoles.length === 1 ? "role" : "roles"}`}</small></td>
            <td>{volunteer.team || "—"}</td><td><Badge tone={tones[volunteer.onboardingStatus]}>{volunteer.onboardingStatus}</Badge></td>
            <td><Badge tone={volunteer.accessRole === "SUPER_ADMIN" ? "blue" : "neutral"}>{accessLabel(volunteer.accessRole)}</Badge></td>
            <td><button className="secondary-btn compact-btn" onClick={() => setSelected(volunteer)} aria-label={`View ${fullName(volunteer)}`}>View volunteer</button></td>
          </tr>)}
        </tbody></table></div>
        {!data && loading && <div className="empty-state" role="status"><p>Loading volunteers…</p></div>}
        {data && !filtered.length && <div className="empty-state"><strong>No matching volunteers</strong><p>{volunteers.length ? "Try a different search or clear your filters." : "Share the public signup form to welcome your first volunteers."}</p></div>}
        <div className="directory-footer"><span>{filtered.length ? `Showing ${(currentPage - 1) * 20 + 1}–${Math.min(currentPage * 20, filtered.length)} of ${filtered.length} volunteers` : "0 volunteers"}</span><div className="pagination"><button className="secondary-btn compact-btn" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button className="secondary-btn compact-btn" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
      </section>
    </main>
    {selected && <VolunteerPanel key={selected.id} volunteer={selected} roles={data.roles} permissionOptions={data.permissionOptions || []} superAdmin={data.superAdmin} onClose={closePanel} onSaved={saved} />}
  </div>;
}
