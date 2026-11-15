import React from 'react';
import { useBeverage } from '../context/BeverageContext';
import { buildRoutePath, navigateToRoute } from '../services/routeService';
import { isSyntheticStaffEmail } from '../services/firebaseDbService';
import {
  Monitor,
  Database,
  Bell,
  BellOff,
  RefreshCw,
  LogOut,
  Truck,
  ExternalLink,
  Home,
  Cloud,
  CloudOff,
  AlertTriangle,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    currentUser,
    logout,
    orders,
    soundEnabled,
    toggleSound,
    resetAllData,
    settings,
    cashShift,
    cloudUser,
    cloudRoleStatus,
    cloudSyncing,
    connectCloudGoogle,
  } = useBeverage();

  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'PENDENTE' || o.status === 'CONFIRMADO_PREPARO'
  ).length;

  const isDono = currentUser?.role === 'DONO';
  const isBalcao = currentUser?.role === 'BALCAO';
  const isMotoboy = currentUser?.role === 'MOTOBOY';

  const customerStoreUrl = buildRoutePath({ page: 'CUSTOMER_STORE' });

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand Wordmark + Cash Status */}
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => navigateToRoute({ page: 'HUB' })}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
              title="Voltar à Central de Páginas"
            >
              <Home className="w-4 h-4" />
            </button>

            <div
              onClick={() => setActiveView(currentUser ? activeView : 'PORTAL_LOGIN')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center font-display font-extrabold text-sm text-slate-950 shrink-0">
                DS
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-base tracking-tight text-white whitespace-nowrap">
                    {settings.storeName}
                  </span>
                  <span
                    className={`hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
                      cashShift.status === 'OPEN'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {cashShift.status === 'OPEN' ? 'Caixa Aberto' : 'Caixa Fechado'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden lg:block whitespace-nowrap">
                  Portal Operacional da Equipe
                </p>
              </div>
            </div>
          </div>

          {/* Zone 2: Role-Scoped Workspace Navigation */}
          {currentUser && (
            <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              {(isDono || isBalcao) && (
                <button
                  type="button"
                  onClick={() => setActiveView('EMPLOYEE_PDV')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeView === 'EMPLOYEE_PDV'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Monitor className="w-4 h-4 shrink-0" />
                  <span>PDV {isDono ? '(Dono)' : '(Balcão)'}</span>
                  {pendingOrdersCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono-tabular font-bold leading-none">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>
              )}

              {(isMotoboy || isDono) && (
                <button
                  type="button"
                  onClick={() => setActiveView('MOTOBOY_APP')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeView === 'MOTOBOY_APP'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>Entregas</span>
                </button>
              )}

              {isDono && (
                <button
                  type="button"
                  onClick={() => setActiveView('SYSTEM_ARCHITECTURE')}
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeView === 'SYSTEM_ARCHITECTURE'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  <span>Arquitetura</span>
                </button>
              )}
            </nav>
          )}

          {/* Zone 3: Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {cloudUser &&
            (cloudUser.emailVerified || isSyntheticStaffEmail(cloudUser.email)) &&
            (cloudRoleStatus.isOwner || cloudRoleStatus.isAuthorizedStaff) ? (
              <div
                title={
                  isSyntheticStaffEmail(cloudUser.email)
                    ? `Nuvem conectada: @${cloudRoleStatus.staffUsername || 'equipe'} (${cloudRoleStatus.role || 'Equipe'})`
                    : `Nuvem conectada: ${cloudUser.email} (${cloudRoleStatus.isOwner ? 'Dono' : 'Equipe'})`
                }
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold whitespace-nowrap"
              >
                <Cloud className={`w-3.5 h-3.5 ${cloudSyncing ? 'animate-pulse' : ''}`} />
                <span>{cloudSyncing ? 'Sincronizando...' : 'Nuvem Online'}</span>
              </div>
            ) : cloudUser?.emailVerified ? (
              <button
                type="button"
                onClick={() => void connectCloudGoogle()}
                title={`Conta ${cloudUser.email} não autorizada na equipe. Clique para trocar de conta Google.`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Conta sem Permissão</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void connectCloudGoogle()}
                disabled={cloudSyncing}
                title="Conectar conta Google do Dono para sincronizar PC, Motoboy e App Cliente na nuvem"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer"
              >
                <CloudOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{cloudSyncing ? 'Conectando...' : 'Conectar Nuvem'}</span>
              </button>
            )}

            {currentUser && (
              <a
                href={customerStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap transition-colors"
                title="Abrir página pública do cliente em nova aba"
              >
                <span>Loja do Cliente</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              </a>
            )}

            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Silenciar alertas sonoros' : 'Ativar alertas sonoros'}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>

            {isDono && (
              <button
                type="button"
                onClick={resetAllData}
                title="Zerar pedidos e caixa para novo turno"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {currentUser && (
              <div className="flex items-center gap-2 pl-1">
                <div className="hidden lg:block text-right leading-tight">
                  <span className="font-semibold text-white block text-xs truncate max-w-[130px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-amber-400 font-bold uppercase">
                    {currentUser.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                  title="Trocar de operador ou sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
