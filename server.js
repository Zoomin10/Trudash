require("dotenv").config();

const express = require("express");
const {
  getPolicyGovernanceSummary,
  getDocumentCategorySummary,
} = require("./services/sharepointService");
const app = express();
const PORT = process.env.PORT || 3001;

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

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    application: "Trudash",
  });
});
app.get("/api/governance/policies", async (req, res) => {
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
app.get("/api/governance/documents", async (req, res) => {
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
app.get("/api/documentation/:category", async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Trudash API running on http://localhost:${PORT}`);
});