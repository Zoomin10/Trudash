const session = require('express-session');
const { Pool } = require('pg');
const PgStore = require('connect-pg-simple')(session);
function bounded(value, fallback, min, max, name) {
 const n=value===undefined ? fallback : Number(value);
 if(!Number.isInteger(n)||n<min||n>max)throw Error(`Invalid ${name}`);
 return n;
}
function sessionPolicy(env=process.env){return {
 idleMs:bounded(env.SESSION_IDLE_MINUTES,15,1,120,'SESSION_IDLE_MINUTES')*60000,
 maxMs:bounded(env.SESSION_MAX_HOURS,8,1,24,'SESSION_MAX_HOURS')*3600000,
 auditDays:bounded(env.SESSION_AUDIT_RETENTION_DAYS,90,1,365,'SESSION_AUDIT_RETENTION_DAYS'),
};}
function expired(auth,now,policy){return !auth||!Number.isFinite(auth.issuedAt)||!Number.isFinite(auth.lastActivityAt)||auth.issuedAt>now||auth.lastActivityAt>now||now-auth.issuedAt>=policy.maxMs||now-auth.lastActivityAt>=policy.idleMs;}
function createSessionInfrastructure({env=process.env,pool:providedPool,now=Date.now}={}){
 if(!env.SESSION_SECRET||Buffer.byteLength(env.SESSION_SECRET)<32)throw Error('SESSION_SECRET must contain at least 32 bytes');
 if(!providedPool&&!env.SESSION_DATABASE_URL)throw Error('SESSION_DATABASE_URL is required; no memory-store fallback');
 const policy=sessionPolicy(env);
 const pool=providedPool||new Pool({connectionString:env.SESSION_DATABASE_URL,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
 pool.on?.('error',()=>console.error('Session database connection error'));
 const store=new PgStore({pool,schemaName:'trudash_auth',tableName:'sessions',createTableIfMissing:false,disableTouch:true,pruneSessionInterval:false,errorLog:()=>console.error('Session store operation failed')});
 const cookieName='trudash.sid';
 const cookieOptions={httpOnly:true,secure:env.NODE_ENV==='production',sameSite:'lax',path:'/'};
 const middleware=session({name:cookieName,secret:env.SESSION_SECRET,store,resave:false,saveUninitialized:false,rolling:false,cookie:{...cookieOptions,maxAge:10*60000}});
 async function epoch(username,db=pool){const result=await db.query('SELECT epoch FROM trudash_auth.revocations WHERE username=$1',[username.toLowerCase()]);return String(result.rows[0]?.epoch||'0');}
 function remaining(auth){return Math.max(1,Math.min(policy.maxMs-(now()-auth.issuedAt),policy.idleMs-(now()-auth.lastActivityAt)));}
 async function establish(req){const time=now();req.session.auth={issuedAt:time,lastActivityAt:time,epoch:await epoch(req.session.user.username)};req.session.cookie.maxAge=remaining(req.session.auth);}
 function clearCookie(res){res.clearCookie(cookieName,cookieOptions);}
 async function guard(req,res,next){
  if(!req.session?.user)return next();
  try{
   const invalid=expired(req.session.auth,now(),policy)||String(req.session.auth.epoch)!==await epoch(req.session.user.username);
   if(invalid)return req.session.destroy(error=>{
    if(error)return res.status(503).json({error:'Session could not be ended'});
    clearCookie(res);
    if(req.path.startsWith('/api/'))return res.status(401).json({authenticated:false,error:'Session expired or revoked. Sign in again.'});
    return res.redirect('/auth/login');
   });
   req.session.cookie.maxAge=remaining(req.session.auth);
   next();
  }catch{return res.status(503).json({error:'Session verification is unavailable'});}
 }
 function activity(req,res){
  if(!req.session?.user||expired(req.session.auth,now(),policy))return res.status(401).json({error:'Sign in again'});
  req.session.auth.lastActivityAt=now();req.session.cookie.maxAge=remaining(req.session.auth);
  req.session.save(error=>error?res.status(503).json({error:'Session activity could not be saved'}):res.sendStatus(204));
 }
 async function revoke(actor,target){
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('INSERT INTO trudash_auth.revocations(username,epoch) VALUES($1,1) ON CONFLICT(username) DO UPDATE SET epoch=trudash_auth.revocations.epoch+1,updated_at=CURRENT_TIMESTAMP',[target]);
   const removed=await client.query("DELETE FROM trudash_auth.sessions WHERE lower(sess->'user'->>'username')=$1",[target]);
   await client.query("INSERT INTO trudash_auth.session_audit(actor,target,action,session_count) VALUES($1,$2,'SESSIONS_REVOKED',$3)",[actor,target,removed.rowCount]);
   await client.query('COMMIT');return removed.rowCount;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async function cleanup(){
  await new Promise((resolve,reject)=>store.pruneSessions(error=>error?reject(error):resolve()));
  await pool.query("DELETE FROM trudash_auth.session_audit WHERE created_at < CURRENT_TIMESTAMP - ($1 * INTERVAL '1 day')",[policy.auditDays]);
  await pool.query("DELETE FROM trudash_auth.revocations r WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '2 days' AND NOT EXISTS (SELECT 1 FROM trudash_auth.sessions s WHERE lower(s.sess->'user'->>'username')=r.username AND s.expire > CURRENT_TIMESTAMP)");
 }
 let timer;
 async function start(){
  await pool.query('SELECT sid FROM trudash_auth.sessions LIMIT 0');
  await pool.query('SELECT username FROM trudash_auth.revocations LIMIT 0');
  await pool.query('SELECT id FROM trudash_auth.session_audit LIMIT 0');
  await cleanup();timer=setInterval(()=>cleanup().catch(()=>console.error('Session cleanup failed')),15*60000);timer.unref();
 }
 async function close(){clearInterval(timer);await store.close();if(!providedPool)await pool.end();}
 return {middleware,guard,establish,activity,revoke,cleanup,start,close,clearCookie,policy,pool,store};
}
module.exports={createSessionInfrastructure,sessionPolicy,expired};
