import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { BalcaoPDV } from './BalcaoPDV';
import { KDSDelivery } from './KDSDelivery';
import { LogisticaMotoboys } from './LogisticaMotoboys';
import { EstoqueVasilhames } from './EstoqueVasilhames';
import { ConfiguracoesPDV } from './ConfiguracoesPDV';
import { VendasDoDia } from './VendasDoDia';
import { FluxoCaixaPanel } from './FluxoCaixaPanel';
import { MesasPDV } from './MesasPDV';
import { CaixaModal } from './CaixaModal';
import {
  ShoppingBag,
  Bell,
  Truck,
  Package,
  TrendingUp,
  Settings,
  Lock,
  Unlock,
  BarChart3,
  Wallet,
  UtensilsCrossed,
} from 'lucide-react';

export const PDVView: React.FC = () => {
  const { cashShift, orders, tables, settings, currentUser } = useBeverage();
  const isDono = currentUser?.role === 'DONO' || !currentUser;

  const [activeTab, setActiveTab] = useState<
    'BALCAO' | 'MESAS' | 'KDS' | 'ESTOQUE' | 'VENDAS_DIA' | 'FLUXO_CAIXA' | 'MOTOBOYS' | 'CONFIG'
  >('BALCAO');
  const openTablesCount = tables.filter((t) => t.status === 'OPEN').length;
  const [isCaixaModalOpen, setIsCaixaModalOpen] = useState(false);
  const [caixaModalMode, setCaixaModalMode] = useState<'OPEN' | 'CLOSE' | 'CLEAN' | 'HISTORY'>('OPEN');

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      {/* Aviso Claro de Caixa Fechado com Botão Direto */}
      {!isCaixaOpen && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/35 text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white">Caixa Fechado</h4>
              <p className="text-xs text-slate-300">
                Clique em <strong className="text-white">Abrir Caixa</strong> para iniciar o turno e liberar as vendas do balcão.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCaixaModalMode('OPEN');
              setIsCaixaModalOpen(true);
            }}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 self-start sm:self-auto transition-colors cursor-pointer shrink-0"
          >
            <Unlock className="w-4 h-4" />
            <span>Abrir Caixa Agora</span>
          </button>
        </div>
      )}

      {/* 4 Cards Principais do Turno (Limpos e Fáceis de Ler) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card Caixa & Turno */}
        <button
          type="button"
          onClick={() => {
            setCaixaModalMode(isCaixaOpen ? 'CLOSE' : 'OPEN');
            setIsCaixaModalOpen(true);
          }}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-left transition-colors text-white flex items-center justify-between group cursor-pointer"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-400">
              Caixa ·{' '}
              <span className={isCaixaOpen ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {isCaixaOpen ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            <span className="text-sm font-extrabold text-white mt-1 block truncate">
              {isCaixaOpen ? cashShift.cashierName : 'Clique para abrir'}
            </span>
            <span className="text-[11px] text-amber-400 font-semibold group-hover:underline mt-0.5 block">
              {isCaixaOpen ? 'Fechar ou conferir caixa' : 'Iniciar turno'}
            </span>
          </div>

          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isCaixaOpen
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {isCaixaOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
        </button>

        {/* Card Vendas Balcão */}
        <button
          type="button"
          onClick={() => setActiveTab(isDono ? 'VENDAS_DIA' : 'BALCAO')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left text-white flex items-center justify-between transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">
              Vendas no Balcão
            </span>
            <span className="text-lg font-extrabold text-amber-400 mt-0.5 block font-mono-tabular">
              R$ {totalBalcaoToday.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono-tabular">
              Fundo: R$ {cashShift.initialFloat.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </button>

        {/* Card Delivery Express */}
        <button
          type="button"
          onClick={() => setActiveTab('KDS')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left text-white flex items-center justify-between transition-colors cursor-pointer"
        >
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">
              Pedidos Delivery
            </span>
            <span className="text-lg font-extrabold text-cyan-400 mt-0.5 block font-mono-tabular">
              R$ {totalDeliveryToday.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono-tabular">
              {pendingDeliveryCount > 0
                ? `${pendingDeliveryCount} aguardando`
                : `Taxa R$ ${settings.defaultDeliveryFee.toFixed(2)}`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </button>

        {/* Card Faturamento Total */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/35 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-300 block">
              Total do Turno
            </span>
            <span className="text-lg font-extrabold text-white mt-0.5 block font-mono-tabular">
              R$ {totalGeral.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400">Dinheiro + Cartão + PIX</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navegação Simplificada por Abas */}
      <div className="flex items-center justify-between border-b border-slate-800 gap-3 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('BALCAO')}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'BALCAO'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Frente de Caixa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MESAS')}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'MESAS'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4 shrink-0" />
            <span>Mesas</span>
            {openTablesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-mono-tabular font-extrabold leading-none">
                {openTablesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('KDS')}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'KDS'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Pedidos Delivery</span>
            {pendingDeliveryCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-mono-tabular font-extrabold leading-none">
                {pendingDeliveryCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ESTOQUE')}
            className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'ESTOQUE'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Estoque e Produtos</span>
          </button>

          {isDono && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('VENDAS_DIA')}
                className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'VENDAS_DIA'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span>Vendas e Saídas</span>
                {todaySoldUnitsCount > 0 && (
                  <span className="text-[11px] font-mono-tabular text-emerald-400 font-bold">
                    ({todaySoldUnitsCount})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('FLUXO_CAIXA')}
                className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'FLUXO_CAIXA'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <Wallet className="w-4 h-4 shrink-0" />
                <span>Fluxo de Caixa</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MOTOBOYS')}
                className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'MOTOBOYS'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <Truck className="w-4 h-4 shrink-0" />
                <span>Motoboys</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('CONFIG')}
                className={`min-h-[44px] flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'CONFIG'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-xl'
                    : 'border-transparent text-slate-300 hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Configurações</span>
              </button>
            </>
          )}
        </nav>

        {/* Botão Fechar/Abrir Caixa Rápido */}
        <button
          type="button"
          onClick={() => {
            setCaixaModalMode(isCaixaOpen ? 'CLOSE' : 'OPEN');
            setIsCaixaModalOpen(true);
          }}
          className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer mb-1 ${
            isCaixaOpen
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              : 'bg-emerald-500 text-slate-950 border-emerald-500 hover:bg-emerald-400'
          }`}
        >
          {isCaixaOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          <span>{isCaixaOpen ? 'Fechar Caixa' : 'Abrir Caixa'}</span>
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div>
        {activeTab === 'BALCAO' && (
          <BalcaoPDV
            onOpenCaixaRequest={() => {
              setCaixaModalMode('OPEN');
              setIsCaixaModalOpen(true);
            }}
          />
        )}
        {activeTab === 'MESAS' && (
          <MesasPDV
            onOpenCaixaRequest={() => {
              setCaixaModalMode('OPEN');
              setIsCaixaModalOpen(true);
            }}
          />
        )}
        {activeTab === 'KDS' && <KDSDelivery />}
        {activeTab === 'ESTOQUE' && <EstoqueVasilhames />}
        {activeTab === 'VENDAS_DIA' && isDono && <VendasDoDia />}
        {activeTab === 'FLUXO_CAIXA' && isDono && <FluxoCaixaPanel />}
        {activeTab === 'MOTOBOYS' && <LogisticaMotoboys />}
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
