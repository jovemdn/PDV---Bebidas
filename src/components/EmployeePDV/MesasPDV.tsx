import React, { useEffect, useRef, useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { PaymentMethod, Product, ProductCategory, TableTab } from '../../types';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  Snowflake,
  Thermometer,
  CheckCircle,
  Banknote,
  QrCode,
  CreditCard,
  Clock,
  User,
  Unlock,
  X,
  Receipt,
  AlertCircle,
} from 'lucide-react';

interface MesasPDVProps {
  onOpenCaixaRequest?: () => void;
}

const QUICK_TABLE_LABELS = [
  'Mesa 01',
  'Mesa 02',
  'Mesa 03',
  'Mesa 04',
  'Mesa 05',
  'Mesa 06',
  'Mesa 07',
  'Mesa 08',
  'Mesa 09',
  'Mesa 10',
];

export const MesasPDV: React.FC<MesasPDVProps> = ({ onOpenCaixaRequest }) => {
  const {
    products,
    tables,
    cashShift,
    settings,
    openTable,
    addProductToTable,
    updateTableItemQty,
    removeTableItem,
    renameTableCustomer,
    closeTableCheckout,
    cancelOpenTable,
  } = useBeverage();

  const openTables = tables.filter((t) => t.status === 'OPEN');
  const todayStr = new Date().toDateString();
  const closedTablesToday = tables.filter(
    (t) => t.status === 'CLOSED' && new Date(t.closedAt || t.openedAt).toDateString() === todayStr
  );

  const [selectedTableId, setSelectedTableId] = useState<string | null>(openTables[0]?.id || null);
  const selectedTable = openTables.find((t) => t.id === selectedTableId) || openTables[0] || null;
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Formulário de abrir nova mesa
  const [newTableLabel, setNewTableLabel] = useState('');
  const [newTableCustomer, setNewTableCustomer] = useState('');
  const [mesaError, setMesaError] = useState<string | null>(null);

  // Busca de produtos para lançar na mesa
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('todas');
  const [preferredTemp, setPreferredTemp] = useState<'GELADA' | 'NATURAL'>('GELADA');

  // Pagamento ao fechar a mesa
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [receivedCashInput, setReceivedCashInput] = useState<string>('');
  const [confirmCancelTableId, setConfirmCancelTableId] = useState<string | null>(null);

  // Relatório para conferência ou comprovante final (para impressão)
  const [reportTable, setReportTable] = useState<TableTab | null>(null);

  useEffect(() => {
    setReceivedCashInput('');
    setMesaError(null);
    setConfirmCancelTableId(null);
  }, [selectedTable?.id]);

  const categories: { id: ProductCategory; label: string }[] = [
    { id: 'todas', label: 'Todos' },
    { id: 'cervejas', label: 'Cervejas' },
    { id: 'destilados', label: 'Destilados & Drinks' },
    { id: 'refrigerantes', label: 'Bebidas / Refri' },
    { id: 'gelo_churrasco', label: 'Gelo & Carvão' },
    { id: 'petiscos', label: 'Petiscos / Doces / Cigarros' },
  ];

  // Calcula quanto de cada produto já está reservado nas mesas abertas
  const getReservedQty = (productId: string) =>
    openTables.reduce(
      (sum, t) =>
        sum +
        t.items
          .filter((it) => it.productId === productId)
          .reduce((s, it) => s + it.quantity * it.unitsPerItem, 0),
      0
    );

  const filteredProducts = products
    .filter((p) => {
      const matchesCat = selectedCategory === 'todas' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesQ =
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q);
      return matchesCat && matchesQ;
    })
    .sort((a, b) => {
      const aStock = a.currentBaseStock - getReservedQty(a.id) > 0 ? 0 : 1;
      const bStock = b.currentBaseStock - getReservedQty(b.id) > 0 ? 0 : 1;
      return aStock - bStock;
    });

  const handleQuickOpenTable = (presetLabel?: string) => {
    setMesaError(null);
    if (presetLabel) {
      const existing = openTables.find(
        (t) => t.numberOrLabel.toLowerCase() === presetLabel.toLowerCase()
      );
      if (existing) {
        setSelectedTableId(existing.id);
        setTimeout(() => {
          workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 40);
        return;
      }
    }

    const labelToUse =
      presetLabel ||
      newTableLabel.trim() ||
      `Mesa ${String(openTables.length + 1).padStart(2, '0')}`;
    const res = openTable(labelToUse, newTableCustomer);
    if (res.success && res.table) {
      setSelectedTableId(res.table.id);
      setNewTableLabel('');
      setNewTableCustomer('');
      setTimeout(() => {
        workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 40);
    } else if (res.error) {
      setMesaError(res.error);
    }
  };

  const handleAddProduct = (product: Product, presentation: 'UNIDADE' | 'FARDO') => {
    if (!selectedTable) return;
    setMesaError(null);
    const chosenTemp = product.supportsCold ? preferredTemp : 'NATURAL';
    const res = addProductToTable(
      selectedTable.id,
      product,
      presentation,
      chosenTemp,
      product.isReturnable ? 'TROCA' : 'NAO_APLICA'
    );
    if (!res.success && res.error) {
      setMesaError(res.error);
    }
  };

  const tableTotal = selectedTable?.totalAmount || 0;
  const hasTableItems = Boolean(selectedTable && selectedTable.items.length > 0 && tableTotal > 0);
  const parsedReceivedCash = (() => {
    if (!hasTableItems) return undefined;
    const cleaned = receivedCashInput.replace(/\s+/g, '').replace(',', '.');
    if (!cleaned || cleaned === '.') return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  })();
  const changeAmount =
    hasTableItems &&
    paymentMethod === 'DINHEIRO' &&
    parsedReceivedCash !== undefined &&
    parsedReceivedCash > tableTotal
      ? parsedReceivedCash - tableTotal
      : 0;
  const missingAmount =
    hasTableItems &&
    paymentMethod === 'DINHEIRO' &&
    parsedReceivedCash !== undefined &&
    parsedReceivedCash > 0 &&
    parsedReceivedCash < tableTotal
      ? tableTotal - parsedReceivedCash
      : 0;

  const handleCloseTableAccount = async () => {
    if (!selectedTable) return;
    setMesaError(null);

    if (
      paymentMethod === 'DINHEIRO' &&
      parsedReceivedCash !== undefined &&
      parsedReceivedCash > 0 &&
      parsedReceivedCash < tableTotal
    ) {
      setMesaError(
        `O valor recebido (R$ ${parsedReceivedCash.toFixed(2)}) é menor que o total da mesa (R$ ${tableTotal.toFixed(2)}).`
      );
      return;
    }

    const res = await closeTableCheckout(selectedTable.id, paymentMethod, parsedReceivedCash);
    if (res.success && res.table) {
      setReportTable(res.table);
      setReceivedCashInput('');
      const nextOpen = tables.find((t) => t.status === 'OPEN' && t.id !== selectedTable.id);
      setSelectedTableId(nextOpen?.id || null);
    } else if (res.error) {
      setMesaError(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior: Abrir Mesa Rápido + Mesas Abertas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Controle de Mesas / Comandas</h2>
              <p className="text-xs text-slate-400">
                Abra a mesa para o cliente, vá lançando tudo o que ele pegar e no final confira e imprima o relatório completo.
              </p>
            </div>
          </div>

          {/* Form compacto para abrir nova mesa */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuickOpenTable();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={newTableLabel}
              onChange={(e) => setNewTableLabel(e.target.value)}
              placeholder={`Ex: Mesa ${String(openTables.length + 1).padStart(2, '0')}`}
              className="w-32 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={newTableCustomer}
              onChange={(e) => setNewTableCustomer(e.target.value)}
              placeholder="Nome do cliente (opcional)"
              className="w-44 sm:w-52 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="min-h-[38px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Mesa</span>
            </button>
          </form>
        </div>

        {/* Botões rápidos Mesa 01 .. Mesa 10 */}
        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Acesso Rápido — Clique para abrir ou selecionar uma mesa:
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_TABLE_LABELS.map((label) => {
              const opened = openTables.find(
                (t) => t.numberOrLabel.toLowerCase() === label.toLowerCase()
              );
              const isSelected = Boolean(opened && selectedTable?.id === opened.id);
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleQuickOpenTable(label)}
                  className={`px-3 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                      : opened
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span>{label}</span>
                  {opened && (
                    <span
                      className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-emerald-500/20 text-emerald-200'
                      }`}
                    >
                      R$ {opened.totalAmount.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista de Mesas Abertas Personalizadas (além ou junto das numeradas) */}
        {openTables.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
            {openTables.map((t) => {
              const isActive = selectedTable?.id === t.id;
              const itemsCount = t.items.reduce((s, it) => s + it.quantity, 0);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTableId(t.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/40'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-xs font-black text-white truncate">
                        {t.numberOrLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.customerName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · Aberta{' '}
                      {new Date(t.openedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-amber-400 font-mono-tabular">
                      R$ {t.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Área Principal: Lançamento de Produtos na Mesa Selecionada + Comanda da Mesa */}
      {!selectedTable ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-2.5">
          <UtensilsCrossed className="w-9 h-9 text-slate-600 mx-auto" />
          <h3 className="text-sm font-extrabold text-white">Nenhuma mesa aberta no momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Clique em qualquer botão acima (como <strong>Mesa 01</strong>) ou digite o nome do cliente e clique em <strong>Abrir Mesa</strong> para começar a lançar o consumo.
          </p>
        </div>
      ) : (
        <div ref={workspaceRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Lado Esquerdo: Catálogo para adicionar itens na mesa */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Buscar produto para lançar na ${selectedTable.numberOrLabel}...`}
                    className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreferredTemp('GELADA')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      preferredTemp === 'GELADA'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>Gelada</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredTemp('NATURAL')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      preferredTemp === 'NATURAL'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Thermometer className="w-3.5 h-3.5" />
                    <span>Natural</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const available = Math.max(0, p.currentBaseStock - getReservedQty(p.id));
                const isOutOfStock = !settings.allowNegativeStock && available <= 0;
                const chosenTemp = p.supportsCold ? preferredTemp : 'NATURAL';
                const unitPriceDisplay =
                  p.priceUnit + (chosenTemp === 'GELADA' ? p.coldSurchargeUnit : 0);
                const packPriceDisplay =
                  p.pricePack + (chosenTemp === 'GELADA' ? p.coldSurchargePack : 0);

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-white flex flex-col justify-between"
                  >
                    <div className="flex gap-3">
                      {p.image && (
                        <img
                          src={p.image}
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover bg-slate-950 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-amber-400 uppercase">
                          {p.code ? `Cód. ${p.code} • ` : ''}
                          {p.brand} • {p.volume}
                        </span>
                        <h4 className="text-xs font-bold truncate text-white">{p.name}</h4>
                        <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                          Disponível: {available} un
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => handleAddProduct(p, 'UNIDADE')}
                        className={`min-h-[42px] py-2 px-2 rounded-xl border text-[11px] font-extrabold transition-all flex flex-col items-center justify-center leading-tight cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-950 border-slate-700 hover:border-amber-500 hover:bg-amber-500/15 text-slate-100 active:scale-95'
                        }`}
                      >
                        <span className="text-amber-400">+ 1 Unidade</span>
                        <span className="text-[10px] font-mono-tabular">
                          R$ {unitPriceDisplay.toFixed(2)}
                        </span>
                      </button>

                      {p.conversionFactor > 1 ? (
                        <button
                          type="button"
                          disabled={isOutOfStock || (!settings.allowNegativeStock && available < p.conversionFactor)}
                          onClick={() => handleAddProduct(p, 'FARDO')}
                          className={`min-h-[42px] py-2 px-2 rounded-xl border text-[11px] font-extrabold transition-all flex flex-col items-center justify-center leading-tight cursor-pointer ${
                            isOutOfStock || (!settings.allowNegativeStock && available < p.conversionFactor)
                              ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 text-amber-300 active:scale-95'
                          }`}
                        >
                          <span>+ 1 Fardo ({p.conversionFactor}un)</span>
                          <span className="text-[10px] font-mono-tabular">
                            R$ {packPriceDisplay.toFixed(2)}
                          </span>
                        </button>
                      ) : (
                        <div className="rounded-xl bg-slate-950/40 border border-slate-800/50 flex items-center justify-center text-[10px] text-slate-500">
                          Venda Unitária
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lado Direito: Resumo de Tudo que o Cliente Pegou na Mesa + Fechar Conta + Imprimir */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col space-y-4 lg:sticky lg:top-20 shadow-2xl">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black">
                    {selectedTable.numberOrLabel}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Aberta{' '}
                    {new Date(selectedTable.openedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={selectedTable.customerName}
                    onChange={(e) => renameTableCustomer(selectedTable.id, e.target.value)}
                    placeholder="Nome do cliente na mesa"
                    className="w-full px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Botão imprimir conferência da mesa aberta */}
              <button
                type="button"
                disabled={selectedTable.items.length === 0}
                onClick={() => setReportTable(selectedTable)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer shrink-0"
                title="Ver e imprimir relatório completo do que o cliente pegou na mesa"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Relatório</span>
              </button>
            </div>

            {/* Itens consumidos na mesa */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {selectedTable.items.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  Nenhum item lançado ainda nesta mesa. Clique nos produtos ao lado para adicionar.
                </div>
              ) : (
                selectedTable.items.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-white truncate">{it.productName}</h5>
                      <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2 mt-0.5">
                        <span>{it.presentation === 'FARDO' ? 'Fardo' : 'Unidade'}</span>
                        <span>· {it.temperature === 'GELADA' ? 'Gelada' : 'Natural'}</span>
                        <span>· R$ {it.unitPrice.toFixed(2)}/cada</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() => updateTableItemQty(selectedTable.id, it.id, -1)}
                          className="p-1.5 hover:bg-slate-800 text-slate-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-black text-white font-mono-tabular">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const res = updateTableItemQty(selectedTable.id, it.id, 1);
                            if (!res.success && res.error) setMesaError(res.error);
                          }}
                          className="p-1.5 hover:bg-slate-800 text-slate-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-black text-amber-400 font-mono-tabular w-16 text-right">
                        R$ {it.subtotal.toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeTableItem(selectedTable.id, it.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Forma de Pagamento para Fechar a Mesa */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DINHEIRO')}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'DINHEIRO'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" /> Dinheiro
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PIX')}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'PIX'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" /> PIX
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARTAO_ENTREGA')}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'CARTAO_ENTREGA'
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Cartão
                </button>
              </div>

              {paymentMethod === 'DINHEIRO' && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Valor Recebido (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={!hasTableItems}
                        value={hasTableItems ? receivedCashInput : ''}
                        onChange={(e) => {
                          if (!hasTableItems) return;
                          setReceivedCashInput(e.target.value.replace(/[^0-9.,]/g, ''));
                        }}
                        placeholder={hasTableItems ? 'Ex: 100,00' : 'Adicione itens'}
                        className="w-full px-3 py-2 text-sm rounded-xl bg-slate-900 border border-slate-700 text-white font-black font-mono-tabular disabled:opacity-40"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-center min-h-[54px]">
                      {missingAmount > 0 ? (
                        <>
                          <span className="text-[9px] font-bold uppercase text-rose-400">
                            Falta Receber
                          </span>
                          <span className="text-sm font-black text-rose-400 font-mono-tabular">
                            R$ {missingAmount.toFixed(2)}
                          </span>
                        </>
                      ) : changeAmount > 0 ? (
                        <>
                          <span className="text-[9px] font-bold uppercase text-emerald-400">
                            Troco
                          </span>
                          <span className="text-base font-black text-emerald-400 font-mono-tabular">
                            R$ {changeAmount.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[9px] font-bold uppercase text-slate-400">
                            Troco
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {parsedReceivedCash !== undefined ? 'Exato (R$ 0,00)' : 'Informe valor'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {hasTableItems && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReceivedCashInput(tableTotal.toFixed(2))}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-[10px] font-black text-emerald-300 border border-emerald-500/30 cursor-pointer"
                      >
                        Exato (R$ {tableTotal.toFixed(2)})
                      </button>
                      {[20, 50, 100, 200].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setReceivedCashInput(v.toFixed(2))}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 border border-slate-700 cursor-pointer"
                        >
                          R$ {v}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {mesaError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{mesaError}</span>
                </div>
              )}

              {cashShift.status === 'CLOSED' && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-200 font-semibold">
                    Caixa fechado. Abra o caixa para fechar a conta.
                  </span>
                  {onOpenCaixaRequest && (
                    <button
                      type="button"
                      onClick={onOpenCaixaRequest}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Abrir Caixa</span>
                    </button>
                  )}
                </div>
              )}

              {/* Total e Botões Finais */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block">Total da Mesa</span>
                  <span className="text-2xl font-black text-amber-400 font-mono-tabular">
                    R$ {tableTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!hasTableItems || cashShift.status === 'CLOSED'}
                  onClick={handleCloseTableAccount}
                  className={`min-h-[48px] px-5 py-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                    !hasTableItems || cashShift.status === 'CLOSED'
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg active:scale-95'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Fechar Conta e Imprimir</span>
                </button>
              </div>

              {/* Cancelar mesa aberta */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                {confirmCancelTableId === selectedTable.id ? (
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="text-rose-300 font-bold">Cancelar e limpar esta mesa?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          cancelOpenTable(selectedTable.id);
                          setConfirmCancelTableId(null);
                          setSelectedTableId(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancelTableId(null)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelTableId(selectedTable.id)}
                    className="text-slate-500 hover:text-rose-400 font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar / Remover mesa aberta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Mesas Fechadas Hoje */}
      {closedTablesToday.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Mesas Fechadas Hoje ({closedTablesToday.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {closedTablesToday.map((t) => {
              const totalUnits = t.items.reduce((s, it) => s + it.quantity, 0);
              return (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {t.numberOrLabel}
                        </span>
                        {t.orderNumber && (
                          <span className="text-[10px] text-slate-400">Cupom #{t.orderNumber}</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white mt-1.5">{t.customerName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {totalUnits} {totalUnits === 1 ? 'item' : 'itens'} · Fechada às{' '}
                        {new Date(t.closedAt || t.openedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ({t.paymentMethod === 'CARTAO_ENTREGA' ? 'Cartão' : t.paymentMethod})
                      </p>
                    </div>
                    <span className="text-sm font-black text-emerald-400 font-mono-tabular">
                      R$ {t.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReportTable(t)}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Ver / Imprimir Relatório da Mesa</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Relatório Completo da Mesa (Pré-conta ou Fechamento + Impressão) */}
      {reportTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            id="mesa-print-area"
            className="bg-white text-slate-900 p-6 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto font-mono text-xs shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-3">
              <div className="space-y-0.5">
                <h3 className="font-black text-sm uppercase">{settings.storeName}</h3>
                <p className="text-[10px] text-slate-600">{settings.address}</p>
                <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>
                <p className="text-[10px] font-bold text-slate-900 pt-1">
                  {reportTable.status === 'CLOSED'
                    ? 'RELATÓRIO FINAL DE MESA FECHADA'
                    : 'CONFERÊNCIA DE CONSUMO DA MESA (ABERTA)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportTable(null)}
                className="no-print p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Mesa / Comanda:</span>
                <strong className="text-slate-900">{reportTable.numberOrLabel}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <strong className="text-slate-900">{reportTable.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Abertura:</span>
                <span>{new Date(reportTable.openedAt).toLocaleString('pt-BR')}</span>
              </div>
              {reportTable.closedAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Fechamento:</span>
                  <span>{new Date(reportTable.closedAt).toLocaleString('pt-BR')}</span>
                </div>
              )}
              {reportTable.orderNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Cupom PDV:</span>
                  <span>#{reportTable.orderNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Atendente:</span>
                <span>{reportTable.closedBy || reportTable.openedBy}</span>
              </div>
            </div>

            <div className="space-y-2 border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                <span>Qtd · Produto</span>
                <span>Subtotal</span>
              </div>
              {reportTable.items.map((it) => (
                <div key={it.id} className="space-y-0.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      {it.quantity}x {it.productName} ({it.presentation === 'FARDO' ? 'Fardo' : 'Un'})
                    </span>
                    <span className="font-bold shrink-0">R$ {it.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>
                      {it.temperature === 'GELADA' ? 'Gelada' : 'Natural'} · R$ {it.unitPrice.toFixed(2)}/un
                    </span>
                    <span>
                      {new Date(it.addedAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 font-bold">
              <div className="flex justify-between text-[11px] font-normal text-slate-600">
                <span>Total de itens lançados:</span>
                <span>{reportTable.items.reduce((s, it) => s + it.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900">
                <span>TOTAL DA MESA:</span>
                <span>R$ {reportTable.totalAmount.toFixed(2)}</span>
              </div>
              {reportTable.paymentMethod && (
                <div className="flex justify-between text-[11px] font-normal text-slate-700 pt-1">
                  <span>
                    Pagamento:{' '}
                    {reportTable.paymentMethod === 'CARTAO_ENTREGA'
                      ? 'Cartão'
                      : reportTable.paymentMethod}
                  </span>
                  {reportTable.paymentMethod === 'DINHEIRO' &&
                    reportTable.changeFor &&
                    reportTable.changeFor > reportTable.totalAmount && (
                      <span>
                        Troco: R$ {(reportTable.changeFor - reportTable.totalAmount).toFixed(2)}
                      </span>
                    )}
                </div>
              )}
            </div>

            <div className="no-print pt-3 border-t border-dashed border-slate-300 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-black flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </button>
              <button
                type="button"
                onClick={() => setReportTable(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
