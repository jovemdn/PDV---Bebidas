import React from 'react';
import { BeverageProvider, useBeverage } from './context/BeverageContext';
import { Navbar } from './components/Navbar';
import { PortalLogin } from './components/Auth/PortalLogin';
import { CustomerView } from './components/CustomerApp/CustomerView';
import { PDVView } from './components/EmployeePDV/PDVView';
import { MotoboyView } from './components/MotoboyApp/MotoboyView';
import { ArchitectureView } from './components/ArchitectureDocs/ArchitectureView';
import { NotificationToast } from './components/NotificationToast';
import { ErrorBoundary } from './components/ErrorBoundary';

const MainContent: React.FC = () => {
  const { activeView, currentUser } = useBeverage();

  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <ErrorBoundary fallbackTitle="Erro ao carregar o aplicativo">
        {(!currentUser || activeView === 'PORTAL_LOGIN') && <PortalLogin />}
        {currentUser && activeView === 'CUSTOMER_APP' && <CustomerView />}
        {currentUser && activeView === 'EMPLOYEE_PDV' && <PDVView />}
        {currentUser && activeView === 'MOTOBOY_APP' && <MotoboyView />}
        {currentUser && activeView === 'SYSTEM_ARCHITECTURE' && <ArchitectureView />}
      </ErrorBoundary>
    </main>
  );
};

export default function App() {
  return (
    <BeverageProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
        <Navbar />
        <MainContent />
        <NotificationToast />
      </div>
    </BeverageProvider>
  );
}
