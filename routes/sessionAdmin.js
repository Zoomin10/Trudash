const express=require('express');
function createSessionAdminRouter({sessions,getApplicationAccess,env=process.env}){
 const router=express.Router();
 router.post('/revoke',async(req,res)=>{
  res.set('Cache-Control','no-store');
  if(!req.session?.user)return res.status(401).json({error:'Microsoft sign-in required'});
  let origin;try{origin=new URL(env.APP_BASE_URL).origin;}catch{return res.status(503).json({error:'TruDash origin is not configured'});}
  if(req.get('origin')!==origin)return res.status(403).json({error:'Invalid request origin'});
  const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+$/.test(email)||email.length>200||req.body.confirm!==true)return res.status(400).json({error:'A valid account email and confirmation are required'});
  try{
   const access=await getApplicationAccess(req);
   if(access.superAdmin!==true)return res.status(403).json({error:'Super Admin access required'});
   const actor=req.session.user.username.toLowerCase();
   const revokedCount=await sessions.revoke(actor,email);
   if(actor===email){return req.session.destroy(error=>{
    sessions.clearCookie(res);
    if(error)return res.status(503).json({error:'Sessions revoked; refresh to sign in again'});
    res.json({revokedCount,revokedSelf:true});
   });}
   res.json({revokedCount,revokedSelf:false});
  }catch{return res.status(503).json({error:'Sessions could not be revoked'});}
 });
 return router;
}
module.exports={createSessionAdminRouter};
