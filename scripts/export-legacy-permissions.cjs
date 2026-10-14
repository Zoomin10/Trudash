require('dotenv').config({quiet:true});
const mapping={MEMBERSHIP_PILOT_ADMIN_EMAILS:'MEMBERS_MANAGE',TRUDASH_FINANCE_ADMIN_EMAILS:'FINANCE_DETAILS',TRUDASH_WELFARE_ADMIN_EMAILS:'WELFARE_DETAILS',TRUDASH_REPORT_ADMIN_EMAILS:'SOURCE_REPORTS',TRUDASH_FULL_CSV_EXPORT_EMAILS:'FULL_CSV_EXPORT'};
const grants=new Map();
for(const [variable,permission] of Object.entries(mapping)){
 for(const raw of (process.env[variable]||'').split(',')){
  const email=raw.trim().toLowerCase();if(!email)continue;
  if(!/^[^\s@]+@[^\s@]+$/.test(email))throw Error(`${variable} contains a domain or invalid email; review named users before importing`);
  if(!grants.has(email))grants.set(email,new Set());grants.get(email).add(permission);
 }
}
// Output only email-to-permission mappings, never secrets or other variables.
process.stdout.write(JSON.stringify({grants:[...grants].map(([email,permissions])=>({email,permissions:[...permissions]}))},null,2)+'\n');
