import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { BalcaoPDV } from './BalcaoPDV';
import { KDSDelivery } from './KDSDelivery';
import { LogisticaMotoboys } from './LogisticaMotoboys';
import { EstoqueVasilhames } from './EstoqueVasilhames';
import { ConfiguracoesPDV } from './ConfiguracoesPDV';
import { VendasDoDia } from './VendasDoDia';
import { CaixaModal } from './CaixaModal';
import {
  ShoppingBag,
  Bell,
  Truck,
  Package,
  TrendingUp,
  CircleDot,
  Settings,
  Lock,
  Unlock,
  AlertTriangle,
  Layers,
  Sparkles,
  BarChart3,
} from 'lucide-react';

export const PDVView: React.FC = () => {
  const { cashShift, orders, settings, currentUser } = useBeverage();
  const isDono = currentUser?.role === 'DONO' || !currentUser;
  const isBalcao = currentUser?.role === 'BALCAO';

  const [activeTab, setActiveTab] = useState<'KDS' | 'BALCAO' | 'VENDAS_DIA' | 'MOTOBOYS' | 'ESTOQUE' | 'CONFIG'>(
    isBalcao ? 'BALCAO' : 'KDS'
  );
  const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
  const [caixaModalMode, setCaixaModalMode] = useState<'OPEN' | 'CLOSE' | 'CLEAN' | 'HISTORY'>('CLOSE');

  const pendingDeliveryCount = orders.filter(
    (o) => o.channel === 'DELIVERY_APP' && (o.status === 'PENDENTE' || o.status === 'CONFIRMADO_PREPARO')
  ).length;

  const todayStr = new Date().toDateString();
  const todaySoldUnitsCount = orders
    .filter((o) => o.status !== 'CANCELADO' && new Date(o.createdAt).toDateString() === todayStr)
    .reduce(
      (sum, o) => sum + o.items.reduce((itemSum, it) => itemSum + it.unitsCount, 0),
      0
    );

  const totalBalcaoToday = cashShift.balcaoCash + cashShift.balcaoCard + cashShift.balcaoPix;
  const totalDeliveryToday = cashShift.deliveryCash + cashShift.deliveryCard + cashShift.deliveryPix;
  const totalGeral = totalBalcaoToday + totalDeliveryToday;

  const isCaixaOpen = cashShift.status === 'OPEN';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Banner de Aviso se o Caixa estiver Fechado */}
      {!isCaixaOpen && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">ATENÇÃO: O CAIXA ESTÁ ATUALMENTE FECHADO</h4>
              <p className="text-xs text-rose-300">
                Para lançar vendas no balcão e emitir cupons, abra o turno informando o fundo de troco inicial.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setCaixaModalMode('OPEN');
              setIsCaixaModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 self-start sm:self-auto shadow-md transition-all active:scale-95"
          >
            <Unlock className="w-4 h-4" />
            <span>Abrir Caixa com Fundo Inicial</span>
          </button>
        </div>
      )}

      {/* Metric Cards do Turno de Caixa com Botão de Gerenciamento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card Operador / Status Caixa */}
        <div
          onClick={() => {
            setCaixaModalMode(isCaixaOpen ? 'CLOSE' : 'OPEN');
            setIsCaixaModalOpen(true);
          }}
          className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all text-white flex items-center justify-between group shadow-lg"
          title="Clique para Abrir, Fechar ou Limpar Caixa"
        >
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Caixa & Turno
              </span>
              <span
                className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                  isCaixaOpen
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {isCaixaOpen ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            <span className="text-sm font-extrabold text-white mt-1 block truncate max-w-[150px]">
              {cashShift.cashierName}
            </span>
            <span className="text-[10px] text-amber-400 font-bold group-hover:underline flex items-center gap-0.5 mt-0.5">
              Gerenciar Caixa &rarr;
            </span>
          </div>

          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              isCaixaOpen
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isCaixaOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
        </div>

        {/* Card Vendas Balcão */}
        <div
          onClick={() => isDono && setActiveTab('VENDAS_DIA')}
          className={`p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white flex items-center justify-between shadow-lg ${
            isDono ? 'hover:border-amber-500/50 cursor-pointer group transition-all' : ''
          }`}
          title={isDono ? 'Clique para ver quais produtos estão saindo hoje' : undefined}
        >
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Frente de Caixa Balcão
            </span>
            <span className="text-base font-black text-amber-400 mt-0.5 block">
              R$ {totalBalcaoToday.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              {isDono ? (
                <span className="text-amber-300 font-semibold group-hover:underline">
                  Ver saídas do dia &rarr;
                </span>
              ) : (
                `Fundo: R$ ${cashShift.initialFloat.toFixed(2)}`
              )}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Card Delivery Express */}
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 text-white flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Delivery Express
            </span>
            <span className="text-base font-black text-cyan-400 mt-0.5 block">
              R$ {totalDeliveryToday.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">Taxa R$ {settings.defaultDeliveryFee.toFixed(2)}</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* Card Faturamento Total */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900 border border-amber-500/30 text-white flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-amber-300 uppercase font-black tracking-wider block">
              Faturamento do Turno
            </span>
            <span className="text-lg font-black text-white mt-0.5 block">
              R$ {totalGeral.toFixed(2)}
            </span>
            <span className="text-[10px] text-amber-200">Gaveta + Cartão + PIX</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* User Role Indicator Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-sm">{isDono ? '👑' : '🏪'}</span>
          <div>
            <span className="font-extrabold text-white">
              {currentUser?.name || (isDono ? 'Sr. Dono (Proprietário)' : 'Operador de Balcão')}
            </span>
            <span className="text-slate-400 text-[11px] ml-1.5">
              &bull; {isDono ? 'Administrador Geral (Acesso Completo)' : 'Perfil Balconista (Caixa & Atendimento)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isBalcao && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              ✓ Frente de Caixa & Abertura/Fechamento de Caixa Liberados
            </span>
          )}
          {isDono && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              ★ Controle Total: Estoque, Produtos, Motoboys, Caixa e Ajustes
            </span>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 gap-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('BALCAO')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-extrabold transition-all shrink-0 ${
              activeTab === 'BALCAO'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Frente de Caixa (Balcão)</span>
          </button>

          <button
            onClick={() => setActiveTab('KDS')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-extrabold transition-all shrink-0 ${
              activeTab === 'KDS'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Central de Pedidos (KDS)</span>
            {pendingDeliveryCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                {pendingDeliveryCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ESTOQUE')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-extrabold transition-all shrink-0 ${
              activeTab === 'ESTOQUE'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Estoque & Produtos</span>
          </button>

          {isDono && (
            <>
              <button
                onClick={() => setActiveTab('VENDAS_DIA')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-extrabold transition-all shrink-0 ${
                  activeTab === 'VENDAS_DIA'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Relatório de Vendas & Saídas</span>
                {todaySoldUnitsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                    {todaySoldUnitsCount} un hoje
                  </span>
                )}
                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                  Dono
                </span>
              </button>

              <button
                onClick={() => setActiveTab('MOTOBOYS')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-extrabold transition-all shrink-0 ${
                  activeTab === 'MOTOBOYS'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Logística & Motoboys</span>
                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                  Dono
                </span>
              </button>

              <button
                onClick={() => setActiveTab('CONFIG')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-extrabold transition-all shrink-0 ${
                  activeTab === 'CONFIG'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configurações do PDV</span>
                <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                  Dono
                </span>
              </button>
            </>
          )}
        </div>

        {/* Botão de Fechar/Abrir Caixa Rápido no Header */}
        <button
          onClick={() => {
            setCaixaModalMode(isCaixaOpen ? 'CLOSE' : 'OPEN');
            setIsCaixaModalOpen(true);
          }}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
            isCaixaOpen
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              : 'bg-emerald-500 text-slate-950 font-black hover:bg-emerald-400'
          }`}
        >
          {isCaixaOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          <span>{isCaixaOpen ? 'Fechar / Limpar Caixa' : 'Abrir Caixa'}</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'KDS' && <KDSDelivery />}
        {activeTab === 'BALCAO' && <BalcaoPDV />}
        {activeTab === 'VENDAS_DIA' && isDono && <VendasDoDia />}
        {activeTab === 'MOTOBOYS' && <LogisticaMotoboys />}
        {activeTab === 'ESTOQUE' && <EstoqueVasilhames />}
        {activeTab === 'CONFIG' && <ConfiguracoesPDV />}
      </div>

      {/* Modal de Gestão de Caixa */}
      <CaixaModal
        isOpen={isCaixaModalOpen}
        onClose={() => setIsCaixaModalOpen(false)}
        defaultMode={caixaModalMode}
      />
    </div>
  );
};
