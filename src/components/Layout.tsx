import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "./Dashboard";
import { Documents } from "./Documents";
import { StorageAnalytics } from "./StorageAnalytics";

const Workflows = () => (
  <div className="p-6">
    <h1 className="text-3xl font-semibold mb-4 text-foreground">Workflows & Tasks</h1>
    <p className="text-muted-foreground">Document approval workflows coming soon...</p>
  </div>
);

const Settings = () => (
  <div className="p-6">
    <h1 className="text-3xl font-semibold mb-4 text-foreground">Settings</h1>
    <p className="text-muted-foreground">System preferences coming soon...</p>
  </div>
);

export function Layout() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "documents":
        return <Documents />;
      case "storage":
        return <StorageAnalytics />;
      case "workflows":
        return <Workflows />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8faf9] text-foreground font-sans">
      <div className="flex-shrink-0">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
      <main className="flex-1 overflow-auto bg-[#f8faf9]">
        {renderContent()}
      </main>
    </div>
  );
}