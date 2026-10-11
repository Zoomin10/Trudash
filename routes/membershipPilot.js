const express = require("express");
const crypto = require("crypto");

function configuration(env) {
  const enabled = env.MEMBERSHIP_PILOT_ENABLED === "true";
  const admins = (env.MEMBERSHIP_PILOT_ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
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
  const ready = enabled && admins.length > 0 && backend && registrationUrl && secret && Buffer.byteLength(secret) >= 32;
  return { enabled, admins, backend, registrationUrl, secret, ready: Boolean(ready) };
}
function permittedPath(method, path) {
  return (method === "GET" && ["/members", "/registrations.csv"].includes(path)) ||
    (method === "GET" && /^\/registrations\/[A-Za-z0-9_-]+\/invoices$/.test(path)) ||
    (method === "POST" && /^\/registrations\/[A-Za-z0-9_-]+\/(invoices\/sync|billing\/cancel)$/.test(path)) ||
    (method === "DELETE" && /^\/registrations\/[A-Za-z0-9_-]+$/.test(path));
}
function signAssertion(secret, req, path) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "trudash", aud: "tcm-membership-admin", sub: req.session.user.username.toLowerCase(),
    role: "membership_admin", iat: now, exp: now + 30, jti: crypto.randomUUID(),
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
  router.get("/config", (req, res) => {
    const config = configuration(env);
    const allowed = config.ready && config.admins.includes(req.session.user.username?.toLowerCase());
    res.json({ enabled: config.enabled, available: Boolean(allowed), registrationUrl: allowed ? config.registrationUrl : null });
  });
  router.use(async (req, res) => {
    const config = configuration(env);
    if (!config.enabled) return res.status(404).json({ error: "Membership pilot is disabled" });
    if (!config.ready) return res.status(503).json({ error: "Membership pilot is not configured" });
    if (!config.admins.includes(req.session.user.username?.toLowerCase())) return res.status(403).json({ error: "Membership administrator access required" });
    if (!permittedPath(req.method, req.path) || req.url.includes("?")) return res.status(404).json({ error: "Unknown membership action" });
    if (!["GET", "HEAD"].includes(req.method)) {
      // Cookie-based Microsoft sessions must not authorize cross-site mutations.
      let expectedOrigin;
      try { expectedOrigin = new URL(env.APP_BASE_URL).origin; } catch { return res.status(503).json({ error: "TruDash app URL is not configured" }); }
      if (req.get("origin") !== expectedOrigin) return res.status(403).json({ error: "Invalid request origin" });
    }
    const upstreamPath = `/api/admin${req.path}`;
    try {
      const response = await fetchImpl(`${config.backend}${upstreamPath}`, {
        method: req.method,
        headers: { "Content-Type": "application/json", "x-trudash-assertion": signAssertion(config.secret, req, upstreamPath) },
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
