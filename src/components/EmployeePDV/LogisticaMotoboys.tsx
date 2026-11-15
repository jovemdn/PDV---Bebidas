import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Motoboy } from '../../types';
import { MotoboyModal } from './MotoboyModal';
import {
  Truck,
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  FileText,
  Clock,
  Printer,
  Sparkles,
  Phone,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  Power,
  Users,
} from 'lucide-react';

export const LogisticaMotoboys: React.FC = () => {
  const {
    motoboys,
    settleMotoboyShift,
    deleteMotoboy,
    toggleMotoboyOnline,
  } = useBeverage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [motoboyToEdit, setMotoboyToEdit] = useState<Motoboy | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [settlementReport, setSettlementReport] = useState<string | null>(null);

  const handleSettleShift = (boy: Motoboy) => {
    const res = settleMotoboyShift(boy.id);
    if (res.success) {
      setSettlementReport(res.receipts);
    }
  };

  const onlineCount = motoboys.filter((m) => m.isOnline).length;
  const totalDeliveriesToday = motoboys.reduce((sum, m) => sum + m.totalDeliveriesCompletedToday, 0);
  const totalMoneyInHands = motoboys.reduce((sum, m) => sum + m.totalCollectedCash, 0);

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-3xl border border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Controle de Frota & Arrecadação
          </span>
          <h2 className="text-lg font-black text-white mt-0.5">
            Logística de Motoboys & Fechamento de Caixa por Entregador
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre novos entregadores, edite dados de motos e faça o acerto de contas de dinheiro/maquininha.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setMotoboyToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Motoboy</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo da Frota */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Entregadores em Plantão
            </span>
            <span className="text-xl font-black text-white mt-0.5 block">
              {onlineCount} de {motoboys.length} online
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">
              Prontos para despacho KDS
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Entregas Realizadas Hoje
            </span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">
              {totalDeliveriesToday} viagens
            </span>
            <span className="text-[10px] text-slate-400">Pela frota total</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Dinheiro na Rua a Recolher
            </span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              R$ {totalMoneyInHands.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">Em mãos dos motoboys</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid de Motoboys */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {motoboys.map((boy) => {
          const totalArrecadado =
            boy.totalCollectedCash + boy.totalCollectedCard + boy.totalCollectedPix;
          const hasPendingMoney = boy.totalCollectedCash > 0 || boy.totalCollectedCard > 0;

          return (
            <div
              key={boy.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-xl ${
                boy.isOnline
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-900/60 border-slate-800/60 opacity-80'
              }`}
            >
              <div>
                {/* Header do Card com Status, Editar e Excluir */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black ${
                        boy.isOnline
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">{boy.name}</h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" /> {boy.phone}
                      </p>
                    </div>
                  </div>

                  {/* Ações Rápidas: Toggle Plantão, Editar, Excluir */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleMotoboyOnline(boy.id)}
                      title={boy.isOnline ? 'Clique para colocar Off-line' : 'Clique para colocar Em Plantão'}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        boy.isOnline
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{boy.isOnline ? 'Online' : 'Offline'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setMotoboyToEdit(boy);
                        setIsModalOpen(true);
                      }}
                      title="Editar Informações do Motoboy"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {deleteConfirmId === boy.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            deleteMotoboy(boy.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-1.5 py-1 rounded bg-slate-800 text-slate-400 text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(boy.id)}
                        title="Remover Motoboy"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Veículo & Corridas do Dia */}
                <div className="py-3 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Veículo:</span>
                    <span className="text-slate-200 font-medium">
                      {boy.vehicleModel} ({boy.vehiclePlate})
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Status de Plantão:</span>
                    <span className={boy.isOnline ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>
                      {boy.isOnline ? '● Em Plantão (Disponível)' : '○ Fora de Plantão'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Entregas hoje:</span>
                    <span className="text-emerald-400 font-bold">
                      {boy.totalDeliveriesCompletedToday} concluídas
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Entregas em rota agora:</span>
                    <span className="text-amber-400 font-bold">
                      {boy.activeDeliveriesCount} ativa(s)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                    <span>Diária / Comissão acumulada:</span>
                    <span className="text-white font-extrabold">
                      R$ {boy.commissionBalance.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Demonstrativo de Valores Cobrados pelo Entregador */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2 mt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Saldo a Prestar Contas (Na Rua):
                  </span>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-amber-300">
                      <span className="flex items-center gap-1">
                        <Banknote className="w-3.5 h-3.5" /> Dinheiro em mãos:
                      </span>
                      <strong className="text-sm">R$ {boy.totalCollectedCash.toFixed(2)}</strong>
                    </div>

                    <div className="flex justify-between text-slate-300">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-blue-400" /> Maquininha Cartão:
                      </span>
                      <span>R$ {boy.totalCollectedCard.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-slate-300">
                      <span className="flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" /> PIX na Entrega:
                      </span>
                      <span>R$ {boy.totalCollectedPix.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs font-bold text-white">
                    <span>Total Arrecadado:</span>
                    <span className="text-sm font-black text-amber-400">
                      R$ {totalArrecadado.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ação de Fechamento de Caixa do Motoboy */}
              <div className="pt-4 mt-3 border-t border-slate-800">
                <button
                  disabled={!hasPendingMoney}
                  onClick={() => handleSettleShift(boy)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    hasPendingMoney
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {hasPendingMoney ? 'Fechar Caixa & Prestar Contas' : 'Caixa do Motoboy Zerado'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Extrato do Fechamento Realizado */}
      {settlementReport && (
        <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-white space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Comprovante de Acerto Emitido com Sucesso
            </h3>
            <button
              onClick={() => setSettlementReport(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Fechar
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-emerald-200 text-xs font-mono whitespace-pre-wrap">
            {settlementReport}
          </pre>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Acerto Térmico</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Criar / Editar Motoboy */}
      <MotoboyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        motoboyToEdit={motoboyToEdit}
      />
    </div>
  );
};
