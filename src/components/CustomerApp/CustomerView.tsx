import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Product, ProductCategory } from '../../types';
import { ProductModal } from './ProductModal';
import { CustomerCartDrawer } from './CustomerCartDrawer';
import { OrderTrackerModal } from './OrderTrackerModal';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  Search,
  ShoppingBag,
  Snowflake,
  RefreshCw,
  Sparkles,
  Flame,
  Clock,
  ChevronRight,
  Package,
  MessageCircle,
} from 'lucide-react';

export const CustomerView: React.FC = () => {
  const {
    products,
    cart,
    cartTotalAmount,
    cartTotalItemsCount,
    customerMobileFrame,
    lastCreatedOrderId,
    orders,
    settings,
  } = useBeverage();

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(lastCreatedOrderId);
  const [trackerInitialTab, setTrackerInitialTab] = useState<'STATUS' | 'CHAT'>('STATUS');

  // Active customer orders for delivery (only non-cancelled)
  const customerOrders = orders.filter((o) => o.channel === 'DELIVERY_APP' && o.status !== 'CANCELADO');

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategory === 'todas' || prod.category === selectedCategory;
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: { id: ProductCategory; label: string; icon: string }[] = [
    { id: 'todas', label: 'Tudo', icon: '🍺' },
    { id: 'cervejas', label: 'Cervejas', icon: '🍻' },
    { id: 'destilados', label: 'Destilados', icon: '🥃' },
    { id: 'refrigerantes', label: 'Refrigerantes & Sucos', icon: '🥤' },
    { id: 'gelo_churrasco', label: 'Gelo & Churrasco', icon: '🧊' },
  ];

  const content = (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100 pb-28">
      {/* Top Banner / Store Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Depósito Aberto Agora
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {settings.storeName} 🍻
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Tempo Médio</span>
            <span className="text-xs font-black text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {settings.minDeliveryMinutes} a {settings.maxDeliveryMinutes} min
            </span>
          </div>
        </div>

        {/* Promo Pill Banner */}
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
              ❄️
            </div>
            <div>
              <p className="text-xs font-bold text-white">Bebida Estupidamente Gelada</p>
              <p className="text-[11px] text-slate-400">
                Escolha "Gelada" ou "Natural", unidade ou fardo fechado!
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
            Entrega Rápida
          </span>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar cerveja, fardo, destilado, gelo..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Order Notice (if customer has placed an order) */}
      {customerOrders.length > 0 && (
        <div className="p-3 mx-4 mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div className="text-xs truncate">
              <p className="font-bold text-white truncate">Pedido #{customerOrders[0].orderNumber} em andamento</p>
              <p className="text-slate-400 text-[10px]">
                Status: <strong className="text-amber-400">{customerOrders[0].status.replace('_', ' ')}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setTrackerInitialTab('CHAT');
                setTrackingOrderId(customerOrders[0].id);
              }}
              className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1 transition-colors"
              title="Abrir Chat do Pedido"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat</span>
              {(customerOrders[0].messages || []).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {(customerOrders[0].messages || []).length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setTrackerInitialTab('STATUS');
                setTrackingOrderId(customerOrders[0].id);
              }}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition-all"
            >
              <span>Rastrear</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Products Catalog */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Catálogo ({filteredProducts.length} itens)
          </h2>
          <span className="text-[11px] text-slate-500">Estoque sincronizado em tempo real</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.currentBaseStock <= 0;
            const isLowStock = product.currentBaseStock > 0 && product.currentBaseStock <= product.minAlertStock;
            const fardosCount = Math.floor(product.currentBaseStock / product.conversionFactor);

            return (
              <div
                key={product.id}
                onClick={() => !isOutOfStock && setSelectedProduct(product)}
                className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between group ${
                  isOutOfStock
                    ? 'bg-slate-900/40 border-slate-800/50 opacity-60 cursor-not-allowed'
                    : 'bg-slate-900/90 border-slate-800/80 hover:border-amber-500/50 hover:bg-slate-850 cursor-pointer shadow-lg'
                }`}
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-1 text-center">
                        <span className="text-[10px] font-black uppercase text-red-400 leading-tight">
                          Esgotado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        {product.brand}
                      </span>
                      {product.supportsCold && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/15 text-cyan-300 font-semibold flex items-center gap-0.5">
                          <Snowflake className="w-2.5 h-2.5" /> Gelada
                        </span>
                      )}
                      {product.isReturnable && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-semibold flex items-center gap-0.5">
                          <RefreshCw className="w-2.5 h-2.5" /> Retornável
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-bold text-white mt-1 leading-snug line-clamp-2">
                      {product.name}
                    </h3>

                    {/* Estoque Indicador Real */}
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      {isOutOfStock ? (
                        <span className="text-red-400 font-bold">Sem estoque</span>
                      ) : isLowStock ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Restam apenas {product.currentBaseStock} un
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          Estoque: <strong className="text-emerald-400">{product.currentBaseStock} un</strong>{' '}
                          {product.conversionFactor > 1 && `(~${fardosCount} fardos)`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preço e Botão de Venda Fracionada */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    {product.conversionFactor > 1 ? (
                      <div>
                        <div className="text-[10px] text-slate-400">
                          Unidade a partir de <strong className="text-white">R$ {product.priceUnit.toFixed(2)}</strong>
                        </div>
                        <div className="text-xs font-black text-amber-400 flex items-center gap-1">
                          <span>{product.packName}:</span>
                          <span className="text-sm font-black">R$ {product.pricePack.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm font-black text-amber-400">
                        R$ {product.priceUnit.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <button
                    disabled={isOutOfStock}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                      isOutOfStock
                        ? 'bg-slate-800 text-slate-500'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                    }`}
                  >
                    <span>Pedir</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-3 inset-x-3 sm:max-w-md sm:mx-auto z-40 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black shadow-2xl shadow-amber-500/40 flex items-center justify-between active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-xs">
                {cartTotalItemsCount}
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs block">Ver Carrinho de Bebidas</span>
                <span className="text-[10px] text-slate-800 font-bold">
                  {cart.length} {cart.length === 1 ? 'item diferente' : 'itens diferentes'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-black">
                R$ {(cartTotalAmount + 7.00).toFixed(2)}
              </span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </div>
      )}

      {/* Modais */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <CustomerCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderSuccess={(orderId) => {
          setTrackingOrderId(orderId);
        }}
      />

      <ErrorBoundary fallbackTitle="Erro ao abrir rastreio ou chat">
        {trackingOrderId && (
          <OrderTrackerModal
            orderId={trackingOrderId}
            onClose={() => setTrackingOrderId(null)}
            initialTab={trackerInitialTab}
          />
        )}
      </ErrorBoundary>
    </div>
  );

  // If customerMobileFrame is enabled, wrap inside a sleek iPhone-like mockup frame
  if (customerMobileFrame) {
    return (
      <div className="py-6 px-4 flex justify-center items-start min-h-[calc(100vh-4rem)] bg-slate-950">
        <div className="w-full max-w-[420px] rounded-[42px] border-[8px] border-slate-800 bg-slate-950 shadow-2xl shadow-black overflow-hidden relative flex flex-col h-[820px] max-h-[90vh]">
          {/* Mock Status Bar */}
          <div className="h-6 bg-slate-900 flex items-center justify-between px-6 text-[10px] text-slate-400 font-semibold shrink-0 select-none border-b border-slate-800/40">
            <span>20:45</span>
            <div className="w-16 h-3.5 bg-black rounded-full" />
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5">
                <div className="w-full h-full bg-slate-300 rounded-2xs" />
              </div>
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar relative">
            {content}
          </div>

          {/* Mock Home Bar */}
          <div className="h-4 bg-slate-950 flex items-center justify-center shrink-0">
            <div className="w-28 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Fluid Full Width Mode
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {content}
    </div>
  );
};
