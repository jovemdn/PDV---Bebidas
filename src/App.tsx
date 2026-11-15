import React, { useEffect, useState } from 'react';
import { BeverageProvider, useBeverage } from './context/BeverageContext';
import { Navbar } from './components/Navbar';
import { PortalLogin } from './components/Auth/PortalLogin';
import { CustomerView } from './components/CustomerApp/CustomerView';
import { PDVView } from './components/EmployeePDV/PDVView';
import { MotoboyView } from './components/MotoboyApp/MotoboyView';
import { ArchitectureView } from './components/ArchitectureDocs/ArchitectureView';
import { NotificationToast } from './components/NotificationToast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SystemHubPage } from './components/Hub/SystemHubPage';
import { AppPageRoute } from './types';
import { parseCurrentRoute } from './services/routeService';

const EmployeePortalContent: React.FC = () => {
  const { activeView, currentUser } = useBeverage();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100">
      <ErrorBoundary fallbackTitle="Erro ao carregar o painel da equipe">
        {(!currentUser || activeView === 'PORTAL_LOGIN') && <PortalLogin />}
        {currentUser && activeView === 'EMPLOYEE_PDV' && <PDVView />}
        {currentUser && activeView === 'MOTOBOY_APP' && <MotoboyView />}
        {currentUser && activeView === 'SYSTEM_ARCHITECTURE' && <ArchitectureView />}
      </ErrorBoundary>
    </main>
  );
};

export default function App() {
  const [route, setRoute] = useState<AppPageRoute>(() => parseCurrentRoute());

  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (route.page === 'HUB') {
    return (
      <ErrorBoundary fallbackTitle="Erro ao carregar a página inicial">
        <SystemHubPage />
      </ErrorBoundary>
    );
  }

  if (route.page === 'CUSTOMER_STORE') {
    return (
      <BeverageProvider>
        <ErrorBoundary fallbackTitle="Erro ao carregar a loja">
          <CustomerView />
          <NotificationToast allowEmployeeAction={false} />
        </ErrorBoundary>
      </BeverageProvider>
    );
  }

  // EMPLOYEE_PORTAL (/equipe)
  return (
    <BeverageProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
        <Navbar />
        <EmployeePortalContent />
        <NotificationToast allowEmployeeAction={true} />
      </div>
    </BeverageProvider>
  );
}
