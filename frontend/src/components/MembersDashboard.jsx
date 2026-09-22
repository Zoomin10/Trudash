import { useState } from "react";

function MembersDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "teams", label: "Teams" },
    { id: "payments", label: "Payments" },
    { id: "registration", label: "Registration" },
    { id: "agreements", label: "Agreements" },
  ];

  return (
    <div className="members-dashboard">
      <div className="page-header">
        <div>
          <h1>Members</h1>
          <p>
            Membership, registration, payment and agreement
            oversight.
          </p>
        </div>
      </div>

      <div className="members-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={
              activeTab === tab.id ? "active" : ""
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="members-content">
        {activeTab === "overview" && (
          <div>
            <h2>Membership Overview</h2>
          </div>
        )}

        {activeTab === "teams" && (
          <div>
            <h2>Teams</h2>
          </div>
        )}

        {activeTab === "payments" && (
          <div>
            <h2>Payments</h2>
          </div>
        )}

        {activeTab === "registration" && (
          <div>
            <h2>Registration</h2>
          </div>
        )}

        {activeTab === "agreements" && (
          <div>
            <h2>Agreements</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default MembersDashboard;