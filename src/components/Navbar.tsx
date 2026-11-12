import React from 'react';
import { useBeverage } from '../context/BeverageContext';
import {
  Smartphone,
  Monitor,
  Database,
  Bell,
  BellOff,
  RefreshCw,
  SmartphoneCharging,
  LogOut,
  User,
  Truck,
  ShoppingBag,
  Store,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    customerMobileFrame,
    setCustomerMobileFrame,
    currentUser,
    logout,
    orders,
    soundEnabled,
    toggleSound,
    resetAllData,
    settings,
    cashShift,
  } = useBeverage();

  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'PENDENTE' || o.status === 'CONFIRMADO_PREPARO'
  ).length;

  const isDono = currentUser?.role === 'DONO';
  const isBalcao = currentUser?.role === 'BALCAO';
  const isMotoboy = currentUser?.role === 'MOTOBOY';
  const isCliente = currentUser?.role === 'CLIENTE';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveView(currentUser ? activeView : 'PORTAL_LOGIN')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black text-xl text-slate-950 group-hover:scale-105 transition-transform">
              🍻
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-100 bg-clip-text text-transparent">
                  {settings.storeName}
                </span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                    cashShift.status === 'OPEN'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {cashShift.status === 'OPEN' ? 'Caixa Aberto' : 'Caixa Fechado'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Ecossistema de Delivery & Frente de Caixa
              </p>
            </div>
          </div>

          {/* Central Navigation Switcher (Adaptable by Active Role) */}
          {currentUser && (
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shadow-inner">
              {/* Cliente View Option */}
              {(isCliente || isDono || isBalcao) && (
                <button
                  onClick={() => setActiveView('CUSTOMER_APP')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'CUSTOMER_APP'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>App Cliente</span>
                </button>
              )}

              {/* PDV / Balcão Option */}
              {(isDono || isBalcao) && (
                <button
                  onClick={() => setActiveView('EMPLOYEE_PDV')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold relative transition-all ${
                    activeView === 'EMPLOYEE_PDV'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>PDV {isDono ? '(Dono)' : '(Balcão)'}</span>
                  {pendingOrdersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse shadow-sm">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>
              )}

              {/* Motoboy App Option */}
              {(isMotoboy || isDono) && (
                <button
                  onClick={() => setActiveView('MOTOBOY_APP')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold relative transition-all ${
                    activeView === 'MOTOBOY_APP'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <span>App Motoboy</span>
                </button>
              )}

              {/* Arquitetura & Docs (apenas Dono ou atalho) */}
              {isDono && (
                <button
                  onClick={() => setActiveView('SYSTEM_ARCHITECTURE')}
                  className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'SYSTEM_ARCHITECTURE'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Docs</span>
                </button>
              )}
            </div>
          )}

          {/* Right Action buttons (User Badge, Device Toggle, Sound, Logout) */}
          <div className="flex items-center space-x-2">
            {/* User Session Badge */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-sm">
                    {isDono ? '👑' : isBalcao ? '🏪' : isMotoboy ? '🛵' : '📱'}
                  </span>
                  <div className="text-left leading-none">
                    <span className="font-bold text-white block text-[11px] truncate max-w-[110px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[9px] text-amber-400 font-extrabold uppercase">
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                {/* Botão Sair / Trocar Perfil */}
                <button
                  type="button"
                  onClick={logout}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Trocar de usuário ou sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveView('PORTAL_LOGIN')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shadow-md hover:bg-amber-400 transition-colors"
              >
                Acessar Portal
              </button>
            )}

            {/* Alternador Moldura Mobile vs Tela Cheia quando no App do Cliente */}
            {activeView === 'CUSTOMER_APP' && (
              <button
                onClick={() => setCustomerMobileFrame(!customerMobileFrame)}
                title={customerMobileFrame ? 'Mudar para tela cheia de computador' : 'Simular tela de celular'}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700"
              >
                <SmartphoneCharging className="w-3.5 h-3.5 text-amber-400" />
                <span>{customerMobileFrame ? 'Moldura Celular' : 'Modo Computador'}</span>
              </button>
            )}

            {/* Toggle Sound */}
            <button
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

            {/* Reset Data */}
            <button
              onClick={resetAllData}
              title="Reiniciar dados da demonstração"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

