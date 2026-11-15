import React, { useEffect, useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Product, ProductCategory, CartItem, PaymentMethod, Order } from '../../types';
import { CancelOrderModal } from './CancelOrderModal';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  CreditCard,
  Banknote,
  QrCode,
  Snowflake,
  Thermometer,
  RefreshCw,
  ShoppingBag,
  Printer,
  Calculator,
  Lock,
  Unlock,
  Clock,
  Ban,
} from 'lucide-react';

interface BalcaoPDVProps {
  onOpenCaixaRequest?: () => void;
}

export const BalcaoPDV: React.FC<BalcaoPDVProps> = ({ onOpenCaixaRequest }) => {
  const {
    products,
    orders,
    cashShift,
    currentUser,
    submitBalcaoCheckout,
    receiveEmptyVasilhames,
    vasilhames,
    settings,
  } = useBeverage();

  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [recentFilter, setRecentFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELED'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('todas');
  const [preferredTemp, setPreferredTemp] = useState<'GELADA' | 'NATURAL'>('GELADA');

  const [searchQuery, setSearchQuery] = useState('');
  const [ticketItems, setTicketItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');
  const [receivedCashInput, setReceivedCashInput] = useState<string>('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedTicket, setLastCompletedTicket] = useState<{
    items: CartItem[];
    total: number;
    payment: PaymentMethod;
    change: number;
  } | null>(null);

  // Quick bottle intake form on counter
  const [showBottleIntake, setShowBottleIntake] = useState(false);
  const [intakeVasilhameId, setIntakeVasilhameId] = useState(vasilhames[0]?.id || '');
  const [intakeQty, setIntakeQty] = useState(12);

  const categories: { id: ProductCategory; label: string }[] = [
    { id: 'todas', label: 'Todos' },
    { id: 'cervejas', label: 'Cervejas' },
    { id: 'destilados', label: 'Destilados & Drinks' },
    { id: 'refrigerantes', label: 'Bebidas / Refri' },
    { id: 'gelo_churrasco', label: 'Gelo & Carvão' },
    { id: 'petiscos', label: 'Petiscos / Doces / Cigarros' },
  ];

  // Filtered products for quick sales
  const filteredProducts = products
    .filter((p) => {
      const matchesCategory = selectedCategory === 'todas' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const aInStock = a.currentBaseStock > 0 ? 0 : 1;
      const bInStock = b.currentBaseStock > 0 ? 0 : 1;
      return aInStock - bInStock;
    });

  // Add item directly to the counter ticket
  const addItemToTicket = (
    product: Product,
    presentation: 'UNIDADE' | 'FARDO',
    temperature: 'GELADA' | 'NATURAL',
    vasilhameOption: 'TROCA' | 'COMPRAR_CASCO' | 'NAO_APLICA'
  ) => {
    const unitsPerItem = presentation === 'FARDO' ? product.conversionFactor : 1;
    const basePrice = presentation === 'FARDO' ? product.pricePack : product.priceUnit;
    const coldSurcharge =
      temperature === 'GELADA'
        ? presentation === 'FARDO'
          ? product.coldSurchargePack
          : product.coldSurchargeUnit
        : 0;

    let vasilhameFee = 0;
    if (product.isReturnable && vasilhameOption === 'COMPRAR_CASCO') {
      vasilhameFee = (product.vasilhameDepositPrice || 3.5) * unitsPerItem;
    }

    const calculatedUnitPrice = basePrice + coldSurcharge + vasilhameFee;

    // Check if already in ticket
    const existingIndex = ticketItems.findIndex(
      (i) =>
        i.productId === product.id &&
        i.presentation === presentation &&
        i.temperature === temperature &&
        i.vasilhameOption === vasilhameOption
    );

    if (existingIndex > -1) {
      const updated = [...ticketItems];
      const prev = updated[existingIndex];
      const newQty = prev.quantity + 1;
      updated[existingIndex] = {
        ...prev,
        quantity: newQty,
        coldSurchargeTotal: coldSurcharge * newQty,
        vasilhameFeeTotal: vasilhameFee * newQty,
        subtotal: calculatedUnitPrice * newQty,
        unitsDeductedFromBaseStock: newQty * unitsPerItem,
      };
      setTicketItems(updated);
    } else {
      const newItem: CartItem = {
        id: `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        product,
        presentation,
        temperature,
        vasilhameOption,
        quantity: 1,
        unitPriceCalculated: calculatedUnitPrice,
        coldSurchargeTotal: coldSurcharge,
        vasilhameFeeTotal: vasilhameFee,
        subtotal: calculatedUnitPrice,
        unitsDeductedFromBaseStock: unitsPerItem,
      };
      setTicketItems((prev) => [...prev, newItem]);
    }
  };

  const updateTicketQty = (id: string, delta: number) => {
    const item = ticketItems.find((i) => i.id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setTicketItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    const unitsPerItem = item.presentation === 'FARDO' ? item.product.conversionFactor : 1;
    setTicketItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity: newQty,
              subtotal: i.unitPriceCalculated * newQty,
              unitsDeductedFromBaseStock: newQty * unitsPerItem,
            }
          : i
      )
    );
  };

  const ticketTotal = ticketItems.reduce((acc, i) => acc + i.subtotal, 0);
  const hasTicketItems = ticketItems.length > 0 && ticketTotal > 0;
  const ticketCostTotal = ticketItems.reduce(
    (acc, i) => acc + (i.product.costUnit || 0) * i.unitsDeductedFromBaseStock,
    0
  );
  const ticketEstimatedProfit = ticketTotal - ticketCostTotal;
  const parsedReceivedNumber = (() => {
    const cleaned = receivedCashInput.replace(/\s+/g, '').replace(',', '.');
    if (!cleaned || cleaned === '.') return undefined;
    const n = Number(cleaned);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  })();

  const parsedReceivedCash =
    hasTicketItems && parsedReceivedNumber !== undefined ? parsedReceivedNumber : undefined;
  const changeAmount =
    hasTicketItems &&
    paymentMethod === 'DINHEIRO' &&
    parsedReceivedCash !== undefined &&
    parsedReceivedCash > ticketTotal
      ? parsedReceivedCash - ticketTotal
      : 0;
  const missingAmount =
    hasTicketItems &&
    paymentMethod === 'DINHEIRO' &&
    parsedReceivedCash !== undefined &&
    parsedReceivedCash > 0 &&
    parsedReceivedCash < ticketTotal
      ? ticketTotal - parsedReceivedCash
      : 0;

  useEffect(() => {
    if (ticketItems.length === 0 && receivedCashInput !== '') {
      setReceivedCashInput('');
    }
  }, [ticketItems.length, receivedCashInput]);

  const [balcaoError, setBalcaoError] = useState<string | null>(null);

  const handleFinishBalcaoSale = async () => {
    setBalcaoError(null);
    if (ticketItems.length === 0) return;

    if (
      paymentMethod === 'DINHEIRO' &&
      parsedReceivedCash !== undefined &&
      parsedReceivedCash > 0 &&
      parsedReceivedCash < ticketTotal
    ) {
      setBalcaoError(
        `O valor recebido em dinheiro (R$ ${parsedReceivedCash.toFixed(2)}) é menor que o total da venda (R$ ${ticketTotal.toFixed(2)}).`
      );
      return;
    }

    const res = await submitBalcaoCheckout(
      ticketItems,
      paymentMethod,
      parsedReceivedCash,
      customerName
    );
    if (res.success) {
      setLastCompletedTicket({
        items: [...ticketItems],
        total: ticketTotal,
        payment: paymentMethod,
        change: changeAmount,
      });
      setTicketItems([]);
      setReceivedCashInput('');
      setShowReceiptModal(true);
    } else {
      setBalcaoError(res.error || 'Erro ao processar venda no balcão.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && ticketItems.length > 0 && cashShift.status === 'OPEN') {
        e.preventDefault();
        void handleFinishBalcaoSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleBottleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeVasilhameId || intakeQty <= 0) return;
    receiveEmptyVasilhames(intakeVasilhameId, intakeQty);
    setShowBottleIntake(false);
  };

  const todayStr = new Date().toDateString();
  const canSeeAndCancelSales = !currentUser || currentUser.role === 'DONO' || currentUser.role === 'BALCAO';

  const recentBalcaoOrders = orders
    .filter((o) => {
      if (o.channel !== 'BALCAO_PDV') return false;
      const isToday = new Date(o.createdAt).toDateString() === todayStr;
      if (!isToday) return false;
      if (recentFilter === 'ACTIVE') return o.status !== 'CANCELADO';
      if (recentFilter === 'CANCELED') return o.status === 'CANCELADO';
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Coluna Esquerda: Catálogo Rápido com Teclas de Atalho de Fardo/Unidade */}
      <div className="lg:col-span-7 space-y-4">
        {/* Barra de Pesquisa, Temperatura e Entrada de Cascos */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar bebida ou marca..."
                className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPreferredTemp('GELADA')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    preferredTemp === 'GELADA'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Gelada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreferredTemp('NATURAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    preferredTemp === 'NATURAL'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Natural</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowBottleIntake(true)}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cascos</span>
              </button>
            </div>
          </div>

          {/* Botões Rápidos de Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal de Recepção de Cascos no Balcão */}
        {showBottleIntake && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-white space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> Entrada Avulsa de Cascos no Pátio
              </h4>
              <button
                type="button"
                onClick={() => setShowBottleIntake(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Cancelar
              </button>
            </div>
            <form onSubmit={handleBottleIntakeSubmit} className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 block mb-1">Tipo de Garrafa</label>
                <select
                  value={intakeVasilhameId}
                  onChange={(e) => setIntakeVasilhameId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  {vasilhames.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Pátio: {v.emptyInYard} vazias)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Qtd Recebida</label>
                <input
                  type="number"
                  min="1"
                  value={intakeQty}
                  onChange={(e) => setIntakeQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div className="col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                >
                  Confirmar Entrada no Pátio
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Grade de Produtos do Balcão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[640px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.currentBaseStock <= 0;
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
                      className="w-16 h-16 rounded-xl object-cover bg-slate-950 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">
                      {p.code ? `Cód. ${p.code} • ` : ''}{p.brand} • {p.volume}
                    </span>
                    <h4 className="text-xs font-bold truncate text-white">{p.name}</h4>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                      Estoque: {p.currentBaseStock} un{' '}
                      {p.conversionFactor > 1 && (
                        <span className="text-slate-400 font-normal">
                          (~{Math.floor(p.currentBaseStock / p.conversionFactor)} fardos)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Botões de Ação Rápida no Balcão (Grandes e Fáceis de Clicar) */}
                {(() => {
                  const chosenTemp = p.supportsCold ? preferredTemp : 'NATURAL';
                  const unitPriceDisplay =
                    p.priceUnit + (chosenTemp === 'GELADA' ? p.coldSurchargeUnit : 0);
                  const packPriceDisplay =
                    p.pricePack + (chosenTemp === 'GELADA' ? p.coldSurchargePack : 0);

                  return (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() =>
                            addItemToTicket(
                              p,
                              'UNIDADE',
                              chosenTemp,
                              p.isReturnable ? 'TROCA' : 'NAO_APLICA'
                            )
                          }
                          className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-colors border cursor-pointer ${
                            isOutOfStock
                              ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                          } ${p.conversionFactor <= 1 ? 'col-span-2' : ''}`}
                        >
                          <span>
                            +1 Un {chosenTemp === 'GELADA' ? '❄️' : ''}
                          </span>
                          <span className="text-amber-400 font-mono-tabular font-extrabold">
                            R$ {unitPriceDisplay.toFixed(2)}
                          </span>
                        </button>

                        {p.conversionFactor > 1 && (
                          <button
                            type="button"
                            disabled={isOutOfStock || p.currentBaseStock < p.conversionFactor}
                            onClick={() =>
                              addItemToTicket(
                                p,
                                'FARDO',
                                chosenTemp,
                                p.isReturnable ? 'TROCA' : 'NAO_APLICA'
                              )
                            }
                            className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-colors border cursor-pointer ${
                              isOutOfStock || p.currentBaseStock < p.conversionFactor
                                ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed'
                                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35'
                            }`}
                          >
                            <span>
                              +1 {p.packName.split(' ')[0]}
                            </span>
                            <span className="font-mono-tabular font-extrabold text-amber-400">
                              R$ {packPriceDisplay.toFixed(2)}
                            </span>
                          </button>
                        )}
                      </div>

                      {p.isReturnable && (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() =>
                            addItemToTicket(
                              p,
                              'UNIDADE',
                              chosenTemp,
                              'COMPRAR_CASCO'
                            )
                          }
                          className="w-full py-1.5 text-[11px] rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Vender sem casco (+R$ {p.vasilhameDepositPrice?.toFixed(2)})</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Coluna Direita: Cupom / Ticket do Caixa de Balcão */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white flex flex-col justify-between shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                Frente de Caixa Ativa
              </span>
              <h3 className="text-base font-extrabold text-white">Cupom de Balcão #PDV</h3>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-800 border border-slate-700 text-white w-32 focus:outline-none"
                placeholder="Nome do cliente"
              />
              {ticketItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTicketItems([]);
                    setReceivedCashInput('');
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                  title="Limpar cupom"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Itens do Ticket */}
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {ticketItems.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs">Nenhum item adicionado ao cupom.</p>
                <p className="text-[11px] text-slate-600">
                  Clique nos botões de +1 Unidade ou Fardo dos produtos para lançar a venda.
                </p>
              </div>
            ) : (
              ticketItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white truncate">{item.product.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span>{item.presentation === 'FARDO' ? item.product.packName : 'Unidade'}</span>
                      {item.temperature === 'GELADA' && <span className="text-cyan-400 font-semibold">❄️ Gelada</span>}
                      {item.product.isReturnable && (
                        <span className="text-amber-400">
                          {item.vasilhameOption === 'TROCA' ? '🔄 Troca Casco' : '🍾 Comprou Casco'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                      <button
                        type="button"
                        onClick={() => updateTicketQty(item.id, -1)}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateTicketQty(item.id, 1)}
                        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-amber-400 w-16 text-right">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Parte Inferior: Pagamento e Totalizador */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          {/* Seletor de Pagamento */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('DINHEIRO')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'DINHEIRO'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400'
                }`}
              >
                <Banknote className="w-4 h-4" /> Dinheiro
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARTAO_ENTREGA')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'CARTAO_ENTREGA'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4" /> Cartão
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('PIX')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'PIX'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-800 bg-slate-800/50 text-slate-400'
                }`}
              >
                <QrCode className="w-4 h-4" /> PIX
              </button>
            </div>
          </div>

          {/* Calculadora Automática de Troco para Balcão */}
          {paymentMethod === 'DINHEIRO' && (
            <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-amber-500/30 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" />
                  Calculadora Automática de Troco
                </span>
                {parsedReceivedCash !== undefined && (
                  <button
                    type="button"
                    onClick={() => setReceivedCashInput('')}
                    className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                  >
                    Limpar valor
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Valor Entregue pelo Cliente (R$):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-amber-400">R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={!hasTicketItems}
                      value={hasTicketItems ? receivedCashInput : ''}
                      onChange={(e) => {
                        if (!hasTicketItems) return;
                        setReceivedCashInput(e.target.value.replace(/[^0-9.,]/g, ''));
                      }}
                      placeholder={hasTicketItems ? ticketTotal.toFixed(2) : 'Adicione itens'}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-black focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Display automático do Troco */}
                <div
                  className={`p-2.5 rounded-xl border text-center flex flex-col justify-center min-h-[56px] ${
                    !hasTicketItems
                      ? 'bg-slate-900 border-slate-800 text-slate-400'
                      : missingAmount > 0
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : changeAmount > 0
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {!hasTicketItems ? (
                    <>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
                        Troco Calculado
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Adicione um produto
                      </span>
                    </>
                  ) : missingAmount > 0 ? (
                    <>
                      <span className="text-[9px] uppercase font-black tracking-wider text-rose-400">
                        Valor Insuficiente
                      </span>
                      <span className="text-base font-black text-rose-300 font-mono-tabular">
                        Faltam R$ {missingAmount.toFixed(2)}
                      </span>
                    </>
                  ) : changeAmount > 0 ? (
                    <>
                      <span className="text-[9px] uppercase font-black tracking-wider text-emerald-400">
                        Troco a Devolver
                      </span>
                      <span className="text-lg font-black text-emerald-300 font-mono-tabular">
                        R$ {changeAmount.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                        Troco Calculado
                      </span>
                      <span className="text-xs font-extrabold text-slate-300">
                        {parsedReceivedCash !== undefined
                          ? 'Valor Exato (R$ 0,00)'
                          : 'Digite o valor pago'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Botões rápidos de cédulas */}
              <div className="flex flex-wrap items-center gap-1.5">
                {hasTicketItems && (
                  <button
                    type="button"
                    onClick={() => setReceivedCashInput(ticketTotal.toFixed(2))}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-[10px] font-black text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
                  >
                    Exato (R$ {ticketTotal.toFixed(2)})
                  </button>
                )}
                {[10, 20, 50, 100, 200].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={!hasTicketItems}
                    onClick={() => hasTicketItems && setReceivedCashInput(val.toFixed(2))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-[10px] font-bold text-amber-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    R$ {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {balcaoError && (
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-200 text-xs">
              <strong>⚠️ Atenção:</strong> {balcaoError}
            </div>
          )}

          {/* Total & Finalizar */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            {cashShift.status === 'CLOSED' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-between gap-2 text-xs">
                <span className="text-amber-200 font-semibold">
                  Caixa fechado. Abra para concluir a venda.
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

            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400 block">Total da Venda</span>
                <span className="text-2xl font-black text-amber-400 font-mono-tabular">
                  R$ {ticketTotal.toFixed(2)}
                </span>
                {ticketItems.length > 0 && (!currentUser || currentUser.role === 'DONO') && (
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono-tabular">
                    Custo: <strong className="text-rose-300">R$ {ticketCostTotal.toFixed(2)}</strong> &bull; Lucro:{' '}
                    <strong className="text-emerald-400">R$ {ticketEstimatedProfit.toFixed(2)}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                disabled={ticketItems.length === 0 || cashShift.status === 'CLOSED'}
                onClick={handleFinishBalcaoSale}
                className={`min-h-[48px] px-6 py-3 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  ticketItems.length === 0 || cashShift.status === 'CLOSED'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg active:scale-95'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>Finalizar Venda (F2)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cupom Fiscal Impresso */}
      {showReceiptModal && lastCompletedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white text-slate-900 p-6 rounded-2xl max-w-sm w-full font-mono text-xs shadow-2xl space-y-4">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h3 className="font-black text-sm uppercase">{settings.storeName}</h3>
              <p className="text-[10px] text-slate-500">CNPJ: {settings.cnpj}</p>
              <p className="text-[10px] text-slate-500">CUPOM NÃO FISCAL - BALCÃO</p>
              <p className="text-[10px] text-slate-400">{new Date().toLocaleString()}</p>
            </div>

            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
              {lastCompletedTicket.items.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {it.quantity}x {it.product.name} ({it.presentation === 'FARDO' ? 'FARDO' : 'UN'})
                  </span>
                  <span className="font-bold">R$ {it.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 font-bold">
              <div className="flex justify-between text-sm">
                <span>TOTAL A PAGAR:</span>
                <span>R$ {lastCompletedTicket.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-normal text-slate-600">
                <span>Forma: {lastCompletedTicket.payment}</span>
                {lastCompletedTicket.change > 0 && (
                  <span>Troco: R$ {lastCompletedTicket.change.toFixed(2)}</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-dashed border-slate-300 flex gap-2">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-sans font-bold hover:bg-slate-800"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setShowReceiptModal(false);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-sans font-bold"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Seção Inferior (Visível apenas para Dono e Balcão): Vendas Recentes do Balcão & Cancelamento c/ Senha */}
    {canSeeAndCancelSales && (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              <span>Vendas Recentes do Balcão Hoje & Cancelamento (Somente Dono / Balcão)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Caso ocorra algum erro no lançamento, cancele o cupom informando a senha de autorização. O estoque e o caixa serão estornados automaticamente.
            </p>
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRecentFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                recentFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({orders.filter((o) => o.channel === 'BALCAO_PDV' && new Date(o.createdAt).toDateString() === todayStr).length})
            </button>
            <button
              type="button"
              onClick={() => setRecentFilter('ACTIVE')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                recentFilter === 'ACTIVE' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ativas
            </button>
            <button
              type="button"
              onClick={() => setRecentFilter('CANCELED')}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                recentFilter === 'CANCELED' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Canceladas ({orders.filter((o) => o.channel === 'BALCAO_PDV' && o.status === 'CANCELADO' && new Date(o.createdAt).toDateString() === todayStr).length})
            </button>
          </div>
        </div>

        {recentBalcaoOrders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
            Nenhuma venda encontrada neste filtro hoje.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentBalcaoOrders.map((ord) => {
              const isCanceled = ord.status === 'CANCELADO';
              return (
                <div
                  key={ord.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
                    isCanceled
                      ? 'bg-rose-950/20 border-rose-500/30 opacity-90'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                            isCanceled
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 line-through'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          Cupom #{ord.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ord.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-black ${
                          isCanceled ? 'text-rose-400 line-through' : 'text-emerald-400'
                        }`}
                      >
                        R$ {ord.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-slate-300">{ord.customer.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isCanceled && (!currentUser || currentUser.role === 'DONO') && (() => {
                          const ordCost =
                            ord.totalCost !== undefined
                              ? ord.totalCost
                              : ord.items.reduce((s, it) => {
                                  const pr = products.find((p) => p.id === it.productId);
                                  return s + (it.totalCost ?? (pr?.costUnit || 0) * it.unitsCount);
                                }, 0);
                          const ordProfit = ord.totalAmount - ord.deliveryFee - ordCost;
                          return (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                              Lucro R$ {ordProfit.toFixed(2)}
                            </span>
                          );
                        })()}
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                          {ord.paymentMethod === 'CARTAO_ENTREGA' ? 'CARTÃO' : ord.paymentMethod}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 border-t border-slate-800/80 pt-2">
                      {ord.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-[11px] text-slate-300">
                          <span className="truncate pr-2">
                            {it.quantity}x {it.productName} ({it.presentation === 'FARDO' ? 'Fardo' : 'Un'})
                          </span>
                          <span className="text-slate-500 shrink-0">R$ {it.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isCanceled ? (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 space-y-0.5">
                      <div className="font-black uppercase flex items-center gap-1 text-rose-400">
                        <Ban className="w-3 h-3" /> Venda Cancelada & Estornada
                      </div>
                      <p>Motivo: {ord.cancelReason || 'Erro de lançamento'}</p>
                      <p className="text-rose-400/80">
                        Por: {ord.canceledBy || 'Operador'} &bull;{' '}
                        {ord.canceledAt
                          ? new Date(ord.canceledAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOrderToCancel(ord)}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Cancelar Venda (Requer Senha)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

    <CancelOrderModal
      order={orderToCancel}
      isOpen={!!orderToCancel}
      onClose={() => setOrderToCancel(null)}
    />
    </div>
  );
};
