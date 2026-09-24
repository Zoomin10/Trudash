require("dotenv").config();

const express = require("express");
const path = require("path");

const session = require("express-session");
const {
  getPolicyGovernanceSummary,
  getDocumentCategorySummary,
  getTeamFeePayReports,
  getTeamFeePaySeasonSummary,
  getTeamFeePayAgreementSummary,
  getTeamFeePayCollectionSummary,
  getComplaintsSummary,
  getTeamFeePayVolunteerSummary,
  inspectTeamFeePayAgreementReport,
} = require("./services/sharepointService");
const app = express();
const PORT = process.env.PORT || 3001;
const {
  msalClient,
  authCodeUrlParameters,
  redirectUri,
} = require("./services/authService");
const documentCategories = {
  policies: {
    name: "Policy Documents",
    folderPath: "Policy Documents/Doc versions",
  },

  governance: {
    name: "Governance Documents",
    folderPath: "Governance Documents/Doc Versions",
  },

  process: {
    name: "Process Documents",
    folderPath: "Process Documents/Doc versions",
  },

  statutory: {
    name: "Statutory Documents",
    folderPath: "Statuatory Documents/Doc versions",
  },

  finance: {
    name: "Finance Documents",
    folderPath: "Finance Dcouments/Doc Versions",
  },

  digital: {
    name: "Digital Governance",
    folderPath: "Digital Governance/Doc versions",
  },
};
app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

app.use(express.json());

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      authenticated: false,
    });
  }

  res.json({
    authenticated: true,
    user: {
      name: req.session.user.name,
      username: req.session.user.username,
    },
  });
});

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      authenticated: false,
      error: "Authentication required.",
    });
  }

  next();
}

app.get("/auth/login", async (req, res) => {
  try {
    const authUrl = await msalClient.getAuthCodeUrl(
      authCodeUrlParameters
    );

    res.redirect(authUrl);
  } catch (error) {
    console.error("Unable to start sign-in:", error);

    res.status(500).json({
      error: "Unable to start sign-in.",
    });
  }
});

app.get("/auth/redirect", async (req, res) => {
  try {
    const tokenResponse = await msalClient.acquireTokenByCode({
      code: req.query.code,
      scopes: authCodeUrlParameters.scopes,
      redirectUri,
    });

  req.session.user = {
  homeAccountId: tokenResponse.account?.homeAccountId,
  username: tokenResponse.account?.username,
  name: tokenResponse.account?.name,
};

console.log(
  "Successful Entra sign-in:",
  req.session.user.username
);

req.session.save((error) => {
  if (error) {
    console.error("Unable to save session:", error);

    return res.status(500).json({
      error: "Unable to create authenticated session.",
    });
  }

  res.redirect("/");
});

  } catch (error) {
    console.error("Unable to complete sign-in:", error);

    res.status(500).json({
      error: "Unable to complete sign-in.",
    });
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Unable to destroy session:", error);

      return res.status(500).json({
        error: "Unable to sign out.",
      });
    }

    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    application: "Trudash",
  });
});
app.get("/api/governance/policies", requireAuth, async (req, res) => {
  try {
    const summary = await getPolicyGovernanceSummary();

    res.json(summary);
  } catch (error) {
    console.error("Unable to retrieve policy governance data:", error);

    res.status(500).json({
      error: "Unable to retrieve policy governance data.",
    });
  }
});
app.get("/api/governance/documents", requireAuth, async (req, res) => {
  try {
    const summary = await getDocumentCategorySummary(
      "Governance Documents/Doc Versions"
    );

    res.json(summary);
  } catch (error) {
    console.error(
      "Unable to retrieve governance documents:",
      error
    );

    res.status(500).json({
      error: "Unable to retrieve governance documents.",
    });
  }
});
app.get("/api/documentation-summary", requireAuth, async (req, res) => {
  try {
    const summaries = await Promise.all(
      Object.entries(documentCategories).map(
        async ([key, category]) => {
          const summary = await getDocumentCategorySummary(
            category.folderPath
          );

          return {
            category: key,
            ...summary,
          };
        }
      )
    );

    const total = summaries.reduce(
      (sum, category) => sum + category.total,
      0
    );

    const complete = summaries.reduce(
      (sum, category) => sum + category.complete,
      0
    );

    const incomplete = summaries.reduce(
      (sum, category) => sum + category.incomplete,
      0
    );

    res.json({
      total,
      complete,
      incomplete,
    });
  } catch (error) {
    console.error(
      "Unable to retrieve documentation summary:",
      error
    );

    res.status(500).json({
      error: "Unable to retrieve documentation summary.",
    });
  }
});

app.get("/api/documentation/:category", requireAuth, async (req, res) => {
  try {
    const category =
      documentCategories[req.params.category];

    if (!category) {
      return res.status(404).json({
        error: "Unknown document category.",
      });
    }

    const summary = await getDocumentCategorySummary(
      category.folderPath
    );

    res.json({
      category: req.params.category,
      name: category.name,
      ...summary,
    });

  } catch (error) {
    console.error(
      "Unable to retrieve documentation:",
      error
    );

    res.status(500).json({
      error: "Unable to retrieve documentation.",
    });
  }
});
app.get(
  "/api/members/volunteers",
  requireAuth,
  async (req, res) => {
    try {
      const summary =
        await getTeamFeePayVolunteerSummary();

      res.json(summary);
    } catch (error) {
      console.error(
        "Failed to load volunteer summary:",
        error
      );

      res.status(500).json({
        error: "Failed to load volunteer summary",
      });
    }
  }
);

app.get(
  "/api/members/agreements",
  requireAuth,
  async (req, res) => {
    try {
      const summary =
        await getTeamFeePayAgreementSummary();

      res.json(summary);
    } catch (error) {
      console.error(
        "Agreement summary failed:",
        error.message
      );

      res.status(500).json({
        error: "Unable to load TeamFeePay agreement summary",
      });
    }
  }
);
app.get(
  "/api/members/collections",
  requireAuth,
  async (req, res) => {
    try {
      const summary =
        await getTeamFeePayCollectionSummary();

      res.json(summary);
    } catch (error) {
      console.error(
        "Unable to retrieve TeamFeePay collection summary:",
        error
      );

      res.status(500).json({
        error:
          "Unable to retrieve TeamFeePay collection summary",
      });
    }
  }
);

app.get("/api/members/reports", requireAuth, async (req, res) => {
  try {
    const reports = await getTeamFeePayReports();

    res.json({
      total: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Error retrieving TeamFeePay reports:", error);

    res.status(500).json({
      error: "Unable to retrieve TeamFeePay reports.",
    });
  }
});

app.get("/api/members/summary", requireAuth, async (req, res) => {
  try {
    const summary = await getTeamFeePaySeasonSummary();

    res.json(summary);
  } catch (error) {
    console.error(
      "Error retrieving TeamFeePay member summary:",
      error
    );

    res.status(500).json({
      error: "Unable to retrieve member summary.",
    });
  }
});

app.get(
  "/api/welfare/complaints",
  requireAuth,
  async (req, res) => {
    try {
      const summary = await getComplaintsSummary();
      res.json(summary);
    } catch (error) {
      console.error(
        "Failed to load complaints summary:",
        error
      );

      res.status(500).json({
        error: "Failed to load complaints summary",
      });
    }
  }
);
// Serve the React production build
const frontendPath = path.join(__dirname, "frontend", "dist");

app.use(express.static(frontendPath));

// React SPA fallback
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Trudash API running on http://localhost:${PORT}`);
});