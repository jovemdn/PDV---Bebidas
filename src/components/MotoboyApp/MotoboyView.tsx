import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Order, Motoboy } from '../../types';
import { OrderChatModal } from '../CustomerApp/OrderChatModal';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  Truck,
  Phone,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Clock,
  DollarSign,
  Banknote,
  CreditCard,
  QrCode,
  Snowflake,
  RefreshCw,
  Power,
  Navigation,
  AlertTriangle,
  Smartphone,
  Monitor,
  Package,
  Layers,
  ChevronRight,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';

export const MotoboyView: React.FC = () => {
  const {
    currentUser,
    motoboys,
    orders,
    updateOrderStatus,
    assignMotoboyToOrder,
    toggleMotoboyOnline,
    notifyCustomerArrival,
    settings,
  } = useBeverage();

  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [deviceViewMode, setDeviceViewMode] = useState<'MOBILE' | 'DESKTOP'>('MOBILE');

  // Find the logged-in motoboy
  const currentMotoboy: Motoboy =
    motoboys.find((m) => m.id === currentUser?.motoboyId) ||
    motoboys.find((m) => m.name.toLowerCase().includes('carlos')) ||
    motoboys[0];

  // Active delivery orders assigned to this motoboy OR pending assignment
  const myAssignedOrders = orders.filter(
    (o) => o.channel === 'DELIVERY_APP' && o.motoboyId === currentMotoboy?.id && o.status !== 'ENTREGUE' && o.status !== 'CANCELADO'
  );

  const readyToPickOrders = orders.filter(
    (o) =>
      o.channel === 'DELIVERY_APP' &&
      !o.motoboyId &&
      (o.status === 'CONFIRMADO_PREPARO' || o.status === 'AGUARDANDO_MOTOBOY')
  );

  const todayDateStr = new Date().toDateString();
  const completedTodayOrders = orders.filter(
    (o) =>
      o.channel === 'DELIVERY_APP' &&
      o.motoboyId === currentMotoboy?.id &&
      o.status === 'ENTREGUE' &&
      new Date(o.createdAt).toDateString() === todayDateStr
  );

  // Safe WhatsApp link to customer
  const getCustomerWhatsAppUrl = (order: Order) => {
    const rawPhone = (order.customer.phone || '').replace(/\D/g, '');
    if (!rawPhone) return '#';
    const msg = encodeURIComponent(
      `Olá ${order.customer.name}! Sou o ${currentMotoboy.name}, motoboy do ${settings.storeName}. Estou com o seu Pedido #${order.orderNumber} a caminho do seu endereço (${order.customer.address}, ${order.customer.number})! 🛵💨`
    );
    return `https://wa.me/55${rawPhone}?text=${msg}`;
  };

  // Safe Google Maps Route Link
  const getGoogleMapsRouteUrl = (order: Order) => {
    const query = encodeURIComponent(
      `${order.customer.address}, ${order.customer.number}, ${order.customer.neighborhood}, ${settings.city}`
    );
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const handleCallCustomer = (phone: string) => {
    const rawPhone = phone.replace(/\D/g, '');
    if (!rawPhone) return;
    try {
      window.location.href = `tel:${rawPhone}`;
    } catch {
      // fallback
    }
  };

  const handleConfirmDelivered = (orderId: string) => {
    updateOrderStatus(orderId, 'ENTREGUE');
  };

  const handleTakeOrder = (orderId: string) => {
    assignMotoboyToOrder(orderId, currentMotoboy.id);
  };

  // Render Inner Content
  const content = (
    <div className="space-y-4 pb-20 text-slate-100">
      {/* Motoboy Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-4 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-md">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">{currentMotoboy.name}</h2>
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                  currentMotoboy.isOnline
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentMotoboy.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                {currentMotoboy.isOnline ? 'Disponível / Online' : 'Pausa / Offline'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {currentMotoboy.vehicleModel} &bull; <strong className="text-slate-300">{currentMotoboy.vehiclePlate}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toggleMotoboyOnline(currentMotoboy.id)}
          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
            currentMotoboy.isOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
          title="Alternar Status Online/Offline"
        >
          <Power className="w-4 h-4" />
          <span className="hidden sm:inline">{currentMotoboy.isOnline ? 'Ficar Offline' : 'Ficar Online'}</span>
        </button>
      </div>

      {/* Caixa do Motoboy no Turno / Prestação de Contas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Entregas Hoje
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-white">
              {currentMotoboy.totalDeliveriesCompletedToday}
            </span>
            <span className="text-[10px] text-slate-500">concluídas</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5" /> Dinheiro em Mãos
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black text-amber-400">
              R$ {currentMotoboy.totalCollectedCash.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-500 block">Acerto na loja</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> Maquininha
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black text-cyan-400">
              R$ {currentMotoboy.totalCollectedCard.toFixed(2)}
            </span>
            <span className="text-[9px] text-slate-500 block">Coletado no cartão</span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" /> Minha Comissão
          </span>
          <div className="mt-1">
            <span className="text-base sm:text-lg font-black text-emerald-400">
              R$ {currentMotoboy.commissionBalance.toFixed(2)}
            </span>
            <span className="text-[9px] text-emerald-300 block">
              R$ {settings.motoboyCommission.toFixed(2)}/entrega
            </span>
          </div>
        </div>
      </div>

      {/* Seção 1: Minhas Entregas em Andamento */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Minhas Entregas em Rota ({myAssignedOrders.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500">Sincronizado em tempo real</span>
        </div>

        {myAssignedOrders.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 text-center space-y-2">
            <p className="text-2xl">🎉</p>
            <p className="text-xs font-bold text-slate-300">Você não possui nenhuma entrega em rota no momento.</p>
            <p className="text-[11px] text-slate-500">
              Assim que a loja despachar um pedido para você ou você pegar um pedido pronto abaixo, ele aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myAssignedOrders.map((order) => {
              const customerPhone = order.customer.phone || '';
              const whatsappUrl = getCustomerWhatsAppUrl(order);
              const mapsUrl = getGoogleMapsRouteUrl(order);
              const isCash = order.paymentMethod === 'DINHEIRO';
              const isPix = order.paymentMethod === 'PIX';
              const isCard = order.paymentMethod === 'CARTAO_ENTREGA';

              return (
                <div
                  key={order.id}
                  className="rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-4 sm:p-5 shadow-2xl space-y-4"
                >
                  {/* Header do Pedido */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-slate-950">
                        Pedido #{order.orderNumber}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {order.status === 'EM_ROTA' ? 'Saiu para Entrega' : 'Pronto p/ Levar'}
                    </span>
                  </div>

                  {/* Dados do Cliente & Endereço */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                          {order.customer.name}
                        </h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {order.customer.phone}
                        </p>
                      </div>

                      {/* Botão de Avisar Chegada / Buzinar */}
                      <button
                        type="button"
                        onClick={() => notifyCustomerArrival(order.id)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1 shadow-sm transition-all"
                        title="Envia aviso no chat que você chegou no portão"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Avisar "Cheguei!"</span>
                      </button>
                    </div>

                    {/* Endereço com Botão Abrir GPS / Mapa */}
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div className="text-xs truncate">
                          <p className="font-extrabold text-white truncate">
                            {order.customer.address}, {order.customer.number}
                          </p>
                          <p className="text-slate-400 text-[11px] truncate">
                            {order.customer.neighborhood} {order.customer.complement ? `&bull; ${order.customer.complement}` : ''}
                          </p>
                        </div>
                      </div>

                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Abrir GPS</span>
                      </a>
                    </div>
                  </div>

                  {/* Alerta de Vasilhames para Recolher */}
                  {order.vasilhamesVaziosAReceber > 0 && (
                    <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-center gap-2 text-xs font-bold animate-pulse">
                      <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        ATENÇÃO: Recolher <strong>{order.vasilhamesVaziosAReceber} casco(s) vazio(s)</strong> retornáveis na entrega!
                      </span>
                    </div>
                  )}

                  {/* Cobrança / Pagamento */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Forma de Cobrança:
                      </span>
                      <span className="font-black text-white flex items-center gap-1.5 mt-0.5">
                        {isCash && <Banknote className="w-4 h-4 text-emerald-400" />}
                        {isCard && <CreditCard className="w-4 h-4 text-cyan-400" />}
                        {isPix && <QrCode className="w-4 h-4 text-amber-400" />}
                        {order.paymentMethod.replace('_', ' ')}
                      </span>
                      {order.changeFor && (
                        <span className="text-[10px] text-amber-400 block font-semibold">
                          Levar troco para: R$ {order.changeFor.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Valor da Corrida:
                      </span>
                      <span className="text-base font-black text-emerald-400 block">
                        R$ {order.totalAmount.toFixed(2)}
                      </span>
                      {isPix && (
                        <span className="text-[10px] text-emerald-300 font-bold">
                          ✓ Pago Online
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Resumo de Itens */}
                  <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Itens da Entrega:</span>
                    {order.items.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-slate-300 text-[11px]">
                        <span>
                          {it.quantity}x {it.productName} ({it.presentation === 'FARDO' ? 'Fardo' : 'Un'}){' '}
                          {it.temperature === 'GELADA' ? '❄️' : ''}
                        </span>
                        <span className="font-semibold">R$ {it.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* 4 Botões Grandes de Comunicação & Ação */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* Botão 1: Ligar para Cliente */}
                    <button
                      type="button"
                      onClick={() => handleCallCustomer(customerPhone)}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
                      title="Ligar para o número do cliente"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>Ligar</span>
                    </button>

                    {/* Botão 2: WhatsApp */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      title="Chamar no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-300" />
                      <span>WhatsApp</span>
                    </a>

                    {/* Botão 3: Chat no App */}
                    <button
                      type="button"
                      onClick={() => setActiveChatOrderId(order.id)}
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 active:scale-95 transition-all relative"
                      title="Abrir chat direto no aplicativo"
                    >
                      <MessageCircle className="w-4 h-4 text-amber-400" />
                      <span>Chat App</span>
                      {(order.messages || []).length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                          {(order.messages || []).length}
                        </span>
                      )}
                    </button>

                    {/* Botão 4: Confirmar Entrega Concluída */}
                    <button
                      type="button"
                      onClick={() => handleConfirmDelivered(order.id)}
                      className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finalizar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção 2: Pedidos Prontos para Pegar no Balcão */}
      {readyToPickOrders.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Pedidos Prontos no Balcão para Assumir ({readyToPickOrders.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500">Aguardando entregador</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {readyToPickOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">#{order.orderNumber}</span>
                    <span className="text-xs text-slate-400">{order.customer.name}</span>
                    <span className="text-[10px] font-bold text-emerald-400">R$ {order.totalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {order.customer.address}, {order.customer.number} &bull; {order.customer.neighborhood}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleTakeOrder(order.id)}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 shadow-md transition-all active:scale-95 flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Pegar Pedido</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção 3: Histórico de Entregas Finalizadas Hoje */}
      {completedTodayOrders.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Entregas Finalizadas Hoje ({completedTodayOrders.length})</span>
          </h3>

          <div className="space-y-2">
            {completedTodayOrders.map((order) => (
              <div
                key={order.id}
                className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-300"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white">Pedido #{order.orderNumber}</span>
                    <span className="text-emerald-400 font-bold">✓ Entregue</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {order.customer.name} &bull; {order.customer.neighborhood}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-white">R$ {order.totalAmount.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">{order.paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Chat Integrado com o Cliente */}
      <ErrorBoundary fallbackTitle="Erro ao abrir chat da entrega">
        {activeChatOrderId && (
          <OrderChatModal
            orderId={activeChatOrderId}
            isOpen={!!activeChatOrderId}
            onClose={() => setActiveChatOrderId(null)}
            actingAs="MOTOBOY"
          />
        )}
      </ErrorBoundary>
    </div>
  );

  // If mobile frame is selected, wrap inside sleek phone mockup
  if (deviceViewMode === 'MOBILE') {
    return (
      <div className="py-6 px-4 flex flex-col items-center justify-start min-h-[calc(100vh-4rem)] bg-slate-950">
        {/* Toggle Bar Top */}
        <div className="mb-4 flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setDeviceViewMode('MOBILE')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Modo Celular (Guidão da Moto)</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceViewMode('DESKTOP')}
            className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Modo Tela Cheia (Computador)</span>
          </button>
        </div>

        {/* Smartphone Frame */}
        <div className="w-full max-w-[420px] rounded-[42px] border-[8px] border-slate-800 bg-slate-950 shadow-2xl shadow-black overflow-hidden relative flex flex-col h-[820px] max-h-[88vh]">
          {/* Status Bar */}
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3.5 relative">
            {content}
          </div>

          {/* Home Bar */}
          <div className="h-4 bg-slate-950 flex items-center justify-center shrink-0">
            <div className="w-28 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Desktop Fullscreen Mode
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between bg-slate-900 p-2.5 rounded-2xl border border-slate-800">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <Truck className="w-4 h-4 text-amber-400" />
          <span>Painel de Entregas do Motoboy (Visão Computador Grande)</span>
        </span>

        <button
          type="button"
          onClick={() => setDeviceViewMode('MOBILE')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Alternar para Modo Celular</span>
        </button>
      </div>

      {content}
    </div>
  );
};
