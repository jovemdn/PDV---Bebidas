import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { CashFlowCategory, CashFlowType } from '../../types';
import { firebaseAuth, syncCashFlowToFirestore } from '../../services/firebaseDbService';
import { signInWithGoogleForGmail } from '../../services/gmailService';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Cloud,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';

const QUICK_EXPENSE_PRESETS: {
  label: string;
  type: CashFlowType;
  category: CashFlowCategory;
  description: string;
}[] = [
  {
    label: 'Detergente / Limpeza',
    type: 'RETIRADA_DESPESA',
    category: 'DESPESA_LOJA',
    description: 'Compra de detergente e material de limpeza da loja',
  },
  {
    label: 'Sacolas / Embalagens',
    type: 'RETIRADA_DESPESA',
    category: 'DESPESA_LOJA',
    description: 'Compra de sacolas e embalagens',
  },
  {
    label: 'Combustível Motoboy',
    type: 'RETIRADA_DESPESA',
    category: 'FORNECEDOR',
    description: 'Vale combustível / despesa de entrega',
  },
  {
    label: 'Gelo / Mercadoria Rápida',
    type: 'RETIRADA_DESPESA',
    category: 'FORNECEDOR',
    description: 'Compra avulsa de mercadoria para reposição',
  },
  {
    label: 'Retirada do Dono',
    type: 'RETIRADA_DESPESA',
    category: 'RETIRADA_DONO',
    description: 'Retirada em dinheiro pelo proprietário',
  },
  {
    label: 'Reforço de Troco',
    type: 'SUPRIMENTO',
    category: 'TROCO_REFORCO',
    description: 'Entrada de dinheiro/moedas para troco no caixa',
  },
];

const CATEGORY_LABELS: Record<CashFlowCategory, string> = {
  DESPESA_LOJA: 'Despesa da Loja',
  RETIRADA_DONO: 'Retirada do Dono',
  FORNECEDOR: 'Fornecedor / Mercadoria',
  TROCO_REFORCO: 'Reforço de Troco',
  OUTROS: 'Outros',
};

export const FluxoCaixaPanel: React.FC = () => {
  const {
    cashShift,
    cashFlows,
    addCashFlowMovement,
    removeCashFlowMovement,
    currentUser,
  } = useBeverage();

  const isDono = currentUser?.role === 'DONO' || !currentUser;

  const [flowType, setFlowType] = useState<CashFlowType>('RETIRADA_DESPESA');
  const [category, setCategory] = useState<CashFlowCategory>('DESPESA_LOJA');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [filterScope, setFilterScope] = useState<'TURNO' | 'TODOS'>('TURNO');
  const [filterType, setFilterType] = useState<'ALL' | CashFlowType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [cloudEmail, setCloudEmail] = useState<string | null>(
    firebaseAuth.currentUser?.email || null
  );
  const [cloudLoading, setCloudLoading] = useState(false);

  const shiftFlows = cashFlows.filter((f) => f.shiftId === cashShift.id);
  const totalInflowsShift = shiftFlows
    .filter((f) => f.type === 'SUPRIMENTO')
    .reduce((sum, f) => sum + f.amount, 0);
  const totalOutflowsShift = shiftFlows
    .filter((f) => f.type === 'RETIRADA_DESPESA')
    .reduce((sum, f) => sum + f.amount, 0);

  const grossDrawerCash =
    cashShift.initialFloat + cashShift.balcaoCash + cashShift.deliveryCash;
  const realDrawerBalance =
    grossDrawerCash + totalInflowsShift - totalOutflowsShift;

  const displayedFlows = (filterScope === 'TURNO' ? shiftFlows : cashFlows).filter((f) => {
    if (filterType !== 'ALL' && f.type !== filterType) return false;
    if (
      searchQuery.trim() &&
      !f.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !CATEGORY_LABELS[f.category].toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleApplyPreset = (preset: (typeof QUICK_EXPENSE_PRESETS)[number]) => {
    setFlowType(preset.type);
    setCategory(preset.category);
    setDescription(preset.description);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsedAmount = parseFloat(amountInput.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Informe um valor válido maior que R$ 0,00.');
      return;
    }
    const res = addCashFlowMovement({
      type: flowType,
      category,
      amount: parsedAmount,
      description,
    });
    if (!res.success) {
      setFormError(res.message || 'Não foi possível registrar.');
      return;
    }
    setAmountInput('');
    setDescription('');
  };

  const handleSyncCloud = async () => {
    setCloudLoading(true);
    try {
      const { user } = await signInWithGoogleForGmail();
      setCloudEmail(user.email || 'Conectado');
      for (const flow of cashFlows) {
        await syncCashFlowToFirestore(flow);
      }
    } catch {
      // ignora se popup cancelado
    } finally {
      setCloudLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Fluxo de Caixa */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Controle Financeiro do Dono
          </span>
          <h2 className="text-xl font-display font-extrabold text-white mt-0.5">
            Fluxo de Caixa, Retiradas e Despesas da Loja
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registre dinheiro retirado da gaveta para compras avulsas (ex: detergente, limpeza,
            sacolas) ou reforços de troco. Tudo abate automaticamente no fechamento.
          </p>
        </div>

        <button
          type="button"
          disabled={cloudLoading}
          onClick={() => void handleSyncCloud()}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border inline-flex items-center gap-2 shrink-0 transition-colors ${
            cloudEmail
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>{cloudEmail ? `Nuvem: ${cloudEmail}` : 'Sincronizar Nuvem'}</span>
        </button>
      </div>

      {/* 4 Cards de Resumo em Tempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Dinheiro Bruto (Fundo + Vendas)</span>
            <Banknote className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-xl font-extrabold font-mono-tabular text-white mt-1.5 block">
            R$ {grossDrawerCash.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-mono-tabular">
            Fundo R$ {cashShift.initialFloat.toFixed(2)} + Vendas R${' '}
            {(cashShift.balcaoCash + cashShift.deliveryCash).toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span>(+) Suprimentos no Turno</span>
            <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-extrabold font-mono-tabular text-emerald-400 mt-1.5 block">
            + R$ {totalInflowsShift.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Reforços colocados na gaveta
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-rose-400">
            <span>(-) Retiradas / Despesas</span>
            <ArrowDownCircle className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-xl font-extrabold font-mono-tabular text-rose-400 mt-1.5 block">
            - R$ {totalOutflowsShift.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Compras p/ loja, sangrias e vales
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>(=) Saldo Real na Gaveta</span>
            <Wallet className="w-4 h-4 text-amber-400" />
          </div>
          <span
            className={`text-xl font-extrabold font-mono-tabular mt-1.5 block ${
              realDrawerBalance >= 0 ? 'text-amber-300' : 'text-rose-400'
            }`}
          >
            R$ {realDrawerBalance.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Valor exato que deve haver em espécie
          </span>
        </div>
      </div>

      {/* Grid Principal: Novo Lançamento vs Extrato */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Formulário */}
        <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-white">Registrar Movimentação</h3>

          {/* Tipo: Retirada/Despesa vs Suprimento */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setFlowType('RETIRADA_DESPESA');
                if (category === 'TROCO_REFORCO') setCategory('DESPESA_LOJA');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                flowType === 'RETIRADA_DESPESA'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>Retirada / Despesa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFlowType('SUPRIMENTO');
                setCategory('TROCO_REFORCO');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                flowType === 'SUPRIMENTO'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>Suprimento / Reforço</span>
            </button>
          </div>

          {/* Atalhos Rápidos */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Atalhos comuns da loja:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_EXPENSE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-amber-300 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CashFlowCategory)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="DESPESA_LOJA">Despesa da Loja (ex: Detergente)</option>
                  <option value="RETIRADA_DONO">Retirada do Dono</option>
                  <option value="FORNECEDOR">Fornecedor / Mercadoria</option>
                  <option value="TROCO_REFORCO">Reforço de Troco</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono-tabular font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Descrição / O que foi comprado ou motivo
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: 2 detergentes e esponja para limpeza do balcão"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                flowType === 'RETIRADA_DESPESA'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>
                {flowType === 'RETIRADA_DESPESA'
                  ? 'Registrar Retirada / Despesa do Caixa'
                  : 'Registrar Suprimento no Caixa'}
              </span>
            </button>
          </form>
        </div>

        {/* Coluna Direita: Extrato de Movimentações */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-white">
                Extrato de Movimentações ({displayedFlows.length})
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterScope('TURNO')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                    filterScope === 'TURNO'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Turno Atual
                </button>
                <button
                  type="button"
                  onClick={() => setFilterScope('TODOS')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                    filterScope === 'TODOS'
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Histórico Geral
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por descrição (ex: detergente)..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'ALL' | CashFlowType)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">Todas as Operações</option>
                <option value="RETIRADA_DESPESA">Somente Retiradas / Despesas</option>
                <option value="SUPRIMENTO">Somente Suprimentos</option>
              </select>
            </div>
          </div>

          {displayedFlows.length === 0 ? (
            <div className="py-14 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-500 space-y-1.5">
              <Wallet className="w-7 h-7 mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-300">
                Nenhuma retirada ou suprimento registrado neste filtro.
              </p>
              <p className="text-[11px]">
                Use o formulário ao lado sempre que pegar dinheiro da gaveta para despesas da loja.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto rounded-2xl bg-slate-950 border border-slate-800">
              {displayedFlows.map((flow) => {
                const isInflow = flow.type === 'SUPRIMENTO';
                return (
                  <div
                    key={flow.id}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isInflow
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {isInflow ? (
                          <ArrowUpCircle className="w-4 h-4" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{flow.description}</p>
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-amber-400 font-semibold">
                            {CATEGORY_LABELS[flow.category]}
                          </span>
                          <span>&bull;</span>
                          <span>{flow.createdBy}</span>
                          <span>&bull;</span>
                          <span className="font-mono-tabular">
                            {new Date(flow.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`font-mono-tabular font-extrabold text-sm ${
                          isInflow ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isInflow ? '+' : '-'} R$ {flow.amount.toFixed(2)}
                      </span>

                      {isDono &&
                        (confirmDeleteId === flow.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300"
                            >
                              Não
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                removeCashFlowMovement(flow.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 text-[10px] font-bold text-white"
                            >
                              Excluir
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(flow.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Estornar / Remover lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
