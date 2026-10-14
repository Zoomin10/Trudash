const {configuration,signAssertion} = require('../routes/membershipPilot');
const {namedUserAllowed} = require('./privacyAccess');
async function getApplicationAccess(req, env=process.env, fetchImpl=fetch) {
 const config=configuration(env);
 if(!config.ready)throw new Error('Application permissions service is not configured');
 const path='/api/access/me';
 const probe={method:'GET',session:req.session,body:undefined};
 const bootstrap=namedUserAllowed(env.VOLUNTEER_SUPER_ADMIN_EMAILS,req.session.user.username);
 const response=await fetchImpl(`${config.backend}${path}`,{headers:{'x-trudash-assertion':signAssertion(config.secret,probe,path,bootstrap,false,'access')},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error('Application permission lookup failed');
 const data=await response.json();
 if(!Array.isArray(data.permissions))throw new Error('Invalid application permissions');
 return data;
}
module.exports={getApplicationAccess};
