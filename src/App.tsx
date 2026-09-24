import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { MonthlyMatrixView } from './components/matrix/MonthlyMatrixView';
import { UploadView } from './components/upload/UploadView';
import { AuditTrailView } from './components/audit/AuditTrailView';
import { CoaListView } from './components/coa/CoaListView';
import { UserManagementView } from './components/users/UserManagementView';
import { RlsPolicyModal } from './components/common/RlsPolicyModal';

const VegaAppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matrix' | 'upload' | 'audit' | 'coa' | 'users'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [showRlsModal, setShowRlsModal] = useState<boolean>(false);

  // If user is not authenticated, render corporate login interface
  if (!isAuthenticated) {
    return (
      <>
        <LoginView onOpenRlsModal={() => setShowRlsModal(true)} />
        <RlsPolicyModal isOpen={showRlsModal} onClose={() => setShowRlsModal(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800 flex font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Primary Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onOpenRlsModal={() => setShowRlsModal(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Navigation Bar */}
        <Header
          activeTab={activeTab}
          onOpenRlsModal={() => setShowRlsModal(true)}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateToUpload={() => setActiveTab('upload')}
              onNavigateToMatrix={() => setActiveTab('matrix')}
            />
          )}

          {activeTab === 'matrix' && (
            <MonthlyMatrixView />
          )}

          {activeTab === 'upload' && (
            <UploadView
              onNavigateToDashboard={() => setActiveTab('dashboard')}
              onNavigateToMatrix={() => setActiveTab('matrix')}
              onNavigateToAudit={() => setActiveTab('audit')}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrailView />
          )}

          {activeTab === 'coa' && (
            <CoaListView />
          )}

          {activeTab === 'users' && (
            <UserManagementView />
          )}
        </main>
      </div>

      {/* Supabase RLS Schema & Security Inspector Modal */}
      <RlsPolicyModal
        isOpen={showRlsModal}
        onClose={() => setShowRlsModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <VegaAppContent />
      </DataProvider>
    </AuthProvider>
  );
}
