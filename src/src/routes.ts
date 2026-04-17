import { createBrowserRouter } from "react-router";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import DocumentDetail from "./pages/DocumentDetail";
import BOMExplorer from "./pages/BOMExplorer";
import PLKnowledgeHub from "./pages/PLKnowledgeHub";
import PLDetail from "./pages/PLDetail";
import AdminWorkspace from "./pages/AdminWorkspace";
import Login from "./pages/Login";
// SearchExplorer merged into Documents page
import WorkLedger from "./pages/WorkLedger";
import LedgerReports from "./pages/LedgerReports";
import Cases from "./pages/Cases";
import Approvals from "./pages/Approvals";
import Reports from "./pages/Reports";
import OCRMonitor from "./pages/OCRMonitor";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import BannerManagement from "./pages/BannerManagement";
import RestrictedAccess from "./pages/RestrictedAccess";
import DesignSystem from "./pages/DesignSystem";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: AppLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "documents", Component: Documents },
      { path: "documents/:id", Component: DocumentDetail },
      { path: "bom", Component: BOMExplorer },
      { path: "pl", Component: PLKnowledgeHub },
      { path: "pl/:id", Component: PLDetail },
      { path: "ledger", Component: WorkLedger },
      { path: "ledger-reports", Component: LedgerReports },
      { path: "cases", Component: Cases },
      { path: "approvals", Component: Approvals },
      { path: "reports", Component: Reports },
      { path: "admin", Component: AdminWorkspace },
      { path: "ocr", Component: OCRMonitor },
      { path: "audit", Component: AuditLog },
      { path: "settings", Component: Settings },
      { path: "banners", Component: BannerManagement },
      { path: "restricted", Component: RestrictedAccess },
      { path: "design-system", Component: DesignSystem },
      { path: "*", Component: Dashboard },
    ],
  },
]);
