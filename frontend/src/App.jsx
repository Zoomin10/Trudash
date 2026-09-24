import { useEffect, useState } from "react";
import "./App.css";
import DocumentRegister from "./components/DocumentRegister";
import {
  Scale,
  Users,
  UsersRound,
  BicepsFlexed,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";

import {
  HandCoinsIcon,
  UsersThreeIcon,
  SoccerBallIcon,
  HandHeartIcon,
  FilesIcon,
  ShieldCheckIcon as PhosphorShieldCheckIcon,
} from "@phosphor-icons/react";


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
const [membersSummary, setMembersSummary] = useState(null);
const [agreementsSummary, setAgreementsSummary] = useState(null);
const [collectionSummary, setCollectionSummary] = useState(null);
const [complaintsSummary, setComplaintsSummary] = useState(null);
const [volunteerSummary, setVolunteerSummary] = useState(null);
const [familySummary, setFamilySummary] = useState(null);
const [auth, setAuth] = useState({
  loading: true,
  authenticated: false,
  user: null,
});

useEffect(() => {
  if (!auth.authenticated) return;

  fetch("/api/members/volunteers")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load volunteer summary");
      }

      return response.json();
    })
    .then((data) => setVolunteerSummary(data))
    .catch((error) =>
      console.error(
        "Failed to load volunteer summary:",
        error
      )
    );
}, [auth.authenticated]);

useEffect(() => {
  if (!auth.authenticated) return;

  fetch("/api/members/collections")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load collection summary");
      }

      return response.json();
    })
    .then((data) => {
      setCollectionSummary(data);
    })
    .catch((error) => {
      console.error(
        "Failed to load collection summary:",
        error
      );
    });
}, [auth.authenticated]);

useEffect(() => {
  if (!auth.authenticated) return;

  fetch("/api/welfare/complaints")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load complaints summary");
      }

      return response.json();
    })
    .then((data) => setComplaintsSummary(data))
    .catch((error) =>
      console.error(
        "Failed to load complaints summary:",
        error
      )
    );
}, [auth.authenticated]);

useEffect(() => {
if (!auth.authenticated || currentSection !== "documentation") {
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
}, [
  auth.authenticated,
  currentSection,
  currentTab,
  documentationData,
]);

useEffect(() => {
  if (!auth.authenticated) {
  return;
}
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
}, [auth.authenticated]);

useEffect(() => {
  if (!auth.authenticated) return;

  fetch("/api/members/summary")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load member summary");
      }

      return response.json();
    })
    .then((data) => {
      setMembersSummary(data);
    })
    .catch((error) => {
      console.error(
        "Error loading member summary:",
        error
      );
    });
}, [auth.authenticated]);

useEffect(() => {
  if (!auth.authenticated) return;

  fetch("/api/members/agreements")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load agreements");
      }

      return response.json();
    })
    .then((data) => {
      setAgreementsSummary(data);
    })
    .catch((error) => {
      console.error(
        "Failed to load agreement summary:",
        error
      );
    });
}, [auth.authenticated]);

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

if (auth.loading) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img
          src="/images/wwfc-crest.png"
          alt="Wroughton & Wichelstowe FC"
          className="auth-logo"
        />

        <h1>Trudash</h1>
        <p>Checking your access…</p>
      </div>
    </div>
  );
}

if (!auth.authenticated) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <img
          src="/images/wwfc-crest.png"
          alt="Wroughton & Wichelstowe FC"
          className="auth-logo"
        />

        <h1>TruDash</h1>
        <p>WWFC Trustee Dashboard</p>

        <a
          href="/auth/login"
          className="auth-login-button"
        >
          Sign in with Microsoft
        </a>
      </div>
    </div>
  );
}

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
          <div className="brand-name">TruDash</div>
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
            currentSection === "members" ? "active" : ""
          }`}
          onClick={() => {
            setCurrentSection("members");
            setCurrentTab("overview");
            setMobileMenuOpen(false);
          }}
        >
          Members
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
          Club Welfare
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
  {auth.user && (
    <div className="signed-in-user">
      <span>{auth.user.name}</span>

      <a href="/auth/logout" className="logout-link">
        Sign out
      </a>
    </div>
  )}

  <div className="sidebar-club-name">
    Wroughton & Wichelstowe FC
  </div>
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


            <section className="overview-kpi-grid">

  {/* SUBSCRIPTIONS */}
  <button
    className="overview-kpi-card"
    onClick={() => {
      setCurrentSection("members");
      setCurrentTab("payments");
    }}
  >
<div className="overview-kpi-icon-phosphor icon-subscriptions">
  <HandCoinsIcon size={38} weight="duotone" />
</div>

   <div className="overview-kpi-value">
  {collectionSummary
    ? `${collectionSummary.collectionRate}%`
    : "—"}
</div>

    <div className="overview-kpi-title">
      Subscription Collection
    </div>

<div className="overview-kpi-detail">
  {collectionSummary ? (
    <>
      <div>
        {collectionSummary.successfulCollections} of{" "}
        {collectionSummary.totalCollections} collections successful
      </div>

      <div>
        £{collectionSummary.totalOverdue.toFixed(2)} overdue
      </div>
    </>
  ) : (
    "Current financial year"
  )}
</div>

  </button>


  {/* MEMBERS */}
  <button
    className="overview-kpi-card"
    onClick={() => {
      setCurrentSection("members");
      setCurrentTab("overview");
    }}
  >
 <div className="overview-kpi-icon-phosphor icon-members">
  <UsersThreeIcon size={38} weight="duotone" />
</div>

    <div className="overview-kpi-value">
      {membersSummary?.totalMembers ?? "—"}
    </div>

    <div className="overview-kpi-title">
      Members
    </div>

    <div className="overview-kpi-detail">
      {membersSummary
        ? `${membersSummary.membershipStatus?.Active ?? 0} active`
        : "Loading membership data"}
    </div>
  </button>

{/* TEAMS */}
<button
  className="overview-kpi-card"
  onClick={() => {
    setCurrentSection("members");
    setCurrentTab("teams");
  }}
>
<div className="overview-kpi-icon-phosphor icon-teams">
  <SoccerBallIcon size={38} weight="duotone" />
</div>

  <div className="overview-kpi-value">
    {membersSummary?.teams
      ? Object.keys(membersSummary.teams).length
      : "—"}
  </div>

  <div className="overview-kpi-title">
    Teams
  </div>

  <div className="overview-kpi-detail">
    Registered in TeamFeePay
  </div>
</button>

{/* VOLUNTEERS */}
<button
  className="overview-kpi-card"
  onClick={() => {
    setCurrentSection("members");
    setCurrentTab("overview");
  }}
>
<div className="overview-kpi-icon-phosphor icon-volunteers">
  <HandHeartIcon size={38} weight="duotone" />
</div>

  <div className="overview-kpi-value">
    {volunteerSummary?.volunteers ?? "—"}
  </div>

  <div className="overview-kpi-title">
    Volunteers
  </div>

  <div className="overview-kpi-detail">
    Registered in TeamFeePay
  </div>
</button>

  {/* DOCUMENTATION */}
 <button
  className="overview-kpi-card"
  onClick={() => {
    setCurrentSection("documentation");
    setCurrentTab("policies");
  }}
>
<div className="overview-kpi-icon-phosphor icon-documents">
  <FilesIcon size={38} weight="duotone" />
</div>

  <div className="overview-kpi-value">
    {documentationSummary?.total ?? "—"}
  </div>

  <div className="overview-kpi-title">
    Document Control
  </div>

  <div className="overview-kpi-detail">
    {documentationSummary
      ? `${documentationSummary.incomplete} require attention`
      : "Controlled documents"}
  </div>
</button> 

{/* CLUB WELFARE */}
<button
  className="overview-kpi-card"
  onClick={() => {
    setCurrentSection("safeguarding");
    setCurrentTab("overview");
  }}
>
<div className="overview-kpi-icon-phosphor icon-welfare">
  <PhosphorShieldCheckIcon size={38} weight="duotone" />
</div>

  <div className="overview-kpi-value">
    {complaintsSummary
      ? complaintsSummary.openComplaints
      : "—"}
  </div>

  <div className="overview-kpi-title">
    Club Welfare
  </div>

  <div className="overview-kpi-detail">
    {complaintsSummary
      ? complaintsSummary.openComplaints === 1
        ? "Open complaint"
        : "Open complaints"
      : "Safeguarding & complaints"}
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
    MEMBERS
====================================================== */}

{currentSection === "members" && (
  <>
    <div className="section-heading">
      <h2>Members</h2>
      <p>
        Membership, registration, payment and agreement oversight.
      </p>
    </div>

    <div className="section-tabs">

      <button
        className={`section-tab ${
          currentTab === "overview" ? "active" : ""
        }`}
        onClick={() => setCurrentTab("overview")}
      >
        Overview
      </button>

      <button
        className={`section-tab ${
          currentTab === "teams" ? "active" : ""
        }`}
        onClick={() => setCurrentTab("teams")}
      >
        Teams
      </button>

      <button
        className={`section-tab ${
          currentTab === "payments" ? "active" : ""
        }`}
        onClick={() => setCurrentTab("payments")}
      >
        Payments
      </button>

      <button
        className={`section-tab ${
          currentTab === "registration" ? "active" : ""
        }`}
        onClick={() => setCurrentTab("registration")}
      >
        Registration
      </button>

      <button
        className={`section-tab ${
          currentTab === "agreements" ? "active" : ""
        }`}
        onClick={() => setCurrentTab("agreements")}
      >
        Agreements
      </button>

    </div>

    {currentTab === "overview" && (
  <>
    <section className="module-grid">

      <div className="module-card">
        <div className="module-title">
          Active Members
        </div>

        <div className="module-value">
          {membersSummary?.membershipStatus?.Active ?? "—"}
        </div>

        <div className="module-description">
          {membersSummary
            ? `${membersSummary.totalMembers} total records`
            : "Loading membership data"}
        </div>
      </div>

<div className="module-card">
  <div className="module-title">
    Family Groups
  </div>

  <div className="module-value">
    {familySummary?.familyGroups ?? "—"}
  </div>

  <div className="module-description">
    {familySummary
      ? `${familySummary.membersInFamilyGroups} members`
      : "Family memberships in TeamFeePay"}
  </div>
</div>


      <div className="module-card">
        <div className="module-title">
          Female Players
        </div>

        <div className="module-value">
          {membersSummary?.gender?.Female ?? "—"}
        </div>

        <div className="module-description">
          {membersSummary?.gender?.Male !== undefined
            ? `${membersSummary.gender.Male} male players`
            : "Membership profile"}
        </div>
      </div>


      <div className="module-card">
        <div className="module-title">
          FA Registered
        </div>

        <div className="module-value">
          {membersSummary?.faRegistrationStatus?.Registered ?? "—"}
        </div>

        <div className="module-description">
          Registered with The FA
        </div>
      </div>


      <div className="module-card">
        <div className="module-title">
          Payments Up to Date
        </div>

        <div className="module-value">
          {membersSummary?.paymentStatus?.["Up to date"] ?? "—"}
        </div>

        <div className="module-description">
          Current TeamFeePay status
        </div>
      </div>

<div className="module-card">
  <div className="module-title">
    Paused Memberships
  </div>

  <div className="module-value">
    {membersSummary?.membershipStatus?.Paused ?? 0}
  </div>

  <div className="module-detail">
    Memberships currently paused
  </div>
</div>

    </section>

    <section className="panel">
      <div className="panel-header">
        <h2>Membership Overview</h2>

        <p>
          Current membership position from the latest
          TeamFeePay season report.
        </p>
      </div>
    </section>
  </>
)}
{/* Placeholder for Members tabs not yet built */}



{/* Teams */}
{currentTab === "teams" && (
  <section className="panel">
    <div className="panel-header">
      <h2>Team Membership</h2>

      <p>
        Current squad sizes from the latest TeamFeePay
        season report.
      </p>
    </div>

<div className="policy-table-wrapper teams-table-wrapper">
  <table className="policy-table teams-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Players</th>
          </tr>
        </thead>

        <tbody>
          {membersSummary?.teams &&
            Object.entries(membersSummary.teams)
              .sort((a, b) =>
                a[0].localeCompare(b[0])
              )
              .map(([team, count]) => (
                <tr key={team}>
                  <td>
                    {team
                      .replace(
                        "Wroughton & Wichelstowe FC",
                        ""
                      )
                      .replace(
                        "Wroughton and Wichelstowe FC",
                        ""
                      )
                      .trim()}
                  </td>

                  <td>{count}</td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  </section>
)}



{/* Payments */}
{currentTab === "payments" && (
  <>
{collectionSummary && (
  <section className="module-grid">


    {/* Collection Success */}  
 <div className="module-card">
      <div className="module-value">
        {collectionSummary.collectionRate}%
      </div>
      <div className="module-title">
        Collection Success
      </div>
     <div className="module-detail">
        Financial year to date
      </div>
    </div>

    {/* Successful Collections */}
   <div className="module-card">
      <div className="module-value">
        {collectionSummary.successfulCollections}
      </div>
    <div className="module-title">
        Successful Collections
      </div>
     <div className="module-detail">
        of {collectionSummary.totalCollections} due
      </div>
    </div>

   {/* Club Overdue */} 
 <div className="module-card">
  <div className="module-value">
        £{collectionSummary.totalOverdue.toFixed(2)}
      </div>
      <div className="module-title">
        Club Overdue
      </div>
      <div className="module-detail">
        Current FY position
      </div>
    </div>



    {/* Club Received */}
      <div className="module-card">
        <div className="module-title">
          Club Received
        </div>

        <div className="module-value">
          {membersSummary?.payments
            ? `£${membersSummary.payments.totalClubReceived.toLocaleString(
                "en-GB",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`
            : "—"}
        </div>

        <div className="module-description">
          Net amount received by WWFC
        </div>
      </div>

  {/* Paid by Members */}
      <div className="module-card">
        <div className="module-title">
          Paid by Members
        </div>

        <div className="module-value">
          {membersSummary?.payments
            ? `£${membersSummary.payments.totalPaidByUsers.toLocaleString(
                "en-GB",
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}`
            : "—"}
        </div>

        <div className="module-description">
          Gross payments collected
        </div>
      </div>

    {/* Discounted Memberships */}
      <div className="module-card">
        <div className="module-title">
          Discounted Memberships
        </div>

        <div className="module-value">
          {membersSummary?.discounts?.discountedMembers ?? 0}
        </div>

        <div className="module-description">
          Memberships with a discount applied
        </div>
      </div>

   
  </section>
)}

{collectionSummary?.months?.length > 0 && (
  <section className="panel">
    <div className="panel-header">
      <h2>Monthly Collection History</h2>
      <p>
        Subscription collection performance for each TeamFeePay
        collection cycle.
      </p>
    </div>

    <div className="policy-table-wrapper">
      <table className="policy-table collection-history-table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Collections</th>
            <th>Successful</th>
            <th>Failed</th>
            <th>Success Rate</th>
            <th>Club Overdue</th>
          </tr>
        </thead>

        <tbody>
          {collectionSummary.months.map((month) => (
            <tr key={month.month}>
              <td>
                {new Date(`${month.month}-01`).toLocaleDateString(
                  "en-GB",
                  {
                    month: "long",
                    year: "numeric",
                  }
                )}
              </td>

              <td>{month.collections}</td>
              <td>{month.successful}</td>
              <td>{month.failed}</td>
              <td>{month.collectionRate}%</td>
              <td>£{month.overdue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}

    <section className="panel">
      <div className="panel-header">
        <h2>Payment Overview</h2>

        <p>
          Current subscription collection position from
          TeamFeePay. Pending collections include future
          scheduled payments and are not treated as overdue debt.
        </p>
      </div>
    </section>
  </>
)}



{/* Registration */}
{currentTab === "registration" && (
  <>
    <section className="module-grid">

      <div className="module-card">
        <div className="module-title">
          FA Registered
        </div>

        <div className="module-value">
          {membersSummary?.faRegistrationStatus?.Registered ?? 0}
        </div>

        <div className="module-description">
          FA registration confirmed in TeamFeePay
        </div>
      </div>


      <div className="module-card">
        <div className="module-title">
          Needs Attention
        </div>

        <div className="module-value">
          {membersSummary
            ? membersSummary.totalMembers -
              (membersSummary.faRegistrationStatus?.Registered ?? 0)
            : "—"}
        </div>

        <div className="module-description">
          FA registration not confirmed in TeamFeePay
        </div>
      </div>

    </section>

    <section className="panel">
      <div className="panel-header">
        <h2>FA Registration Overview</h2>
        <p>
          Players are shown as FA Registered where the member details in
          TeamFeePay are verified against the player data in FA Portal 
          (Name, FAN and Date of Birth).
          Other records are flagged for attention, as they may
          require FA registration, synchronisation or data-quality
          checks.
        </p>
      </div>
    </section>
  </>
)}
     </>
)}



{/* Agreements */}
{currentTab === "agreements" && (
  <>
    <section className="panel">
      <div className="panel-header">
        <h2>Member Agreements</h2>
        <p>
          Current acceptance status of club membership terms and
          codes of conduct recorded in TeamFeePay.
        </p>
      </div>

      {!agreementsSummary ? (
        <p>Loading agreement data...</p>
      ) : (
        <div className="policy-table-wrapper">
          <table className="policy-table">
            <thead>
              <tr>
                <th>Agreement</th>
                <th>Signed</th>
                <th>Pending</th>
                <th>Completion</th>
              </tr>
            </thead>

            <tbody>
              {agreementsSummary.agreements.map((agreement) => (
                <tr key={agreement.documentName}>
                  <td>{agreement.documentName}</td>
                  <td>{agreement.signed}</td>
                  <td>{agreement.pending}</td>
                <td>
  <div className="agreement-progress">
    <div className="agreement-progress-bar">
      <div
        className="agreement-progress-fill"
        style={{
          width: `${agreement.completionPercentage}%`,
        }}
      />
    </div>

    <span className="agreement-progress-value">
      {agreement.completionPercentage}%
    </span>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>

    <section className="panel">
      <div className="panel-header">
        <h2>Agreement Overview</h2>
        <p>
          Pending agreements identify records where TeamFeePay
          has not recorded acceptance of the relevant document.
          Newly introduced agreements may have a lower completion
          rate while they are being rolled out to members.
        </p>
      </div>
    </section>
  </>
)}

        {/* =====================================================
            welfare SECTIONS
        ====================================================== */}
{currentSection === "safeguarding" && currentTab === "overview" && (
  <section className="content-section">
    <div className="section-header">
      <div>
        <h1>Club Welfare</h1>
        <p>
          Trustee-level oversight of safeguarding and complaints.
        </p>
      </div>
    </div>

    <div className="overview-summary-card">
      <div className="overview-summary-value">
        {complaintsSummary
          ? complaintsSummary.openComplaints
          : "—"}
      </div>

      <div className="overview-summary-label">
        {complaintsSummary?.openComplaints === 1
          ? "Open Complaint"
          : "Open Complaints"}
      </div>
    </div>

    <div className="table-card">
      <div className="table-card-header">
        <h2>Open Complaints</h2>
      </div>

      {complaintsSummary?.cases?.length > 0 ? (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Case Ref</th>
                <th>Case Owner</th>
                <th>Last Review</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {complaintsSummary.cases.map((complaint) => (
                <tr key={complaint.caseRef}>
                  <td>{complaint.caseRef}</td>
                  <td>{complaint.caseOwner || "—"}</td>
                  <td>
                    {complaint.lastReview
                      ? new Date(
                          complaint.lastReview
                        ).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                  <td>{complaint.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">
          No open complaints.
        </p>
      )}
    </div>
  </section>
)}



        {/* =====================================================
            PLACEHOLDER SECTIONS
        ====================================================== */}

       {currentSection !== "overview" &&
  currentSection !== "documentation" &&
  currentSection !== "members" &&
    currentSection !== "safeguarding" &&  (
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