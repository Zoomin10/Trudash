require('dotenv').config({quiet:true});
const {Pool}=require('pg');const fs=require('node:fs');const path=require('node:path');
if(!process.env.SESSION_DATABASE_URL)throw Error('Set SESSION_DATABASE_URL for the intended environment');
const pool=new Pool({connectionString:process.env.SESSION_DATABASE_URL,connectionTimeoutMillis:5000});
(async()=>{const db=await pool.connect();try{await db.query('BEGIN');await db.query(fs.readFileSync(path.join(__dirname,'../db/sessions.sql'),'utf8'));await db.query('COMMIT');console.log('TruDash session tables ready');}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}})().catch(()=>{console.error('Session schema setup failed; check database access and schema permissions');process.exitCode=1;}).finally(()=>pool.end());
