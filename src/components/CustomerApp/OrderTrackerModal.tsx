import React, { useState, useRef, useEffect } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  X,
  Clock,
  CheckCircle,
  Truck,
  Package,
  Phone,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  Send,
  Store,
  User,
  ArrowLeft,
  Copy,
  Check,
  Cloud,
} from 'lucide-react';

interface OrderTrackerModalProps {
  orderId: string | null;
  onClose: () => void;
  initialTab?: 'STATUS' | 'CHAT';
}

const QUICK_CUSTOMER_PROMPTS = [
  'Favor trazer a cerveja trincando de gelada! ❄️',
  'Preciso de troco em dinheiro, tem como? 💵',
  'Interfone quebrado, favor buzinar no portão preto 🚪',
  'Quantos minutos para a entrega chegar? ⏱️',
  'Os cascos vazios já estão separados para troca! 🔄',
];

const formatSafeTime = (timestamp?: string) => {
  if (!timestamp) return '';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  orderId,
  onClose,
  initialTab = 'STATUS',
}) => {
  const {
    orders,
    motoboys,
    settings,
    sendOrderMessage,
    cloudUser,
    cloudSyncing,
    connectCloudGoogle,
  } = useBeverage();
  const [activeTab, setActiveTab] = useState<'STATUS' | 'CHAT'>(initialTab);
  const [inputText, setInputText] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, orderId]);

  const order = orders.find((o) => o.id === orderId);
  const assignedMotoboy = motoboys.find((m) => m.id === order?.motoboyId);
  const messages = order?.messages || [];
  const messagesCount = messages.length;

  // Auto scroll messages to bottom safely
  const scrollToBottom = () => {
    try {
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      try {
        messagesEndRef.current?.scrollIntoView?.();
      } catch {
        // Safe fallback
      }
    }
  };

  useEffect(() => {
    if (orderId && activeTab === 'CHAT') {
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [messagesCount, activeTab, orderId]);

  if (!orderId || !order) return null;

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text || !text.trim()) return;

    const customerName = order.customer?.name || 'Cliente';
    sendOrderMessage(order.id, 'CLIENTE', customerName, text.trim());
    setInputText('');
  };

  // Safe WhatsApp Link & Action
  const cleanStorePhone = (settings?.phone || '').replace(/\D/g, '');
  const encodedMsgLoja = encodeURIComponent(
    `Olá! Sou ${order.customer?.name || 'Cliente'}, gostaria de informações sobre o meu Pedido #${order.orderNumber} no ${settings?.storeName || 'Depósito'}.`
  );
  const whatsappLojaUrl = cleanStorePhone ? `https://wa.me/55${cleanStorePhone}?text=${encodedMsgLoja}` : '#';

  const cleanMotoboyPhone = (assignedMotoboy?.phone || '').replace(/\D/g, '');
  const encodedMsgMotoboy = encodeURIComponent(
    `Olá ${order.motoboyName || 'Entregador'}! Sou ${order.customer?.name || 'Cliente'} do Pedido #${order.orderNumber}.`
  );
  const whatsappMotoboyUrl = cleanMotoboyPhone ? `https://wa.me/55${cleanMotoboyPhone}?text=${encodedMsgMotoboy}` : '#';

  const handleCopyPhone = (phone: string) => {
    try {
      navigator.clipboard?.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // ignore
    }
  };

  // Status mapping
  const steps = [
    { key: 'PENDENTE', label: 'Pedido Recebido', desc: 'Aguardando confirmação do balcão' },
    { key: 'CONFIRMADO_PREPARO', label: 'Separando & Gelando', desc: 'Bebidas no ponto ideal' },
    { key: 'EM_ROTA', label: 'Saiu para Entrega', desc: 'Motoboy a caminho do seu endereço' },
    { key: 'ENTREGUE', label: 'Entregue!', desc: 'Aproveite sua bebida gelada' },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case 'PENDENTE':
        return 0;
      case 'CONFIRMADO_PREPARO':
      case 'AGUARDANDO_MOTOBOY':
        return 1;
      case 'EM_ROTA':
        return 2;
      case 'ENTREGUE':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(order.status);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full h-[92vh] max-h-[680px] flex flex-col text-white shadow-2xl overflow-hidden relative">
        <ErrorBoundary fallbackTitle="Erro ao carregar detalhes do pedido">
          {/* Header Modal com Título e Botão Fechar */}
          <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Pedido #{order.orderNumber}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatSafeTime(order.createdAt)}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Abas: Status da Entrega vs Chat */}
          <div className="px-3 sm:px-4 pt-2.5 pb-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('STATUS')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'STATUS'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Rastreamento</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CHAT')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all relative ${
                activeTab === 'CHAT'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat do Pedido</span>
              {messagesCount > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'CHAT'
                      ? 'bg-slate-950 text-amber-400'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {messagesCount}
                </span>
              )}
            </button>
          </div>

          {!cloudUser?.emailVerified && (
            <div className="px-3 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between gap-2 text-[11px] shrink-0">
              <span className="text-amber-200 flex items-center gap-1.5 min-w-0">
                <Cloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Conecte o Google para receber status e chat ao vivo.</span>
              </span>
              <button
                type="button"
                disabled={cloudSyncing}
                onClick={() => void connectCloudGoogle()}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shrink-0 cursor-pointer"
              >
                {cloudSyncing ? 'Conectando...' : 'Conectar'}
              </button>
            </div>
          )}

          {/* Conteúdo Aba 1: Rastreamento do Pedido */}
          {activeTab === 'STATUS' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 no-scrollbar">
              {/* Live Status Tracker Bar */}
              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {steps.map((st, idx) => {
                  const isDone = idx < currentIndex;
                  const isCurrent = idx === currentIndex;
                  return (
                    <div key={st.key} className="relative flex items-start gap-4">
                      <div
                        className={`absolute -left-6 top-0 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : isCurrent
                            ? 'bg-amber-500 border-amber-400 animate-pulse ring-4 ring-amber-500/20'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      >
                        {isDone && <CheckCircle className="w-3 h-3 text-slate-950" />}
                      </div>

                      <div className="flex-1">
                        <h4
                          className={`text-xs font-extrabold tracking-wide uppercase ${
                            isCurrent
                              ? 'text-amber-400'
                              : isDone
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {st.label}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Motoboy Card com Opções de Contato Direto */}
              {order.motoboyName ? (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Seu Entregador Designado
                        </span>
                        <h5 className="text-sm font-black text-white">{order.motoboyName}</h5>
                        <p className="text-xs text-slate-300">
                          {assignedMotoboy?.vehicleModel || 'Em rota com baú térmico lacrado'}
                        </p>
                      </div>
                    </div>

                    {assignedMotoboy?.phone && (
                      <a
                        href={`tel:${assignedMotoboy.phone}`}
                        className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-bold shrink-0"
                        title="Ligar para o Motoboy"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ligar</span>
                      </a>
                    )}
                  </div>

                  {/* Ações de Contato com o Motoboy */}
                  <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                    <button
                      type="button"
                      onClick={() => setActiveTab('CHAT')}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Conversar no Chat {messagesCount > 0 && `(${messagesCount})`}</span>
                    </button>

                    {assignedMotoboy?.phone && (
                      <a
                        href={whatsappMotoboyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/40 transition-colors"
                        title="Abrir WhatsApp com o Motoboy"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Precisa falar com o depósito?</h5>
                      <p className="text-[11px] text-slate-400">
                        Tire dúvidas sobre o pedido ou solicite alteração.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('CHAT')}
                    className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <span>Abrir Chat</span>
                    {messagesCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-slate-950 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                        {messagesCount}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Vasilhame instructions reminder */}
              {order.vasilhamesVaziosAReceber > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <RefreshCw className="w-4 h-4" />
                    <span>Lembrete de Vasilhames</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Tenha em mãos os{' '}
                    <strong className="text-white font-bold">
                      {order.vasilhamesVaziosAReceber} cascos vazios
                    </strong>{' '}
                    para troca no momento em que o motoboy chegar!
                  </p>
                </div>
              )}

              {/* Order Items & Totals */}
              <div className="space-y-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-2xl border border-slate-800">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  Itens do Pedido
                </h5>
                <div className="space-y-2 text-xs divide-y divide-slate-800/80">
                  {(order.items || []).map((it) => (
                    <div key={it.id} className="pt-2 first:pt-0 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">
                          {it.quantity}x {it.productName}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          {it.presentation === 'FARDO' ? 'Fardo' : 'Unidade'} •{' '}
                          {it.temperature === 'GELADA' ? '❄️ Gelada' : '🌡️ Natural'}
                        </div>
                      </div>
                      <span className="font-bold text-amber-400">
                        R$ {(it.subtotal || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Pagamento:</span>
                    <span className="font-bold text-white uppercase">
                      {(order.paymentMethod || '').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Entrega em:</span>
                    <span className="text-white truncate max-w-[200px]">
                      {order.customer?.address || 'Endereço'}, {order.customer?.number || 'S/N'} (
                      {order.customer?.neighborhood || 'Bairro'})
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                    <span>Total Pago:</span>
                    <span className="text-amber-400 font-extrabold text-base">
                      R$ {(order.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo Aba 2: Chat em Tempo Real com a Loja e o Motoboy */}
          {activeTab === 'CHAT' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950/40">
              {/* Topo do Chat com Status e WhatsApp */}
              <div className="px-3 sm:px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <button
                    type="button"
                    onClick={() => setActiveTab('STATUS')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
                    title="Voltar ao Rastreamento"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block leading-tight">
                      Canal Oficial do Pedido
                    </span>
                    <span className="font-bold text-white truncate block">
                      {order.motoboyName
                        ? `${settings?.storeName || 'Depósito'} & ${order.motoboyName}`
                        : `${settings?.storeName || 'Depósito'} (Central)`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {settings?.phone && (
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(settings.phone)}
                      className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      title="Copiar Telefone da Loja"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span className="hidden sm:inline">{copiedPhone ? 'Copiado!' : 'Copiar Tel'}</span>
                    </button>
                  )}

                  <a
                    href={whatsappLojaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-colors"
                    title="Abrir no WhatsApp da Loja"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Stream de Mensagens */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 no-scrollbar">
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">
                      Nenhuma mensagem enviada ainda.
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Precisa de troco, quer avisar sobre o portão ou tirar dúvidas? Envie uma mensagem
                      abaixo!
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMine = msg.sender === 'CLIENTE';
                    const isFromMotoboy = msg.sender === 'MOTOBOY';
                    const isFromStore = msg.sender === 'LOJA';

                    return (
                      <div
                        key={msg.id || `msg-${index}`}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                          {isFromMotoboy ? (
                            <span className="text-cyan-400 font-bold flex items-center gap-1">
                              <Truck className="w-3 h-3" /> {msg.senderName || 'Motoboy'}
                            </span>
                          ) : isFromStore ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Store className="w-3 h-3" /> {msg.senderName || 'Loja'}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <User className="w-3 h-3" /> {msg.senderName || 'Você'}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatSafeTime(msg.timestamp)}</span>
                        </div>

                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-md leading-relaxed ${
                            isMine
                              ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                              : isFromMotoboy
                              ? 'bg-cyan-950 border border-cyan-500/40 text-cyan-100 rounded-tl-none font-medium'
                              : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Atalhos Rápidos de Mensagem */}
              <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {QUICK_CUSTOMER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Barra de Digitação */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite sua mensagem para a loja ou entregador..."
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`p-2 rounded-xl font-bold transition-all shadow-md ${
                    inputText.trim()
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Enviar"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </ErrorBoundary>
      </div>
    </div>
  );
};
