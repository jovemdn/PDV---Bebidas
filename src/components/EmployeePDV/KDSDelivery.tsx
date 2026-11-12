import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { OrderStatus, Order } from '../../types';
import { OrderChatModal } from '../CustomerApp/OrderChatModal';
import { CancelOrderModal } from './CancelOrderModal';
import {
  Bell,
  Clock,
  Truck,
  CheckCircle,
  Package,
  MapPin,
  RefreshCw,
  Snowflake,
  UserCheck,
  Play,
  Volume2,
  Phone,
  MessageCircle,
  ExternalLink,
  Megaphone,
  Lock,
  Ban,
} from 'lucide-react';

export const KDSDelivery: React.FC = () => {
  const {
    orders,
    motoboys,
    currentUser,
    updateOrderStatus,
    assignMotoboyToOrder,
    soundEnabled,
    toggleSound,
    notifyCustomerArrival,
    settings,
  } = useBeverage();

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ATIVOS');
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [activeChatOrderId, setActiveChatOrderId] = useState<string | null>(null);
  const [activeChatRole, setActiveChatRole] = useState<'LOJA' | 'MOTOBOY'>('LOJA');
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);

  const canCancel = !currentUser || currentUser.role === 'DONO' || currentUser.role === 'BALCAO';

  // Filter delivery orders
  const deliveryOrders = orders.filter((o) => o.channel === 'DELIVERY_APP');

  const filteredOrders = deliveryOrders.filter((order) => {
    if (selectedStatusFilter === 'ATIVOS') {
      return order.status !== 'ENTREGUE' && order.status !== 'CANCELADO';
    }
    if (selectedStatusFilter === 'TODOS') return true;
    return order.status === selectedStatusFilter;
  });

  const pendingCount = deliveryOrders.filter((o) => o.status === 'PENDENTE').length;

  return (
    <div className="space-y-5">
      {/* KDS Header with Live Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">
                Central de Pedidos Delivery (KDS)
              </h2>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white font-black text-xs animate-bounce">
                  {pendingCount} novo(s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Despacho de pedidos, separação de bebidas geladas e rotas de entrega
            </p>
          </div>
        </div>

        {/* Audio Status & Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>{soundEnabled ? 'Alerta Sonoro Ativo' : 'Alerta Silenciado'}</span>
          </button>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            {['ATIVOS', 'PENDENTE', 'EM_ROTA', 'ENTREGUE', 'CANCELADO', 'TODOS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedStatusFilter(tab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedStatusFilter === tab
                    ? tab === 'CANCELADO'
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'ATIVOS'
                  ? 'Em Andamento'
                  : tab === 'PENDENTE'
                  ? 'Novos'
                  : tab === 'EM_ROTA'
                  ? 'Na Rua'
                  : tab === 'ENTREGUE'
                  ? 'Concluídos'
                  : tab === 'CANCELADO'
                  ? 'Cancelados'
                  : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Pedidos */}
      {filteredOrders.length === 0 ? (
        <div className="py-20 text-center text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-600" />
          <h3 className="text-sm font-bold text-slate-400">Nenhum pedido neste filtro</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Abra a aba "App do Cliente" no topo para fazer um pedido e ver o alerta sonoro tocar aqui instantaneamente!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isPending = order.status === 'PENDENTE';
            const isCooking = order.status === 'CONFIRMADO_PREPARO' || order.status === 'AGUARDANDO_MOTOBOY';
            const isInRoute = order.status === 'EM_ROTA';
            const isDelivered = order.status === 'ENTREGUE';
            const isCanceled = order.status === 'CANCELADO';

            return (
              <div
                key={order.id}
                className={`p-4 rounded-3xl border flex flex-col justify-between transition-all shadow-xl ${
                  isCanceled
                    ? 'bg-rose-950/20 border-rose-500/30 opacity-85'
                    : isPending
                    ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/40 shadow-amber-950/40'
                    : isInRoute
                    ? 'bg-slate-900 border-cyan-500/60'
                    : isDelivered
                    ? 'bg-slate-900/50 border-slate-800 opacity-75'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-amber-400">
                        #{order.orderNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isCanceled
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isPending
                          ? 'bg-red-500 text-white animate-pulse'
                          : isCooking
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isInRoute
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Informações do Cliente & Endereço */}
                  <div className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-white">{order.customer.name}</span>
                      <span className="text-[11px] text-slate-400">{order.customer.phone}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        {order.customer.address}, {order.customer.number}{' '}
                        {order.customer.complement && `(${order.customer.complement})`} -{' '}
                        {order.customer.neighborhood}
                      </span>
                    </p>

                    {/* BOTÕES DE CONTATO DIRETO DO MOTOBOY / LOJA COM O CLIENTE */}
                    <div className="flex items-center gap-1.5 pt-2">
                      {/* WhatsApp do Cliente */}
                      <a
                        href={`https://wa.me/55${order.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Olá ${order.customer.name}! Sou ${order.motoboyName ? `o motoboy ${order.motoboyName}` : `do ${settings.storeName}`}. Estou com seu pedido #${order.orderNumber} (R$ ${order.totalAmount.toFixed(2)}). ${order.vasilhamesVaziosAReceber > 0 ? `Lembre-se de deixar separados ${order.vasilhamesVaziosAReceber} cascos de garrafa vazios para troca!` : ''} Chego em instantes!`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-[10px] flex items-center justify-center gap-1 border border-emerald-500/30 transition-colors"
                        title="Enviar mensagem no WhatsApp do cliente"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Ligar Telefone */}
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 border border-slate-700 transition-colors"
                        title="Ligar para o número do cliente"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>Ligar</span>
                      </a>

                      {/* Chat do Pedido */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveChatRole(order.status === 'EM_ROTA' ? 'MOTOBOY' : 'LOJA');
                          setActiveChatOrderId(order.id);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30 transition-colors relative"
                        title="Abrir Chat em Tempo Real com o cliente"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>Chat</span>
                        {(order.messages || []).length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center">
                            {(order.messages || []).length}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ALERTA DE CASCO RETORNÁVEL (REGRA BRASILEIRA) */}
                  {order.vasilhamesVaziosAReceber > 0 && (
                    <div className="p-2.5 mb-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 font-bold">
                      <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        ⚠️ MOTOBOY: Recolher {order.vasilhamesVaziosAReceber} casco(s) vazio(s) na entrega!
                      </span>
                    </div>
                  )}

                  {/* Lista de Itens do Pedido */}
                  <div className="space-y-1.5 py-2 border-t border-b border-slate-800 text-xs">
                    {order.items.map((it) => (
                      <div key={it.id} className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded bg-slate-800 text-amber-400 inline-flex items-center justify-center text-[10px] font-black">
                              {it.quantity}x
                            </span>
                            <span>{it.productName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 pl-6 flex items-center gap-2">
                            <span>{it.presentation === 'FARDO' ? 'Fardo c/ ' + it.unitsCount / it.quantity : '1 Lata/Garrafa'}</span>
                            {it.temperature === 'GELADA' ? (
                              <span className="text-cyan-300 font-bold flex items-center gap-0.5">
                                <Snowflake className="w-2.5 h-2.5" /> GELADA
                              </span>
                            ) : (
                              <span>Natural</span>
                            )}
                            {it.vasilhameOption === 'TROCA' && (
                              <span className="text-emerald-400 font-semibold">🔄 Troca</span>
                            )}
                          </div>
                        </div>
                        <span className="text-amber-400 font-bold">
                          R$ {it.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totais e Pagamento */}
                  <div className="py-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Pgto: <strong className="text-white uppercase">{order.paymentMethod.replace('_', ' ')}</strong>
                      {order.changeFor && ` (Troco p/ R$ ${order.changeFor.toFixed(2)})`}
                    </span>
                    <span className="text-sm font-black text-amber-400">
                      R$ {order.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Motoboy Atual se atribuído */}
                  {order.motoboyName && (
                    <div className="mt-1 p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center gap-2 text-slate-300">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Entregador: <strong className="text-white">{order.motoboyName}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações de Transição de Status */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  {isPending && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'CONFIRMADO_PREPARO')}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Aceitar Pedido & Iniciar Separação</span>
                    </button>
                  )}

                  {isCooking && (
                    <div>
                      {assigningOrderId === order.id ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">
                            Selecione o Motoboy para Saída:
                          </label>
                          <div className="space-y-1">
                            {motoboys
                              .slice()
                              .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                              .map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    assignMotoboyToOrder(order.id, m.id);
                                    setAssigningOrderId(null);
                                  }}
                                  className="w-full p-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500 border border-slate-700 text-xs text-left flex items-center justify-between text-white"
                                >
                                  <div>
                                    <div className="font-bold flex items-center gap-1.5">
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          m.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                                        }`}
                                      />
                                      <span>{m.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 pl-3.5">
                                      {m.vehicleModel} ({m.vehiclePlate})
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-amber-300">
                                    {m.activeDeliveriesCount} em rota
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningOrderId(order.id)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Despachar / Atribuir Motoboy</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isInRoute && (
                    <div className="space-y-1.5">
                      <button
                        onClick={() => notifyCustomerArrival(order.id)}
                        className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        title="Envia mensagem urgente no chat do cliente avisando para ir ao portão com os cascos vazios"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>Avisar Chegada (No Portão)</span>
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'ENTREGUE')}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirmar Entrega Concluída</span>
                      </button>
                    </div>
                  )}

                  {isDelivered && (
                    <div className="text-center py-1 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1">
                      <UserCheck className="w-4 h-4" />
                      <span>Entrega Finalizada</span>
                    </div>
                  )}

                  {isCanceled ? (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 space-y-0.5">
                      <div className="font-black uppercase flex items-center gap-1 text-rose-400">
                        <Ban className="w-3 h-3" /> Pedido Cancelado & Estornado
                      </div>
                      <p>Motivo: {order.cancelReason || 'Cancelado pela loja'}</p>
                      <p className="text-rose-400/80">Por: {order.canceledBy || 'Operador'}</p>
                    </div>
                  ) : (
                    canCancel && (
                      <button
                        type="button"
                        onClick={() => setOrderToCancel(order)}
                        className="w-full py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Cancelar Venda / Pedido (Senha)</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Chat em Tempo Real com o Cliente / Motoboy */}
      <OrderChatModal
        orderId={activeChatOrderId}
        isOpen={!!activeChatOrderId}
        onClose={() => setActiveChatOrderId(null)}
        actingAs={activeChatRole}
      />

      {/* Modal de Cancelamento com Senha */}
      <CancelOrderModal
        order={orderToCancel}
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
      />
    </div>
  );
};
