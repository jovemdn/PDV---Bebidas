import React, { useMemo, useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Order, ProductCategory } from '../../types';
import { CancelOrderModal } from './CancelOrderModal';
import { generatePeriodSalesPdf } from '../../services/reportPdfService';
import {
  BarChart3,
  ShoppingBag,
  Truck,
  Snowflake,
  Thermometer,
  Search,
  Package,
  TrendingUp,
  Clock,
  Award,
  AlertTriangle,
  Printer,
  FileDown,
  ArrowUpDown,
  Layers,
  Banknote,
  CreditCard,
  QrCode,
  Filter,
  Calendar,
  Ban,
  ShieldAlert,
} from 'lucide-react';

interface ProductPeriodStats {
  productId: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  image?: string;
  baseUnit: string;
  conversionFactor: number;
  currentBaseStock: number;
  minAlertStock: number;
  totalUnits: number;
  balcaoUnits: number;
  deliveryUnits: number;
  coldUnits: number;
  naturalUnits: number;
  packsCount: number;
  singlesCount: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  balcaoRevenue: number;
  deliveryRevenue: number;
  salesOccurrences: number;
  lastSoldAt: string;
}

interface DailyBucket {
  dateKey: string; // YYYY-MM-DD
  label: string;   // DD/MM
  weekday: string; // seg, ter...
  units: number;
  revenue: number;
  ordersCount: number;
}

type DatePreset = 'TODAY' | '7D' | '15D' | '30D' | 'CUSTOM';

const CATEGORY_META: Record<
  Exclude<ProductCategory, 'todas'>,
  { label: string; icon: string; accent: string; bar: string }
> = {
  cervejas: {
    label: 'Cervejas',
    icon: '🍻',
    accent: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    bar: 'bg-amber-500',
  },
  refrigerantes: {
    label: 'Refrigerantes & Energéticos',
    icon: '🥤',
    accent: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    bar: 'bg-cyan-500',
  },
  gelo_churrasco: {
    label: 'Gelo & Churrasco',
    icon: '🧊',
    accent: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    bar: 'bg-sky-500',
  },
  destilados: {
    label: 'Destilados',
    icon: '🥃',
    accent: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    bar: 'bg-rose-500',
  },
  petiscos: {
    label: 'Petiscos & Conveniência',
    icon: '🥨',
    accent: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    bar: 'bg-emerald-500',
  },
};

const toLocalYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseLocalStartOfDay = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
};

const parseLocalEndOfDay = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
};

const subtractDaysYMD = (daysBack: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return toLocalYMD(d);
};

const formatDateShortBR = (ymd: string): string => {
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
};

const formatDateTimeShort = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export const VendasDoDia: React.FC = () => {
  const { orders, products, currentUser, settings } = useBeverage();

  const todayYMD = useMemo(() => toLocalYMD(new Date()), []);
  const [datePreset, setDatePreset] = useState<DatePreset>('7D');
  const [startDate, setStartDate] = useState<string>(() => subtractDaysYMD(6));
  const [endDate, setEndDate] = useState<string>(() => toLocalYMD(new Date()));

  const [channelFilter, setChannelFilter] = useState<'ALL' | 'BALCAO_PDV' | 'DELIVERY_APP'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'UNITS' | 'REVENUE'>('UNITS');
  const [feedView, setFeedView] = useState<'ACTIVE' | 'CANCELED'>('ACTIVE');
  const [cancelTargetOrder, setCancelTargetOrder] = useState<Order | null>(null);

  const canManageCancel =
    !currentUser || currentUser.role === 'DONO' || currentUser.role === 'BALCAO';

  const handleSelectPreset = (preset: Exclude<DatePreset, 'CUSTOM'>) => {
    setDatePreset(preset);
    const today = toLocalYMD(new Date());
    setEndDate(today);
    if (preset === 'TODAY') setStartDate(today);
    else if (preset === '7D') setStartDate(subtractDaysYMD(6));
    else if (preset === '15D') setStartDate(subtractDaysYMD(14));
    else if (preset === '30D') setStartDate(subtractDaysYMD(29));
  };

  const handleCustomStartChange = (value: string) => {
    setDatePreset('CUSTOM');
    setStartDate(value);
    if (value && endDate && value > endDate) {
      setEndDate(value);
    }
  };

  const handleCustomEndChange = (value: string) => {
    setDatePreset('CUSTOM');
    setEndDate(value);
    if (value && startDate && value < startDate) {
      setStartDate(value);
    }
  };

  const periodLabel = useMemo(() => {
    if (datePreset === 'TODAY') return `Hoje (${formatDateShortBR(todayYMD)})`;
    if (datePreset === '7D') return 'Últimos 7 dias';
    if (datePreset === '15D') return 'Últimos 15 dias';
    if (datePreset === '30D') return 'Últimos 30 dias';
    if (startDate === endDate) return formatDateShortBR(startDate);
    return `${formatDateShortBR(startDate)} até ${formatDateShortBR(endDate)}`;
  }, [datePreset, startDate, endDate, todayYMD]);

  // Orders inside the selected [startDate, endDate] range
  const { activePeriodOrders, canceledPeriodOrders } = useMemo(() => {
    const startMs = startDate ? parseLocalStartOfDay(startDate).getTime() : 0;
    const endMs = endDate ? parseLocalEndOfDay(endDate).getTime() : Number.MAX_SAFE_INTEGER;

    const active: Order[] = [];
    const canceled: Order[] = [];

    orders.forEach((order) => {
      const orderMs = new Date(order.createdAt).getTime();
      if (orderMs < startMs || orderMs > endMs) return;

      if (channelFilter !== 'ALL' && order.channel !== channelFilter) return;

      if (order.status === 'CANCELADO') {
        canceled.push(order);
      } else {
        active.push(order);
      }
    });

    active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    canceled.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { activePeriodOrders: active, canceledPeriodOrders: canceled };
  }, [orders, startDate, endDate, channelFilter]);

  // Aggregate product sales, category breakdown & daily buckets (excluding CANCELADO)
  const { productStatsList, categoryTotals, summaryMetrics, dailyBuckets } = useMemo(() => {
    const productMap = new Map<string, ProductPeriodStats>();
    const catTotals: Record<
      Exclude<ProductCategory, 'todas'>,
      { units: number; revenue: number; itemsCount: number }
    > = {
      cervejas: { units: 0, revenue: 0, itemsCount: 0 },
      refrigerantes: { units: 0, revenue: 0, itemsCount: 0 },
      gelo_churrasco: { units: 0, revenue: 0, itemsCount: 0 },
      destilados: { units: 0, revenue: 0, itemsCount: 0 },
      petiscos: { units: 0, revenue: 0, itemsCount: 0 },
    };

    // Build daily buckets across the date range (up to 45 days to keep chart crisp)
    const bucketsMap = new Map<string, DailyBucket>();
    if (startDate && endDate) {
      const cursor = parseLocalStartOfDay(startDate);
      const limit = parseLocalStartOfDay(endDate);
      let safety = 0;
      while (cursor.getTime() <= limit.getTime() && safety < 45) {
        const ymd = toLocalYMD(cursor);
        bucketsMap.set(ymd, {
          dateKey: ymd,
          label: cursor.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          weekday: cursor
            .toLocaleDateString('pt-BR', { weekday: 'short' })
            .replace('.', ''),
          units: 0,
          revenue: 0,
          ordersCount: 0,
        });
        cursor.setDate(cursor.getDate() + 1);
        safety += 1;
      }
    }

    let totalUnitsAll = 0;
    let totalBalcaoUnits = 0;
    let totalDeliveryUnits = 0;
    let totalColdUnits = 0;
    let totalNaturalUnits = 0;
    let totalProductsRevenue = 0;
    let totalProductsCost = 0;
    let balcaoOrdersCount = 0;
    let deliveryOrdersCount = 0;

    activePeriodOrders.forEach((order) => {
      const isBalcao = order.channel === 'BALCAO_PDV';
      if (isBalcao) balcaoOrdersCount += 1;
      else deliveryOrdersCount += 1;

      const orderYMD = toLocalYMD(new Date(order.createdAt));
      const dayBucket = bucketsMap.get(orderYMD);
      if (dayBucket) {
        dayBucket.ordersCount += 1;
      }

      order.items.forEach((item) => {
        const catalogProduct = products.find((p) => p.id === item.productId);
        const category: Exclude<ProductCategory, 'todas'> =
          catalogProduct && catalogProduct.category !== 'todas'
            ? catalogProduct.category
            : 'cervejas';

        const itemCost =
          item.totalCost !== undefined
            ? item.totalCost
            : (catalogProduct?.costUnit || 0) * item.unitsCount;
        const itemProfit = item.subtotal - itemCost;

        totalUnitsAll += item.unitsCount;
        totalProductsRevenue += item.subtotal;
        totalProductsCost += itemCost;

        if (dayBucket) {
          dayBucket.units += item.unitsCount;
          dayBucket.revenue += item.subtotal;
        }

        if (isBalcao) totalBalcaoUnits += item.unitsCount;
        else totalDeliveryUnits += item.unitsCount;

        if (item.temperature === 'GELADA') totalColdUnits += item.unitsCount;
        else totalNaturalUnits += item.unitsCount;

        catTotals[category].units += item.unitsCount;
        catTotals[category].revenue += item.subtotal;

        const existing = productMap.get(item.productId);
        if (existing) {
          existing.totalUnits += item.unitsCount;
          existing.balcaoUnits += isBalcao ? item.unitsCount : 0;
          existing.deliveryUnits += !isBalcao ? item.unitsCount : 0;
          existing.coldUnits += item.temperature === 'GELADA' ? item.unitsCount : 0;
          existing.naturalUnits += item.temperature === 'NATURAL' ? item.unitsCount : 0;
          existing.packsCount += item.presentation === 'FARDO' ? item.quantity : 0;
          existing.singlesCount += item.presentation === 'UNIDADE' ? item.quantity : 0;
          existing.totalRevenue += item.subtotal;
          existing.totalCost += itemCost;
          existing.totalProfit += itemProfit;
          existing.balcaoRevenue += isBalcao ? item.subtotal : 0;
          existing.deliveryRevenue += !isBalcao ? item.subtotal : 0;
          existing.salesOccurrences += 1;
          if (new Date(order.createdAt) > new Date(existing.lastSoldAt)) {
            existing.lastSoldAt = order.createdAt;
          }
        } else {
          catTotals[category].itemsCount += 1;
          productMap.set(item.productId, {
            productId: item.productId,
            productName: catalogProduct?.name || item.productName,
            brand: catalogProduct?.brand || item.brand,
            category,
            image: catalogProduct?.image,
            baseUnit: catalogProduct?.baseUnit || 'UN',
            conversionFactor: catalogProduct?.conversionFactor || 12,
            currentBaseStock: catalogProduct?.currentBaseStock ?? 0,
            minAlertStock: catalogProduct?.minAlertStock ?? 0,
            totalUnits: item.unitsCount,
            balcaoUnits: isBalcao ? item.unitsCount : 0,
            deliveryUnits: !isBalcao ? item.unitsCount : 0,
            coldUnits: item.temperature === 'GELADA' ? item.unitsCount : 0,
            naturalUnits: item.temperature === 'NATURAL' ? item.unitsCount : 0,
            packsCount: item.presentation === 'FARDO' ? item.quantity : 0,
            singlesCount: item.presentation === 'UNIDADE' ? item.quantity : 0,
            totalRevenue: item.subtotal,
            totalCost: itemCost,
            totalProfit: itemProfit,
            balcaoRevenue: isBalcao ? item.subtotal : 0,
            deliveryRevenue: !isBalcao ? item.subtotal : 0,
            salesOccurrences: 1,
            lastSoldAt: order.createdAt,
          });
        }
      });
    });

    const statsList = Array.from(productMap.values());
    const topProduct =
      statsList.length > 0
        ? [...statsList].sort((a, b) => b.totalUnits - a.totalUnits)[0]
        : null;

    return {
      productStatsList: statsList,
      categoryTotals: catTotals,
      dailyBuckets: Array.from(bucketsMap.values()),
      summaryMetrics: {
        totalUnitsAll,
        totalBalcaoUnits,
        totalDeliveryUnits,
        totalColdUnits,
        totalNaturalUnits,
        totalProductsRevenue,
        totalProductsCost,
        totalProductsProfit: totalProductsRevenue - totalProductsCost,
        balcaoOrdersCount,
        deliveryOrdersCount,
        topProduct,
      },
    };
  }, [activePeriodOrders, products, startDate, endDate]);

  // Filter & sort product list
  const displayedProducts = useMemo(() => {
    return productStatsList
      .filter((stat) => {
        const matchesCat = selectedCategory === 'todas' || stat.category === selectedCategory;
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          stat.productName.toLowerCase().includes(q) ||
          stat.brand.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
      })
      .sort((a, b) =>
        sortBy === 'UNITS' ? b.totalUnits - a.totalUnits : b.totalRevenue - a.totalRevenue
      );
  }, [productStatsList, selectedCategory, searchQuery, sortBy]);

  const unsoldProductsCount = useMemo(() => {
    const soldIds = new Set(productStatsList.map((s) => s.productId));
    return products.filter((p) => !soldIds.has(p.id)).length;
  }, [products, productStatsList]);

  const maxDailyUnits = useMemo(
    () => Math.max(1, ...dailyBuckets.map((d) => d.units)),
    [dailyBuckets]
  );

  const canceledTotalValue = useMemo(
    () => canceledPeriodOrders.reduce((s, o) => s + o.totalAmount, 0),
    [canceledPeriodOrders]
  );

  const displayedFeedOrders = feedView === 'ACTIVE' ? activePeriodOrders : canceledPeriodOrders;

  return (
    <div className="space-y-6">
      {/* Header & Controles de Período + Canal */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Relatório ao Vivo &bull; {periodLabel}
              </span>
              {canceledPeriodOrders.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                  {canceledPeriodOrders.length} cancelamento(s) excluído(s) do total
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1.5 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <span>Relatório de Saída de Produtos &amp; Mais Vendidos</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Veja os produtos que mais estão saindo hoje, nos últimos 7 dias, 15 dias ou escolha qualquer data personalizada.
            </p>
          </div>

          {/* Channel Switcher + Print */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setChannelFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  channelFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('BALCAO_PDV')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  channelFilter === 'BALCAO_PDV'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Somente Balcão</span>
              </button>
              <button
                type="button"
                onClick={() => setChannelFilter('DELIVERY_APP')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  channelFilter === 'DELIVERY_APP'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                generatePeriodSalesPdf({
                  settings,
                  periodLabel,
                  totalUnits: summaryMetrics.totalUnitsAll,
                  totalRevenue: summaryMetrics.totalProductsRevenue,
                  totalCost: summaryMetrics.totalProductsCost,
                  totalProfit: summaryMetrics.totalProductsProfit,
                  validOrdersCount: activePeriodOrders.length,
                  canceledOrdersCount: canceledPeriodOrders.length,
                  products: displayedProducts.map((p) => ({
                    productName: p.productName,
                    totalUnits: p.totalUnits,
                    totalRevenue: p.totalRevenue,
                    totalCost: p.totalCost,
                    totalProfit: p.totalProfit,
                    balcaoUnits: p.balcaoUnits,
                    deliveryUnits: p.deliveryUnits,
                  })),
                })
              }
              className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors shadow-sm"
              title="Baixar relatório completo em PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
              title="Imprimir relatório do período"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* Seletor de Período: Hoje, 7 dias, 15 dias, 30 dias + Datas Personalizadas */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Período:
            </span>
            {(
              [
                { id: 'TODAY', label: 'Hoje' },
                { id: '7D', label: 'Últimos 7 dias' },
                { id: '15D', label: 'Últimos 15 dias' },
                { id: '30D', label: 'Últimos 30 dias' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  datePreset === p.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400">Escolher datas:</span>
            <input
              type="date"
              value={startDate}
              max={todayYMD}
              onChange={(e) => handleCustomStartChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-slate-500 font-bold">até</span>
            <input
              type="date"
              value={endDate}
              max={todayYMD}
              onChange={(e) => handleCustomEndChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 4 Cards de Resumo (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Unidades Vendidas ({periodLabel})
            </span>
            <span className="text-2xl font-black text-amber-400 mt-0.5 block">
              {summaryMetrics.totalUnitsAll} un
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Balcão: <strong className="text-white">{summaryMetrics.totalBalcaoUnits}</strong> &bull; Delivery:{' '}
              <strong className="text-cyan-400">{summaryMetrics.totalDeliveryUnits}</strong>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Faturamento &amp; Lucro (Abatido Custo)
            </span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              R$ {summaryMetrics.totalProductsRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Custo: <strong className="text-rose-300">R$ {summaryMetrics.totalProductsCost.toFixed(2)}</strong> &bull; Lucro:{' '}
              <strong className="text-emerald-300">R$ {summaryMetrics.totalProductsProfit.toFixed(2)}</strong>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Saída Gelada vs Natural
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-cyan-400 flex items-center gap-1">
                <Snowflake className="w-4 h-4" />
                {summaryMetrics.totalColdUnits}
              </span>
              <span className="text-xs text-slate-500">/</span>
              <span className="text-base font-bold text-slate-300">
                {summaryMetrics.totalNaturalUnits} nat.
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {summaryMetrics.totalUnitsAll > 0
                ? `${Math.round((summaryMetrics.totalColdUnits / summaryMetrics.totalUnitsAll) * 100)}% saíram geladas`
                : 'Sem saídas registradas'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Snowflake className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between shadow-lg">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] text-amber-300 uppercase font-black tracking-wider block">
              🏆 Produto Campeão do Período
            </span>
            {summaryMetrics.topProduct ? (
              <>
                <span className="text-sm font-black text-white mt-0.5 block truncate">
                  {summaryMetrics.topProduct.productName}
                </span>
                <span className="text-xs text-amber-300 font-bold block mt-0.5">
                  {summaryMetrics.topProduct.totalUnits} un &bull; R${' '}
                  {summaryMetrics.topProduct.totalRevenue.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-400 mt-1 block">Sem vendas neste período</span>
            )}
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Evolução Diária no Período (aparece quando mais de 1 dia selecionado) */}
      {dailyBuckets.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Evolução Diária de Saídas no Período ({dailyBuckets.length} dias)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Volume de unidades vendidas e faturamento dia a dia
              </p>
            </div>
            <span className="text-[11px] text-slate-400 font-semibold">
              Média:{' '}
              <strong className="text-amber-400">
                {Math.round(summaryMetrics.totalUnitsAll / dailyBuckets.length)} un/dia
              </strong>
            </span>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="flex items-end gap-2 min-w-max h-36 pt-6 px-1">
              {dailyBuckets.map((day) => {
                const heightPct = day.units > 0 ? Math.max(12, Math.round((day.units / maxDailyUnits) * 100)) : 4;
                const isToday = day.dateKey === todayYMD;
                return (
                  <div
                    key={day.dateKey}
                    className="flex flex-col items-center justify-end gap-1 w-14 shrink-0 h-full group"
                    title={`${day.label} (${day.weekday}): ${day.units} un • R$ ${day.revenue.toFixed(2)}`}
                  >
                    <span className="text-[10px] font-black text-amber-300">
                      {day.units > 0 ? `${day.units}` : '0'}
                    </span>
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        className={`w-7 rounded-t-xl transition-all duration-300 ${
                          day.units === 0
                            ? 'bg-slate-800/70'
                            : isToday
                            ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-lg shadow-amber-500/20'
                            : 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:from-amber-500 group-hover:to-amber-300'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <div className="text-center leading-tight">
                      <span
                        className={`text-[10px] font-bold block ${
                          isToday ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {day.label}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase">{day.weekday}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown por Categoria (Clicável para Filtrar) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-400" />
            <span>Saída por Categoria de Produto (clique para filtrar)</span>
          </h3>
          {selectedCategory !== 'todas' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('todas')}
              className="text-xs font-bold text-amber-400 hover:underline"
            >
              Mostrar todas as categorias
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(CATEGORY_META) as Exclude<ProductCategory, 'todas'>[]).map((catKey) => {
            const meta = CATEGORY_META[catKey];
            const data = categoryTotals[catKey];
            const sharePct =
              summaryMetrics.totalUnitsAll > 0
                ? Math.round((data.units / summaryMetrics.totalUnitsAll) * 100)
                : 0;
            const isSelected = selectedCategory === catKey;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? 'todas' : catKey)}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-amber-500 ring-2 ring-amber-500/20 shadow-lg'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-lg">{meta.icon}</span>
                  <span className="text-[10px] font-black text-slate-400">{sharePct}% vol.</span>
                </div>

                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-200 block truncate">{meta.label}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-black text-white">{data.units} un</span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      R$ {data.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-2.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${meta.bar}`}
                    style={{ width: `${Math.min(100, sharePct)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Ranking de Mais Vendidos + Movimentação / Cancelamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Esquerda (7 cols): Ranking de Produtos que Mais Saem */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>Ranking dos Produtos que Mais Saem ({displayedProducts.length})</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Consolidado por produto no período ({periodLabel}) &bull; ordenável por quantidade ou valor
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar produto..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setSortBy(sortBy === 'UNITS' ? 'REVENUE' : 'UNITS')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-slate-700 flex items-center gap-1 shrink-0"
                title="Alternar ordenação"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortBy === 'UNITS' ? 'Qtd' : 'R$'}</span>
              </button>
            </div>
          </div>

          {displayedProducts.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
              <p className="text-2xl">📊</p>
              <p className="text-xs font-bold text-slate-300">
                Nenhuma saída encontrada para o período e filtros selecionados.
              </p>
              <p className="text-[11px] text-slate-500">
                Experimente ampliar as datas ou mudar o filtro de canal.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {displayedProducts.map((item, idx) => {
                const isLowStock = item.currentBaseStock <= item.minAlertStock;
                const catMeta =
                  item.category !== 'todas' ? CATEGORY_META[item.category] : CATEGORY_META.cervejas;

                return (
                  <div
                    key={item.productId}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        #{idx + 1}
                      </div>

                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-11 h-11 rounded-xl object-cover bg-slate-900 shrink-0 border border-slate-800"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-lg shrink-0">
                          {catMeta.icon}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                            {item.productName}
                          </h4>
                          {isLowStock && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-0.5 uppercase">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Estoque Baixo ({item.currentBaseStock} un)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-semibold">
                            {catMeta.icon} {catMeta.label}
                          </span>

                          {item.packsCount > 0 && (
                            <span className="text-amber-300 font-bold">
                              {item.packsCount} {item.packsCount === 1 ? 'fardo/cx' : 'fardos/cx'}
                            </span>
                          )}
                          {item.singlesCount > 0 && (
                            <span className="text-slate-300 font-semibold">
                              {item.singlesCount} avulsa(s)
                            </span>
                          )}

                          {item.coldUnits > 0 && (
                            <span className="text-cyan-400 font-semibold flex items-center gap-0.5">
                              <Snowflake className="w-3 h-3" /> {item.coldUnits} gelada
                            </span>
                          )}
                          {item.naturalUnits > 0 && (
                            <span className="text-slate-400 flex items-center gap-0.5">
                              <Thermometer className="w-3 h-3" /> {item.naturalUnits} natural
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-amber-400">
                          {item.totalUnits} {item.baseUnit.toLowerCase()}
                          {item.totalUnits > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs font-extrabold text-white">
                          R$ {item.totalRevenue.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-rose-300 font-semibold">
                          Custo: R$ {item.totalCost.toFixed(2)}
                        </span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="text-emerald-400 font-black">
                          Lucro: R$ {item.totalProfit.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>
                          Balcão: <strong className="text-slate-300">{item.balcaoUnits}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Deliv.: <strong className="text-cyan-400">{item.deliveryUnits}</strong>
                        </span>
                        <span>&bull;</span>
                        <span>
                          Restam:{' '}
                          <strong className={isLowStock ? 'text-rose-400' : 'text-slate-300'}>
                            {item.currentBaseStock}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unsoldProductsCount > 0 && (
            <p className="text-[11px] text-slate-500 pt-1">
              ℹ️ Outros {unsoldProductsCount} produto(s) do catálogo não tiveram saída no período selecionado.
            </p>
          )}
        </div>

        {/* Direita (5 cols): Movimentação do Período + Auditoria de Cancelamentos */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Vendas &amp; Cancelamentos do Período</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Auditoria exclusiva Dono/Balcão &bull; {periodLabel}
              </p>
            </div>
          </div>

          {/* Toggle Ativas vs Canceladas */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setFeedView('ACTIVE')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                feedView === 'ACTIVE'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Vendas Válidas ({activePeriodOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setFeedView('CANCELED')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                feedView === 'CANCELED'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Canceladas ({canceledPeriodOrders.length})</span>
            </button>
          </div>

          {feedView === 'CANCELED' && canceledPeriodOrders.length > 0 && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-200 flex items-center justify-between">
              <span>Total estornado no período:</span>
              <strong className="text-rose-300">R$ {canceledTotalValue.toFixed(2)}</strong>
            </div>
          )}

          {displayedFeedOrders.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              {feedView === 'CANCELED'
                ? 'Nenhuma venda cancelada no período selecionado.'
                : 'Nenhuma venda válida registrada neste período.'}
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {displayedFeedOrders.map((order) => {
                const isBalcao = order.channel === 'BALCAO_PDV';
                const isCanceled = order.status === 'CANCELADO';
                const totalUnitsOrder = order.items.reduce((s, it) => s + it.unitsCount, 0);

                return (
                  <div
                    key={order.id}
                    className={`p-3 rounded-2xl border space-y-2 ${
                      isCanceled
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                            isCanceled
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isBalcao
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {isBalcao ? (
                            <>
                              <ShoppingBag className="w-3 h-3" /> Balcão #{order.orderNumber}
                            </>
                          ) : (
                            <>
                              <Truck className="w-3 h-3" /> Delivery #{order.orderNumber}
                            </>
                          )}
                        </span>

                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTimeShort(order.createdAt)}
                        </span>
                      </div>

                      <span
                        className={`text-xs font-black ${
                          isCanceled ? 'text-rose-400 line-through' : 'text-emerald-400'
                        }`}
                      >
                        R$ {order.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    {/* Items list */}
                    <div className="space-y-1 pl-1 border-l-2 border-slate-800">
                      {order.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-[11px] text-slate-300"
                        >
                          <span className="truncate pr-2">
                            <strong className="text-white">{it.quantity}x</strong> {it.productName}{' '}
                            <span className="text-slate-500">
                              ({it.presentation === 'FARDO' ? `Fardo = ${it.unitsCount} un` : 'Un'})
                            </span>{' '}
                            {it.temperature === 'GELADA' ? '❄️' : ''}
                          </span>
                          <span className="text-slate-400 font-semibold shrink-0">
                            R$ {it.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {isCanceled && (
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-200 space-y-0.5">
                        <p className="font-bold flex items-center gap-1 text-rose-300">
                          <ShieldAlert className="w-3 h-3" />
                          Cancelado por {order.canceledBy || 'Operador'}
                          {order.canceledAt ? ` em ${formatDateTimeShort(order.canceledAt)}` : ''}
                        </p>
                        {order.cancelReason && <p className="text-rose-200/90">Motivo: {order.cancelReason}</p>}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 gap-2">
                      <span className="truncate max-w-[130px]">{order.customer.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-slate-400 font-semibold">
                          {order.paymentMethod === 'DINHEIRO' && (
                            <Banknote className="w-3 h-3 text-emerald-400" />
                          )}
                          {order.paymentMethod === 'CARTAO_ENTREGA' && (
                            <CreditCard className="w-3 h-3 text-cyan-400" />
                          )}
                          {order.paymentMethod === 'PIX' && (
                            <QrCode className="w-3 h-3 text-amber-400" />
                          )}
                          {order.paymentMethod === 'CARTAO_ENTREGA' ? 'CARTÃO' : order.paymentMethod}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-300 font-bold">
                          {totalUnitsOrder} un
                        </span>
                        {!isCanceled && canManageCancel && (
                          <button
                            type="button"
                            onClick={() => setCancelTargetOrder(order)}
                            className="px-2 py-0.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1 transition-colors"
                            title="Cancelar venda (requer senha)"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Cancelar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cancelamento com Senha */}
      <CancelOrderModal
        order={cancelTargetOrder}
        isOpen={!!cancelTargetOrder}
        onClose={() => setCancelTargetOrder(null)}
      />
    </div>
  );
};
