import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Product, ProductCategory } from '../../types';
import { ProductModal } from './ProductModal';
import { CustomerCartDrawer } from './CustomerCartDrawer';
import { OrderTrackerModal } from './OrderTrackerModal';
import { ErrorBoundary } from '../ErrorBoundary';
import { GENERATED_IMAGES } from '../../assets/generatedImages';
import {
  Search,
  ShoppingBag,
  Clock,
  ChevronRight,
  MessageCircle,
  MapPin,
  Phone,
  Snowflake,
  RefreshCw,
  Package,
  Store,
  Truck,
  Plus,
  Cloud,
} from 'lucide-react';

export const CustomerView: React.FC = () => {
  const {
    products,
    cart,
    cartTotalAmount,
    cartTotalItemsCount,
    lastCreatedOrderId,
    orders,
    settings,
    cloudUser,
    cloudSyncing,
    connectCloudGoogle,
  } = useBeverage();

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(lastCreatedOrderId);
  const [trackerInitialTab, setTrackerInitialTab] = useState<'STATUS' | 'CHAT'>('STATUS');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Pedidos ativos deste cliente (nunca exibe cancelados)
  const customerOrders = orders.filter(
    (o) => o.channel === 'DELIVERY_APP' && o.status !== 'CANCELADO'
  );

  const filteredProducts = products
    .filter((prod) => {
      const matchesCategory =
        selectedCategory === 'todas' || prod.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        prod.name.toLowerCase().includes(q) ||
        prod.brand.toLowerCase().includes(q) ||
        (prod.code || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const aInStock = a.currentBaseStock > 0 ? 0 : 1;
      const bInStock = b.currentBaseStock > 0 ? 0 : 1;
      return aInStock - bInStock;
    });

  const categories: { id: ProductCategory; label: string }[] = [
    { id: 'todas', label: 'Todos' },
    { id: 'cervejas', label: 'Cervejas' },
    { id: 'destilados', label: 'Destilados & Drinks' },
    { id: 'refrigerantes', label: 'Bebidas / Refri' },
    { id: 'gelo_churrasco', label: 'Gelo, Carvão & Copos' },
    { id: 'petiscos', label: 'Petiscos, Doces & Cigarros' },
  ];

  const scrollInsidePhone = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 sm:py-6 sm:px-4 flex flex-col items-center justify-center selection:bg-amber-500 selection:text-slate-950">
      {/* Moldura de Celular (Fundo Preto + App de Pedidos) */}
      <div className="w-full sm:max-w-[430px] min-h-screen sm:min-h-0 sm:h-[850px] sm:max-h-[93vh] sm:rounded-[44px] sm:border-[8px] sm:border-slate-800 bg-slate-950 shadow-2xl shadow-black overflow-hidden relative flex flex-col">
        {/* Status Bar Superior estilo Smartphone */}
        <div className="hidden sm:flex h-7 bg-slate-900 items-center justify-between px-6 text-[11px] text-slate-300 font-semibold shrink-0 select-none border-b border-slate-800/50">
          <span className="font-mono-tabular">20:45</span>
          <div className="w-20 h-4 bg-black rounded-full" />
          <div className="flex items-center gap-1.5">
            <span>5G</span>
            <div className="w-4 h-2 border border-slate-400 rounded-sm p-0.5">
              <div className="w-full h-full bg-emerald-400 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* App Header Interno */}
        <header className="px-4 py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-display font-black text-sm shrink-0">
              {settings.storeName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-sm text-white truncate">
                {settings.storeName}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <span>Aberto</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-slate-300">
                  {settings.minDeliveryMinutes}–{settings.maxDeliveryMinutes} min
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="font-mono-tabular">{cartTotalItemsCount}</span>
          </button>
        </header>

        {/* Área Rolável do Aplicativo */}
        <div
          id="phone-topo"
          className="flex-1 overflow-y-auto no-scrollbar px-3.5 py-4 space-y-4 bg-slate-950"
        >
          {/* Banner Hero App */}
          <section className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 h-40">
            <img
              src={GENERATED_IMAGES.heroDeposito}
              alt={`${settings.storeName} - Bebidas geladas e delivery`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent" />
            <div className="absolute inset-0 p-4 flex flex-col justify-end space-y-1">
              <div className="text-[11px] font-bold text-amber-400 font-mono-tabular">
                Delivery {settings.neighborhood} · Frete R$ {settings.defaultDeliveryFee.toFixed(2)}
              </div>
              <h2 className="text-lg font-display font-extrabold text-white leading-tight">
                Bebida gelada em casa, na unidade ou no fardo.
              </h2>
            </div>
          </section>

          {/* Card de Pedido em Andamento */}
          {customerOrders.length > 0 && (
            <section className="rounded-2xl bg-slate-900 border border-amber-500/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>Pedido #{customerOrders[0].orderNumber}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-300">
                  {customerOrders[0].status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTrackerInitialTab('STATUS');
                    setTrackingOrderId(customerOrders[0].id);
                  }}
                  className="min-h-[40px] py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Acompanhar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTrackerInitialTab('CHAT');
                    setTrackingOrderId(customerOrders[0].id);
                  }}
                  className="min-h-[40px] py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Chat{' '}
                    {(customerOrders[0].messages || []).length > 0 &&
                      `(${(customerOrders[0].messages || []).length})`}
                  </span>
                </button>
              </div>
            </section>
          )}

          {/* Barra de Busca */}
          <div id="phone-catalogo" className="relative scroll-mt-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cerveja, destilado, gelo..."
              className="w-full min-h-[44px] pl-10 pr-4 py-2.5 text-sm rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Categorias em Scroll Horizontal */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Lista de Produtos estilo Aplicativo de Celular */}
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <Package className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-white">Nenhum produto encontrado</p>
              <p className="text-xs text-slate-400">
                Tente buscar por outro nome ou trocar a categoria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.currentBaseStock <= 0;
                const isLowStock =
                  product.currentBaseStock > 0 && product.currentBaseStock <= product.minAlertStock;
                const fardosCount = Math.floor(product.currentBaseStock / product.conversionFactor);
                const imgFailed = failedImages[product.id];
                const hasPhoto = Boolean(product.image) && !imgFailed;

                return (
                  <article
                    key={product.id}
                    onClick={() => !isOutOfStock && setSelectedProduct(product)}
                    className={`rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-stretch transition-all ${
                      isOutOfStock
                        ? 'opacity-55 cursor-not-allowed'
                        : 'hover:border-amber-500/60 active:scale-[0.99] cursor-pointer group'
                    }`}
                  >
                    {/* Thumbnail à esquerda (apenas quando o dono adicionou foto) */}
                    {hasPhoto && (
                      <div className="w-28 min-h-[120px] bg-slate-950 relative overflow-hidden shrink-0">
                        <img
                          src={product.image}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [product.id]: true }))
                          }
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                              Esgotado
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detalhes à direita */}
                    <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0 space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                          <span className="font-bold text-amber-400 truncate">
                            {product.brand} · {product.volume}
                          </span>
                          <span className="inline-flex items-center gap-1.5 shrink-0">
                            {product.supportsCold && (
                              <span className="inline-flex items-center gap-0.5 text-cyan-400 font-semibold">
                                <Snowflake className="w-3 h-3" /> Gelada
                              </span>
                            )}
                            {product.isReturnable && (
                              <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold">
                                <RefreshCw className="w-3 h-3" /> Casco
                              </span>
                            )}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                          {product.name}
                        </h3>

                        <div className="text-[10px] font-mono-tabular">
                          {isOutOfStock ? (
                            <span className="text-rose-400 font-semibold">Indisponível</span>
                          ) : isLowStock ? (
                            <span className="text-amber-400 font-semibold">
                              Restam {product.currentBaseStock} un
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              {product.currentBaseStock} un
                              {product.conversionFactor > 1 && ` · ${fardosCount} fardos`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-slate-800/80 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          {product.conversionFactor > 1 ? (
                            <div className="space-y-0.5">
                              <div className="text-[10px] text-slate-400 font-mono-tabular">
                                Unid:{' '}
                                <strong className="text-slate-200">
                                  R$ {product.priceUnit.toFixed(2)}
                                </strong>
                              </div>
                              <div className="text-xs font-extrabold text-amber-400 font-mono-tabular">
                                {product.packName}: R$ {product.pricePack.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm font-extrabold text-amber-400 font-mono-tabular">
                              R$ {product.priceUnit.toFixed(2)}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          className={`min-h-[36px] px-2.5 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1 shrink-0 transition-colors ${
                            isOutOfStock
                              ? 'bg-slate-800 text-slate-500'
                              : 'bg-amber-500 group-hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pedir</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Informações do Depósito no fim da rolagem */}
          <footer
            id="phone-info"
            className="pt-4 pb-2 border-t border-slate-800/80 space-y-1.5 text-[11px] text-slate-400"
          >
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-snug">
                {settings.address}, {settings.neighborhood} — {settings.city}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 font-mono-tabular">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {settings.phone}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {settings.minDeliveryMinutes}–{settings.maxDeliveryMinutes} min
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 text-[10px] border-t border-slate-900">
              {cloudUser?.emailVerified ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <Cloud className="w-3 h-3" />
                  <span>Nuvem conectada ({cloudUser.email})</span>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={cloudSyncing}
                  onClick={() => void connectCloudGoogle()}
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                >
                  <Cloud className="w-3 h-3" />
                  <span>
                    {cloudSyncing ? 'Conectando...' : 'Já pediu antes? Entrar com Google para rastrear'}
                  </span>
                </button>
              )}
            </div>
          </footer>
        </div>

        {/* Barra Inferior Fixa Dentro do Celular */}
        <div className="bg-slate-900 border-t border-slate-800 shrink-0">
          {cart.length > 0 ? (
            <div className="p-3">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-between shadow-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-950 text-amber-400 font-mono-tabular font-black text-[11px] flex items-center justify-center">
                    {cartTotalItemsCount}
                  </span>
                  <span>Finalizar Sacola</span>
                </div>
                <div className="flex items-center gap-1 font-mono-tabular font-black text-sm">
                  <span>R$ {(cartTotalAmount + settings.defaultDeliveryFee).toFixed(2)}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          ) : (
            <nav className="grid grid-cols-3 h-14">
              <button
                type="button"
                onClick={() => scrollInsidePhone('phone-catalogo')}
                className="flex flex-col items-center justify-center gap-0.5 text-amber-400 text-[11px] font-bold cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Cardápio</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customerOrders.length > 0) {
                    setTrackerInitialTab('STATUS');
                    setTrackingOrderId(customerOrders[0].id);
                  } else {
                    scrollInsidePhone('phone-info');
                  }
                }}
                className="flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-white text-[11px] font-medium cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>{customerOrders.length > 0 ? 'Meu Pedido' : 'Depósito'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-white text-[11px] font-medium cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Sacola ({cartTotalItemsCount})</span>
              </button>
            </nav>
          )}

          {/* Home Bar estilo Smartphone */}
          <div className="hidden sm:flex h-4 bg-slate-950 items-center justify-center">
            <div className="w-28 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>

      {/* Modais de Produto, Carrinho e Rastreio */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
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
};
