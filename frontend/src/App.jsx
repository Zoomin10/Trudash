import { useEffect, useState } from "react";
import "./App.css";
import DocumentRegister from "./components/DocumentRegister";

const documentationCategories = {
  policies: {
    apiCategory: "policies",
    title: "Policy Register",
    description:
      "Controlled policies retrieved from the WWFC Trustees SharePoint library.",
  },

  "governance-docs": {
    apiCategory: "governance",
    title: "Governance Document Register",
    description:
      "Controlled governance documents retrieved from the WWFC Trustees SharePoint library.",
  },

  process: {
    apiCategory: "process",
    title: "Process Document Register",
    description:
      "Controlled process documents retrieved from the WWFC Trustees SharePoint library.",
  },

  statutory: {
    apiCategory: "statutory",
    title: "Statutory Document Register",
    description:
      "Controlled statutory documents retrieved from the WWFC Trustees SharePoint library.",
  },

  "finance-docs": {
    apiCategory: "finance",
    title: "Finance Document Register",
    description:
      "Controlled finance documents retrieved from the WWFC Trustees SharePoint library.",
  },

  digital: {
    apiCategory: "digital",
    title: "Digital Governance Register",
    description:
      "Controlled digital governance documents retrieved from the WWFC Trustees SharePoint library.",
  },
};

function App() {
const [documentationData, setDocumentationData] = useState({});
const [error, setError] = useState(null);
const [currentSection, setCurrentSection] = useState("overview");
const [currentTab, setCurrentTab] = useState("policies");
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [documentationSummary, setDocumentationSummary] = useState(null);

const [auth, setAuth] = useState({
  loading: true,
  authenticated: false,
  user: null,
});

useEffect(() => {
  if (currentSection !== "documentation") {
    return;
  }

  const category = documentationCategories[currentTab];

  if (!category) {
    return;
  }

  if (documentationData[currentTab]) {
    return;
  }

  fetch(`/api/documentation/${category.apiCategory}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${category.title}`);
      }

      return response.json();
    })
    .then((data) => {
      setDocumentationData((current) => ({
        ...current,
        [currentTab]: data,
      }));
    })
    .catch((err) => {
      console.error("Documentation error:", err);
      setError(err.message);
    });
}, [currentSection, currentTab, documentationData]);

useEffect(() => {
  async function loadDocumentationSummary() {
    try {
      const response = await fetch("/api/documentation-summary");

      if (!response.ok) {
        throw new Error("Unable to retrieve documentation summary");
      }

      const data = await response.json();
      setDocumentationSummary(data);
    } catch (error) {
      console.error(
        "Unable to load documentation summary:",
        error
      );
    }
  }

  loadDocumentationSummary();
}, []);

useEffect(() => {
  async function checkAuthentication() {
    try {
      const response = await fetch("/api/auth/me");

      if (response.status === 401) {
        setAuth({
          loading: false,
          authenticated: false,
          user: null,
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to check authentication");
      }

      const data = await response.json();

      setAuth({
        loading: false,
        authenticated: data.authenticated,
        user: data.user || null,
      });
    } catch (error) {
      console.error("Authentication check failed:", error);

      setAuth({
        loading: false,
        authenticated: false,
        user: null,
      });
    }
  }

  checkAuthentication();
}, []);

  if (error) {
    return <div>Unable to load Trudash: {error}</div>;
  }


  return (
  <div className="dashboard">

    {/* SIDEBAR */}

 <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>

  <button
    className="mobile-menu-close"
    onClick={() => setMobileMenuOpen(false)}
    aria-label="Close navigation menu"
  >
    ×
  </button>

      <div className="brand">
        <img
  src="/images/wwfc-crest.png"
  alt="WWFC"
   className="brand-crest"
/>

        <div>
          <div className="brand-name">TRUDASH</div>
          <div className="brand-subtitle">WWFC Governance</div>
        </div>
      </div>

      <nav className="nav">

        <button
          className={`nav-item ${
            currentSection === "overview" ? "active" : ""
          }`}
         onClick={() => {
  setCurrentSection("overview");
  setMobileMenuOpen(false);
}}
        >
          Overview
        </button>

        <button
          className={`nav-item ${
            currentSection === "documentation" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("documentation");
            setCurrentTab("policies");
            setMobileMenuOpen(false);
          }}
        >
          Documentation
        </button>

        <button
          className={`nav-item ${
            currentSection === "finance" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("finance");
            setCurrentTab("overview");
            setMobileMenuOpen(false);
          }}
        >
          Finance
        </button>

        <button
          className={`nav-item ${
            currentSection === "safeguarding" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("safeguarding");
            setCurrentTab("overview");
            setMobileMenuOpen(false);
          }}
        >
          Safeguarding
        </button>

        <button
          className={`nav-item ${
            currentSection === "complaints" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("complaints");
            setCurrentTab("overview");
            setMobileMenuOpen(false);
          }}
        >
          Complaints
        </button>

        <button
          className={`nav-item ${
            currentSection === "risk" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("risk");
            setCurrentTab("risk-register");
            setMobileMenuOpen(false);
          }}
        >
          Risk & Compliance
        </button>

        <button
          className={`nav-item ${
            currentSection === "governance" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("governance");
            setCurrentTab("trustees");
            setMobileMenuOpen(false);
          }}
        >
          Governance
        </button>

        <button
          className={`nav-item ${
            currentSection === "organisation" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("organisation");
            setCurrentTab("overview");
            setMobileMenuOpen(false);
          }}
        >
          Organisation
        </button>

      </nav>

      <div className="sidebar-footer">
        Wroughton & Wichelstowe FC
      </div>

    </aside>

{mobileMenuOpen && (
  <button
    className="mobile-menu-overlay"
    onClick={() => setMobileMenuOpen(false)}
    aria-label="Close navigation menu"
  />
)}

    {/* MAIN AREA */}

    <div className="main-area">

     <header className="topbar">

  <button
    className="mobile-menu-button"
    onClick={() => setMobileMenuOpen(true)}
    aria-label="Open navigation menu"
    aria-expanded={mobileMenuOpen}
  >
    ☰
  </button>

  <div className="topbar-identity">
    <img
      src="/images/wwfclogonew.png"
      alt="Wroughton & Wichelstowe FC"
      className="topbar-logo"
    />
  </div>

</header>

      <main className="dashboard-content">


        {/* =====================================================
            OVERVIEW
        ====================================================== */}

        {currentSection === "overview" && (
          <>

            <div className="section-heading">
              <h2>Trustee Governance Dashboard</h2>

              <p>
                Current governance position across the principal
                areas of the CIO.
              </p>
            </div>


            <section className="module-grid">

              <button
                className="module-card"
                onClick={() => {
                  setCurrentSection("documentation");
                  setCurrentTab("policies");
                }}
              >
                <div className="module-title">
                  Documentation
                </div>

               <div className="module-value">
 {documentationSummary?.incomplete ?? "—"}

</div>

                <div className="module-description">
                  items require attention
                </div>

                <div className="module-link">
                  View documentation →
                </div>
              </button>


              <button
                className="module-card"
                onClick={() => {
                  setCurrentSection("finance");
                  setCurrentTab("overview");
                }}
              >
                <div className="module-title">Finance</div>
                <div className="module-value">—</div>

                <div className="module-description">
                  Not yet connected
                </div>

                <div className="module-link">
                  View finance →
                </div>
              </button>


              <button
                className="module-card"
                onClick={() => {
                  setCurrentSection("safeguarding");
                  setCurrentTab("overview");
                }}
              >
                <div className="module-title">Safeguarding</div>
                <div className="module-value">—</div>

                <div className="module-description">
                  Not yet connected
                </div>

                <div className="module-link">
                  View safeguarding →
                </div>
              </button>


              <button
                className="module-card"
                onClick={() => {
                  setCurrentSection("complaints");
                  setCurrentTab("overview");
                }}
              >
                <div className="module-title">Complaints</div>
                <div className="module-value">—</div>

                <div className="module-description">
                  Not yet connected
                </div>

                <div className="module-link">
                  View complaints →
                </div>
              </button>


              <button
                className="module-card"
                onClick={() => {
                  setCurrentSection("risk");
                  setCurrentTab("risk-register");
                }}
              >
                <div className="module-title">
                  Risk & Compliance
                </div>

                <div className="module-value">—</div>

                <div className="module-description">
                  Not yet connected
                </div>

                <div className="module-link">
                  View risk & compliance →
                </div>
              </button>


              <button
                className="module-card"
                onClick={() => {
                  setCurrentSection("governance");
                  setCurrentTab("trustees");
                }}
              >
                <div className="module-title">
                  Governance
                </div>

                <div className="module-value">—</div>

                <div className="module-description">
                  Not yet connected
                </div>

                <div className="module-link">
                  View governance →
                </div>
              </button>

            </section>

          </>
        )}


        {/* =====================================================
            DOCUMENTATION
        ====================================================== */}

        {currentSection === "documentation" && (
          <>

            


            {/* HORIZONTAL DOCUMENT TABS */}

            <div className="section-tabs">

              <button
                className={`section-tab ${
                  currentTab === "policies" ? "active" : ""
                }`}
                onClick={() => setCurrentTab("policies")}
              >
                Policy Documents
              </button>

              <button
                className={`section-tab ${
                  currentTab === "governance-docs" ? "active" : ""
                }`}
                onClick={() => setCurrentTab("governance-docs")}
              >
                Governance Documents
              </button>

              <button
                className={`section-tab ${
                  currentTab === "process" ? "active" : ""
                }`}
                onClick={() => setCurrentTab("process")}
              >
                Process Documents
              </button>

              <button
                className={`section-tab ${
                  currentTab === "statutory" ? "active" : ""
                }`}
                onClick={() => setCurrentTab("statutory")}
              >
                Statutory Documents
              </button>

              <button
                className={`section-tab ${
                  currentTab === "finance-docs" ? "active" : ""
                }`}
                onClick={() => setCurrentTab("finance-docs")}
              >
                Finance Documents
              </button>

              <button
                className={`section-tab ${
                  currentTab === "digital" ? "active" : ""
                }`}
                onClick={() => setCurrentTab("digital")}
              >
                Digital Governance
              </button>

            </div>


     

         {/* DOCUMENT REGISTER */}

{documentationCategories[currentTab] && (
  <DocumentRegister
    data={documentationData[currentTab]}
    title={documentationCategories[currentTab].title}
    description={
      documentationCategories[currentTab].description
    }
  />
)}

          </>
        )}


        {/* =====================================================
            PLACEHOLDER SECTIONS
        ====================================================== */}

        {currentSection !== "overview" &&
          currentSection !== "documentation" && (
            <>

              <div className="section-heading">

                <h2>
                  {currentSection === "finance" && "Finance"}
                  {currentSection === "safeguarding" &&
                    "Safeguarding"}
                  {currentSection === "complaints" &&
                    "Complaints"}
                  {currentSection === "risk" &&
                    "Risk & Compliance"}
                  {currentSection === "governance" &&
                    "Governance"}
                  {currentSection === "organisation" &&
                    "Organisation"}
                </h2>

                <p>
                  This Trudash module is not yet connected.
                </p>

              </div>

              <section className="panel">
                <div className="panel-header">
                  <h2>Module in development</h2>

                  <p>
                    Data integration and dashboard views will
                    be added during a future development phase.
                  </p>
                </div>
              </section>

            </>
          )}

      </main>

    </div>

  </div>
);
}
export default App;