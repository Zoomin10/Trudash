import {useCallback,useEffect,useState} from 'react';
import './MembershipPilot.css';
const labels={CURRENT_INFERRED_SEASON:'Current inferred season',REVIEW_RENEWAL:'Confirm renewal or departure',REVIEW_OLD_REGISTRATION:'Older registration needs review',CHECK_REGISTRATION_DATE:'Check registration date'};
const date=value=>value?new Date(value.length===10?`${value}T12:00:00Z`:value).toLocaleDateString('en-GB',{timeZone:'Europe/London'}):'—';
export default function RetentionReview({onBack,onSessionExpired}){
 const [data,setData]=useState(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const [filter,setFilter]=useState('');const [search,setSearch]=useState('');
 const refresh=useCallback(async(signal)=>{
  setLoading(true);setError('');
  try{
   const response=await fetch('/api/membership-pilot/retention-review',{credentials:'include',signal});
   if(response.status===401){onSessionExpired();return;}
   const result=await response.json();if(!response.ok)throw Error(result.error||'Review could not be loaded');
   if(!signal?.aborted)setData(result);
  }catch(e){if(e.name!=='AbortError')setError(e.message);}finally{if(!signal?.aborted)setLoading(false);}
 },[onSessionExpired]);
 useEffect(()=>{const controller=new AbortController();refresh(controller.signal);return()=>controller.abort();},[refresh]);
 const rows=(data?.members||[]).filter(member=>(!filter||member.state===filter)&&`${member.playerFirstName} ${member.playerSurname} ${member.team||''}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="admin-page membership-pilot"><div className="members-shell">
  <div className="page-heading"><div><p className="eyebrow">SEASON RECORD REVIEW</p><h1>Retention review</h1><p>Season ends 31 May · Proposed restricted archive period 12 months</p></div><div className="heading-actions"><button className="secondary-btn" onClick={onBack}>Back to members</button><button className="secondary-btn" disabled={loading} onClick={()=>refresh()}>{loading?'Loading…':'Refresh report'}</button></div></div>
  <section className="detail"><strong>Review only — no records are archived or deleted</strong><p>{data?.notice||'Registration dates do not confirm a membership season, renewal or departure. Confirm those facts before a retention decision.'}</p><p>Keep financial, agreement, incident and safeguarding records under their separate rules. Check billing and holds separately. Medical declarations are excluded from this report.</p></section>
  {error&&<p className="error" role="alert">{error}</p>}
  {data&&<><section className="stats-grid"><div className="stat"><span>Registrations</span><strong>{data.counts.total}</strong></div><div className="stat"><span>Renewal or departure review</span><strong>{data.counts.reviewRenewal}</strong></div><div className="stat"><span>Older registrations to review</span><strong>{data.counts.reviewOldRegistration}</strong></div></section>
  <div className="admin-actions"><label>Find member or team<input value={search} onChange={e=>setSearch(e.target.value)} /></label><label>Review state<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All records</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
  <p>Generated {date(data.generatedAt)} · Dates use Europe/London · {rows.length} records shown</p>
  <div className="table-wrap"><table className="members-table"><thead><tr><th>Member</th><th>Team</th><th>Registered</th><th>Inferred season</th><th>Review state</th><th>Proposed archive review date</th><th>Separate checks</th></tr></thead><tbody>{rows.map(member=><tr key={member.id}><td>{member.playerFirstName} {member.playerSurname}</td><td>{member.team||'—'}</td><td>{date(member.registeredAt)}</td><td>{member.inferredSeason||'—'}<small style={{display:'block'}}>Registration date only</small></td><td>{labels[member.state]}</td><td>{date(member.proposedArchiveReviewDate)}<small style={{display:'block'}}>Proposal, not deletion approval</small></td><td>{member.billingReviewRequired?'Review Stripe billing. ':''}{member.openInvoiceCount?`${member.openInvoiceCount} open invoices. `:''}Confirm renewals and holds.</td></tr>)}</tbody></table>{!rows.length&&<p>No matching registrations.</p>}</div></>}
 </div></div>;
}
