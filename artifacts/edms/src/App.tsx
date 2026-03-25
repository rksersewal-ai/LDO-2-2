import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './lib/auth';
import { DocTabsProvider } from './contexts/DocTabsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DocumentHub from './pages/DocumentHub';
import DocumentDetail from './pages/DocumentDetail';
import BOMExplorer from './pages/BOMExplorer';
import BOMProductView from './pages/BOMProductView';
import PLKnowledgeHub from './pages/PLKnowledgeHub';
import PLDetail from './pages/PLDetail';
import WorkLedger from './pages/WorkLedger';
import LedgerReports from './pages/LedgerReports';
import Cases from './pages/Cases';
import Approvals from './pages/Approvals';
import Reports from './pages/Reports';
import AdminWorkspace from './pages/AdminWorkspace';
import OCRMonitor from './pages/OCRMonitor';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';
import BannerManagement from './pages/BannerManagement';
import RestrictedAccess from './pages/RestrictedAccess';
import DesignSystem from './pages/DesignSystem';
import DocumentIngestion from './pages/DocumentIngestion';
import SearchExplorer from './pages/SearchExplorer';
import AlertRules from './pages/AlertRules';
import DocumentTemplates from './pages/DocumentTemplates';
import SystemHealth from './pages/SystemHealth';

const ALL_ROLES = ['admin', 'supervisor', 'engineer', 'reviewer', 'viewer'] as const;
const ADMIN_ONLY = ['admin'] as const;
const ADMIN_SUPERVISOR = ['admin', 'supervisor'] as const;
const ENGINEER_UP = ['admin', 'supervisor', 'engineer'] as const;
const REVIEWER_UP = ['admin', 'supervisor', 'engineer', 'reviewer'] as const;

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <ProtectedRoute allowedRoles={[...ALL_ROLES]}><Dashboard /></ProtectedRoute> },
      { path: 'search', element: <ProtectedRoute allowedRoles={[...ALL_ROLES]}><SearchExplorer /></ProtectedRoute> },
      { path: 'documents', element: <ProtectedRoute allowedRoles={[...ALL_ROLES]}><DocumentHub /></ProtectedRoute> },
      { path: 'documents/ingest', element: <ProtectedRoute allowedRoles={[...ALL_ROLES]}><DocumentIngestion /></ProtectedRoute> },
      { path: 'documents/:id', element: <ProtectedRoute allowedRoles={[...ALL_ROLES]}><DocumentDetail /></ProtectedRoute> },
      { path: 'bom', element: <ProtectedRoute allowedRoles={[...ENGINEER_UP]}><BOMExplorer /></ProtectedRoute> },
      { path: 'bom/:productId', element: <ProtectedRoute allowedRoles={[...ENGINEER_UP]}><BOMProductView /></ProtectedRoute> },
      { path: 'pl', element: <ProtectedRoute allowedRoles={[...ENGINEER_UP]}><PLKnowledgeHub /></ProtectedRoute> },
      { path: 'pl/:id', element: <ProtectedRoute allowedRoles={[...ENGINEER_UP]}><PLDetail /></ProtectedRoute> },
      { path: 'ledger', element: <ProtectedRoute allowedRoles={[...ENGINEER_UP]}><WorkLedger /></ProtectedRoute> },
      { path: 'ledger-reports', element: <ProtectedRoute allowedRoles={[...ADMIN_SUPERVISOR]}><LedgerReports /></ProtectedRoute> },
      { path: 'cases', element: <ProtectedRoute allowedRoles={[...REVIEWER_UP]}><Cases /></ProtectedRoute> },
      { path: 'approvals', element: <ProtectedRoute allowedRoles={[...REVIEWER_UP]}><Approvals /></ProtectedRoute> },
      { path: 'reports', element: <ProtectedRoute allowedRoles={[...ADMIN_SUPERVISOR]}><Reports /></ProtectedRoute> },
      { path: 'alerts', element: <ProtectedRoute allowedRoles={[...REVIEWER_UP]}><AlertRules /></ProtectedRoute> },
      { path: 'templates', element: <ProtectedRoute allowedRoles={[...ALL_ROLES]}><DocumentTemplates /></ProtectedRoute> },
      { path: 'admin', element: <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}><AdminWorkspace /></ProtectedRoute> },
      { path: 'ocr', element: <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}><OCRMonitor /></ProtectedRoute> },
      { path: 'audit', element: <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}><AuditLog /></ProtectedRoute> },
      { path: 'health', element: <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}><SystemHealth /></ProtectedRoute> },
      { path: 'settings', element: <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}><Settings /></ProtectedRoute> },
      { path: 'banners', element: <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}><BannerManagement /></ProtectedRoute> },
      { path: 'restricted', element: <RestrictedAccess /> },
      { path: 'design-system', element: <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}><DesignSystem /></ProtectedRoute> },
    ],
  },
]);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DocTabsProvider>
          <RouterProvider router={router} />
        </DocTabsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
