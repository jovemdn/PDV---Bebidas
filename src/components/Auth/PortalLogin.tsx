import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { UserRole, DeviceMode } from '../../types';
import {
  ShoppingBag,
  Shield,
  Truck,
  Store,
  Key,
  User,
  Smartphone,
  Monitor,
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const PortalLogin: React.FC = () => {
  const {
    loginAsCustomer,
    loginAsEmployee,
    loginAsQuickRole,
    settings,
    cashShift,
    motoboys,
  } = useBeverage();

  // Mode selection inside portal: 'SELECTION' or 'EMPLOYEE_FORM'
  const [activePortalTab, setActivePortalTab] = useState<'CHOICE' | 'EMPLOYEE_LOGIN'>('CHOICE');

  // Form states
  const [username, setUsername] = useState('dono');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedMotoboyId, setSelectedMotoboyId] = useState(motoboys[0]?.id || 'boy-1');
  const [formError, setFormError] = useState<string | null>(null);

  // Customer device preference
  const [customerDeviceChoice, setCustomerDeviceChoice] = useState<DeviceMode>('MOBILE');

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = loginAsEmployee(username, password, selectedMotoboyId);
    if (!res.success) {
      setFormError(res.message || 'Credenciais inválidas.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 flex flex-col justify-between text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto w-full my-auto space-y-8">
        {/* Top Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Ecossistema Integrado de Depósito de Bebidas
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {settings.storeName}{' '}
            <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-400 bg-clip-text text-transparent">
              🍻
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Selecione como deseja acessar o sistema: faça seu pedido como cliente ou acesse o painel operacional da equipe.
          </p>
        </div>

        {/* Two Main Cards: Cliente vs Funcionário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card 1: ÁREA DO CLIENTE */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-900/90 border-2 border-amber-500/30 hover:border-amber-500/60 transition-all p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-amber-950/20 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sem Senha / Acesso Rápido
                </span>

                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30">
                  📱
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Área do Cliente
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Faça pedidos de cervejas geladas ou naturais, fardos com desconto de atacado, destilados, gelo e carvão.
                </p>
              </div>

              {/* Destaques das Regras Brasileiras */}
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Venda em <strong>unidade</strong> ou <strong>fardo fechado</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Escolha entre <strong>Gelada ❄️</strong> ou <strong>Natural</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Troca de <strong>Vasilhames/Cascos</strong> ou compra do casco</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Chat em tempo real com o motoboy e a loja</span>
                </div>
              </div>

              {/* Device Mode Switcher for Customer */}
              <div className="bg-slate-950/80 p-2 rounded-2xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block px-1">
                  Modo de Exibição do App:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerDeviceChoice('MOBILE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      customerDeviceChoice === 'MOBILE'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>App no Celular</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCustomerDeviceChoice('DESKTOP')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      customerDeviceChoice === 'DESKTOP'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Site no Computador</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 relative z-10">
              <button
                type="button"
                onClick={() => loginAsCustomer(customerDeviceChoice)}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Entrar na Área do Cliente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: ÁREA DO FUNCIONÁRIO (DONO, BALCÃO, MOTOBOY) */}
          <div className="rounded-3xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 transition-all p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Acesso Restrito c/ Senha
                </span>

                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-black text-xl">
                  <Store className="w-6 h-6" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Área do Funcionário
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Acesso diferenciado por cargo: o Dono administra tudo, o Balcão opera vendas e caixa, e o Motoboy gerencia entregas.
                </p>
              </div>

              {/* Formulário de Login de Funcionários */}
              <form onSubmit={handleEmployeeSubmit} className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Usuário ou Cargo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ex: dono, balcao ou motoboy"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha (padrão: 123)"
                      className="w-full pl-9 pr-10 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Fazer Login com Usuário e Senha</span>
                </button>
              </form>

              {/* Acessos Rápidos com 1 Clique para Teste Imediato */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">
                  Ou acesse rapidamente pelo cargo (1 clique):
                </span>

                <div className="grid grid-cols-1 gap-2">
                  {/* Botão Dono */}
                  <button
                    type="button"
                    onClick={() => loginAsQuickRole('DONO')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-black shrink-0">
                        👑
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                            Dono da Loja (Administrador)
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                            Tudo Liberado
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Estoque, produtos, motoboys, caixa e configurações
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                  </button>

                  {/* Botão Balconista */}
                  <button
                    type="button"
                    onClick={() => loginAsQuickRole('BALCAO')}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-black shrink-0">
                        🏪
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                            Funcionário do Balcão
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase">
                            Balcão + Caixa
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Frente de caixa, abrir/fechar caixa e KDS
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </button>

                  {/* Botão Motoboy */}
                  <button
                    type="button"
                    onClick={() => loginAsQuickRole('MOTOBOY', selectedMotoboyId)}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-black shrink-0">
                        🛵
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors">
                            Funcionário Motoboy
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                            App de Entregas
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Entregas, chat, WhatsApp, ligar e confirmar entrega
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info Bar */}
        <div className="max-w-4xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {settings.address}, {settings.city}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {settings.phone}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                cashShift.status === 'OPEN'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {cashShift.status === 'OPEN' ? 'Caixa da Loja Aberto' : 'Caixa Fechado'}
            </span>
            <span>CNPJ: {settings.cnpj}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
