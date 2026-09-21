const msal = require("@azure/msal-node");

const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const baseUrl =
  process.env.APP_BASE_URL ||
  "https://trudash-development.up.railway.app";

const redirectUri = `${baseUrl}/auth/redirect`;

const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret,
  },
};

const msalClient =
  new msal.ConfidentialClientApplication(msalConfig);

const authCodeUrlParameters = {
  scopes: ["openid", "profile", "email"],
  redirectUri,
};

module.exports = {
  msalClient,
  authCodeUrlParameters,
  redirectUri,
};