import { useCallback, useEffect, useRef, useState } from "react";
import "./ClubVolunteers.css";
const API = "/api/membership-pilot/volunteers";
async function request(path = "", options = {}) {
  const r = await fetch(API + path, options);
  if (r.status === 401) { window.location.assign("/auth/login"); throw new Error("Please sign in again."); }
  const data = await r.json(); if(!r.ok) throw new Error(data.error || "Request failed."); return data;
}
function VolunteerPanel({ volunteer, roles, superAdmin, onClose, onSaved }) {
  const [form,setForm] = useState({assignedRoles:volunteer.assignedRoles,status:volunteer.status,notes:volunteer.notes,accessRole:volunteer.accessRole,updatedAt:volunteer.updatedAt});
  const [busy,setBusy] = useState(false), [error,setError] = useState(""), [link,setLink] = useState("");
  const panel = useRef(null);
  useEffect(() => {
    const focus = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow="hidden"; panel.current.querySelector("button")?.focus();
    function keys(e) {
      if(e.key === "Escape") { e.preventDefault(); onClose(); }
      if(e.key !== "Tab") return;
      const items=[...panel.current.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea, a[href]")].filter(el=>el.getClientRects().length);
      const first=items[0], last=items.at(-1);
      if(e.shiftKey && document.activeElement===first) {e.preventDefault();last?.focus();}
      else if(!e.shiftKey && document.activeElement===last) {e.preventDefault();first?.focus();}
    }
    document.addEventListener("keydown",keys);
    return () => {document.body.style.overflow=overflow;document.removeEventListener("keydown",keys);focus?.focus();};
  }, [onClose]);
  async function save(e) {
    e.preventDefault();setBusy(true);setError("");
    try {const data=await request(`/${volunteer.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});onSaved(data);onClose();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function createLink() {
    setBusy(true);setError("");
    try {const data=await request(`/${volunteer.id}/acceptance-link`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});setLink(data.url);}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  const locked = volunteer.accessRole === "SUPER_ADMIN" && !superAdmin;
  return <div className="v-dialog" onClick={onClose}><div className="v-panel" ref={panel} role="dialog" aria-modal="true" aria-labelledby="volunteer-title" onClick={e=>e.stopPropagation()}><div className="v-header"><h2 id="volunteer-title">{volunteer.firstName} {volunteer.lastName}</h2><button onClick={onClose} aria-label="Close volunteer details">Close</button></div><p>{volunteer.email} · {volunteer.phone}</p><p>Team: {volunteer.team || "Not specified"}</p><p className="v-muted">Requested roles: {volunteer.requestedRoles.join(", ")}</p>{error && <p className="v-error" role="alert">{error}</p>}
  <form onSubmit={save}><h3>Assigned club roles</h3><div className="v-grid">{roles.map(role=><label className="v-check" key={role}><input type="checkbox" disabled={locked || busy} checked={form.assignedRoles.includes(role)} onChange={e=>setForm({...form,assignedRoles:e.target.checked?[...form.assignedRoles,role]:form.assignedRoles.filter(r=>r!==role)})}/>{role}</label>)}</div><div className="v-grid"><label>Review status<select disabled={locked || busy} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="AWAITING_REVIEW">Awaiting review</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><label>Volunteer administration access<select disabled={!superAdmin || busy} value={form.accessRole} onChange={e=>setForm({...form,accessRole:e.target.value})}><option value="NONE">None</option><option value="ADMIN">Admin</option><option value="SUPER_ADMIN">Super Admin</option></select></label></div><p className="v-muted">Access roles apply to volunteer administration. Existing TruDash access rules still apply.</p><label>Internal notes<textarea rows={4} disabled={locked || busy} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="v-actions"><button disabled={busy || locked}>{busy ? "Saving…" : "Save volunteer"}</button></div></form>
  <h3>Agreement acceptance</h3><p>{volunteer.missingAgreements.length ? "Required acceptance: " + volunteer.missingAgreements.join(", ") : "Current required agreements accepted."}</p><ul>{volunteer.acceptances.map(a=><li key={a.id}>{a.agreement === "COACH" ? "Coach Code of Conduct" : "Volunteer Agreement"} · {a.version} · {new Date(a.acceptedAt).toLocaleString("en-GB")}</li>)}</ul><p className="v-muted">Save new roles before creating an acceptance link. Links last 30 days; generating another replaces the previous link.</p><button disabled={busy} onClick={createLink}>Create agreement acceptance link</button>{link && <label>Share privately with this volunteer<input readOnly value={link} onFocus={e=>e.target.select()}/></label>}
  </div></div>;
}
export default function ClubVolunteers({ registrationUrl }) {
  const [data,setData] = useState(null), [error,setError] = useState(""), [selected,setSelected] = useState(null), [search,setSearch] = useState(""), [role,setRole] = useState(""), [status,setStatus] = useState("");
  async function refresh() {setError("");try{setData(await request());}catch(e){setError(e.message);}}
  useEffect(()=>{let alive=true;request().then(d=>{if(alive)setData(d);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
  const closePanel = useCallback(() => setSelected(null), []);
  const volunteers=data?.volunteers || [];
  const filtered=volunteers.filter(v=>(!role || v.assignedRoles.includes(role) || v.requestedRoles.includes(role)) && (!status || v.onboardingStatus===status) && `${v.firstName} ${v.lastName} ${v.email} ${v.team||""}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="volunteer-ui"><p className="v-muted">CLUB PEOPLE</p><h1>Club volunteers</h1><p>Review applications, assign roles and track agreement acceptance.</p><div className="v-actions"><a className="v-button" href={new URL("/volunteers",registrationUrl).href} target="_blank" rel="noopener noreferrer">Public volunteer signup</a><button onClick={refresh}>Refresh</button></div>{error && <p role="alert" className="v-error">{error}</p>}
  <div className="v-card v-grid">{["Awaiting review","Acceptance required","Active","Inactive"].map(s=><div key={s}><span className="v-muted">{s}</span><h2>{volunteers.filter(v=>v.onboardingStatus===s).length}</h2></div>)}</div>
  <div className="v-card"><div className="v-grid"><label>Search volunteers<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, email or team"/></label><label>Club role<select value={role} onChange={e=>setRole(e.target.value)}><option value="">All roles</option>{data?.roles.map(r=><option key={r}>{r}</option>)}</select></label><label>Onboarding status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{["Awaiting review","Acceptance required","Active","Inactive"].map(s=><option key={s}>{s}</option>)}</select></label></div><p className="v-muted">{filtered.length} volunteers</p><div className="v-table"><table><thead><tr><th>Volunteer</th><th>Roles</th><th>Team</th><th>Status</th><th>Access</th><th>Action</th></tr></thead><tbody>{filtered.map(v=><tr key={v.id}><td><strong>{v.firstName} {v.lastName}</strong><div className="v-muted">{v.email}</div></td><td>{v.assignedRoles.join(", ") || "Not assigned"}</td><td>{v.team || "—"}</td><td><span className="v-badge">{v.onboardingStatus}</span></td><td>{v.accessRole.replaceAll("_"," ")}</td><td><button onClick={()=>setSelected(v)}>View</button></td></tr>)}</tbody></table></div>{!data && !error && <p>Loading volunteers…</p>}{data && !filtered.length && <p>No matching volunteers.</p>}</div>
  {selected && <VolunteerPanel volunteer={selected} roles={data.roles} superAdmin={data.superAdmin} onClose={closePanel} onSaved={v=>setData({...data,volunteers:data.volunteers.map(old=>old.id===v.id?v:old)})}/>}
  </div>;
}
