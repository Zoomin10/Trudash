const express = require("express");
const crypto = require("crypto");

function configuration(env) {
  const enabled = env.MEMBERSHIP_PILOT_ENABLED === "true";
  let backend = null;
  let registrationUrl = null;
  try {
    const url = new URL(env.TCM_BACKEND_URL);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error();
    backend = url.origin;
    const publicUrl = new URL(env.TCM_REGISTRATION_URL);
    if (publicUrl.protocol !== "https:" && !(env.NODE_ENV !== "production" && publicUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(publicUrl.hostname))) throw new Error();
    if (publicUrl.username || publicUrl.password) throw new Error();
    registrationUrl = publicUrl.href;
  } catch { backend = null; registrationUrl = null; }
  const secret = env.TRUDASH_MEMBERSHIP_SHARED_SECRET;
  const ready = enabled && backend && registrationUrl && secret && Buffer.byteLength(secret) >= 32;
  return { enabled, backend, registrationUrl, secret, ready: Boolean(ready) };
}
function permittedPath(method, path) {
  return (["GET", "POST"].includes(method) && path === "/social-posts") ||
    (method === "DELETE" && /^\/social-posts\/[A-Za-z0-9_-]+$/.test(path)) ||
    (method === "GET" && path === "/volunteers") ||
    (method === "PATCH" && /^\/volunteers\/[A-Za-z0-9_-]+$/.test(path)) ||
    (method === "POST" && /^\/volunteers\/[A-Za-z0-9_-]+\/acceptance-link$/.test(path)) ||
    (method === "GET" && ["/members", "/registrations.csv", "/retention-review"].includes(path)) ||
    (method === "GET" && /^\/registrations\/[A-Za-z0-9_-]+\/invoices$/.test(path)) ||
    (method === "POST" && /^\/registrations\/[A-Za-z0-9_-]+\/(invoices\/sync|billing\/cancel|payment-setup)$/.test(path)) ||
    (method === "DELETE" && /^\/registrations\/[A-Za-z0-9_-]+$/.test(path));
}
function signAssertion(secret, req, path, volunteerSuperAdmin = false, fullCsvExport = false, scope = "members") {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "trudash", aud: "tcm-membership-admin", sub: req.session.user.username.toLowerCase(),
    role: "membership_admin", volunteerSuperAdmin,
    fullCsvExport, scope, iat: now, exp: now + 30, jti: crypto.randomUUID(),
    method: req.method, path,
    bodyHash: crypto.createHash("sha256").update(JSON.stringify(req.body || null)).digest("hex"),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}


function createMembershipPilotRouter({ env = process.env, fetchImpl = fetch } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!req.session?.user) return res.status(401).json({ error: "Microsoft sign-in required" });
    next();
  });
  router.get("/config", async (req, res) => {
    const config = configuration(env);
    try {
      const access = await require("../services/applicationAccess").getApplicationAccess(req, env, fetchImpl);
      const memberAllowed = access.permissions.includes("MEMBERS_MANAGE");
      const volunteersAvailable = access.permissions.includes("VOLUNTEERS_MANAGE");
      res.json({enabled:config.enabled,available:memberAllowed,volunteersAvailable,
        retentionReviewAvailable:memberAllowed && access.superAdmin === true,
        registrationUrl:memberAllowed || volunteersAvailable ? config.registrationUrl : null});
    } catch { res.status(503).json({error:"Application permissions could not be checked"}); }
  });

  router.use(async (req, res) => {
    const config = configuration(env);
    if (!config.enabled) return res.status(404).json({ error: "Membership pilot is disabled" });
    if (!config.ready) return res.status(503).json({ error: "Membership pilot is not configured" });
    const isVolunteerPath = req.path === "/volunteers" || req.path.startsWith("/volunteers/");
    const scope = isVolunteerPath ? "volunteers" : req.path.startsWith("/social-posts") ? "social" : "members";
    let access;
    try { access = await require("../services/applicationAccess").getApplicationAccess(req, env, fetchImpl); }
    catch { return res.status(503).json({error:"Application permissions could not be checked"}); }
    const requiredPermission = isVolunteerPath ? "VOLUNTEERS_MANAGE" : "MEMBERS_MANAGE";
    if (!access.permissions.includes(requiredPermission)) return res.status(403).json({error:"Application permission required"});
    if(req.path === "/retention-review" && access.superAdmin !== true)return res.status(403).json({error:"Super Admin access required"});
    if (!permittedPath(req.method, req.path) || req.url.includes("?")) return res.status(404).json({ error: "Unknown membership action" });
    if (!["GET", "HEAD"].includes(req.method)) {
      // Cookie-based Microsoft sessions must not authorize cross-site mutations.
      let expectedOrigin;
      try { expectedOrigin = new URL(env.APP_BASE_URL).origin; } catch { return res.status(503).json({ error: "TruDash app URL is not configured" }); }
      if (req.get("origin") !== expectedOrigin) return res.status(403).json({ error: "Invalid request origin" });
    }
    const fullCsvExport = access.permissions.includes("FULL_CSV_EXPORT");
    if (req.path === "/registrations.csv" && !fullCsvExport) {
      return res.status(403).json({ error: "Full registration export permission required" });
    }
    const upstreamPath = req.path.startsWith("/social-posts")
      ? `/api/social-media/admin${req.path.slice("/social-posts".length)}`
      : req.path.startsWith("/volunteers")
      ? `/api/volunteers/admin${req.path.slice("/volunteers".length)}`
      : `/api/admin${req.path}`;
    const superAdmins = (env.VOLUNTEER_SUPER_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(e => e && !e.startsWith("@"));
    const volunteerSuperAdmin = superAdmins.includes(req.session.user.username.toLowerCase());
    try {
      const response = await fetchImpl(`${config.backend}${upstreamPath}`, {
        method: req.method,
        headers: { "Content-Type": "application/json", "x-trudash-assertion": signAssertion(config.secret, req, upstreamPath, volunteerSuperAdmin, fullCsvExport, scope) },
        ...(["GET", "HEAD"].includes(req.method) ? {} : { body: JSON.stringify(req.body || null) }),
        signal: AbortSignal.timeout(30000), redirect: "error",
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json") && !contentType.includes("text/csv")) {
        return res.status(502).json({ error: "Unexpected response from membership service" });
      }
      res.status(response.status).set("Content-Type", contentType);
      const disposition = response.headers.get("content-disposition");
      if (disposition) res.set("Content-Disposition", disposition);
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error("Membership service request failed:", error.name);
      res.status(502).json({ error: "Membership service is unavailable. Retry or refresh the member to check the result." });
    }
  });
  return router;
}
module.exports = { createMembershipPilotRouter, configuration, permittedPath, signAssertion };
