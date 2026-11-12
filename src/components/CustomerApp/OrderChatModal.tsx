import React, { useState, useRef, useEffect } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  X,
  Send,
  MessageCircle,
  Truck,
  Store,
  User,
  ExternalLink,
} from 'lucide-react';

interface OrderChatModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  actingAs?: 'CLIENTE' | 'LOJA' | 'MOTOBOY';
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

export const OrderChatModal: React.FC<OrderChatModalProps> = ({
  orderId,
  isOpen,
  onClose,
  actingAs = 'CLIENTE',
}) => {
  const { orders, sendOrderMessage, settings } = useBeverage();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const order = orders.find((o) => o.id === orderId);
  const messages = order?.messages || [];

  const scrollToBottom = () => {
    try {
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {
      try {
        messagesEndRef.current?.scrollIntoView?.();
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      const timer = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isOpen, orderId]);

  if (!isOpen || !orderId || !order) return null;

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text || !text.trim()) return;

    let senderName = order.customer?.name || 'Cliente';
    if (actingAs === 'LOJA') senderName = settings?.storeName || 'Loja';
    if (actingAs === 'MOTOBOY') senderName = order.motoboyName || 'Motoboy da Entrega';

    sendOrderMessage(order.id, actingAs, senderName, text.trim());
    setInputText('');
  };

  // WhatsApp Link da Loja formatado
  const cleanPhone = (settings?.phone || '').replace(/\D/g, '');
  const encodedMsgLoja = encodeURIComponent(
    `Olá! Sou ${order.customer?.name || 'Cliente'}, gostaria de falar sobre o meu Pedido #${order.orderNumber} no ${settings?.storeName || 'Depósito'}.`
  );
  const whatsappLojaUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encodedMsgLoja}` : '#';

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!whatsappLojaUrl || whatsappLojaUrl === '#') return;
    try {
      window.open(whatsappLojaUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = whatsappLojaUrl;
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full h-[92vh] max-h-[650px] flex flex-col shadow-2xl overflow-hidden text-white relative">
        <ErrorBoundary fallbackTitle="Erro ao carregar o chat do pedido">
          {/* Header do Chat */}
          <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-white">
                    Chat do Pedido #{order.orderNumber}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                    {(order.status || '').replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <span>Conversando com: </span>
                  <strong className="text-white">
                    {actingAs === 'CLIENTE'
                      ? `${settings?.storeName || 'Depósito'} & Entregador`
                      : `Cliente ${order.customer?.name || 'Cliente'}`}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão de WhatsApp Direto */}
              {cleanPhone && (
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  title="Abrir no WhatsApp"
                  className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors flex items-center gap-1 text-xs font-bold"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Informações da Entrega no Topo do Chat */}
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 text-[11px] flex items-center justify-between text-slate-300 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                {order.motoboyName ? (
                  <>
                    Entregador: <strong className="text-white">{order.motoboyName}</strong>
                  </>
                ) : (
                  'Aguardando despacho de entregador'
                )}
              </span>
            </div>

            {order.vasilhamesVaziosAReceber > 0 && (
              <span className="text-[10px] text-amber-400 font-bold shrink-0">
                🔄 {order.vasilhamesVaziosAReceber} cascos na troca
              </span>
            )}
          </div>

          {/* Mensagens (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-950/30 no-scrollbar">
            {messages.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <MessageCircle className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-xs font-semibold text-slate-300">
                  Nenhuma mensagem neste pedido ainda.
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Envie uma mensagem abaixo para falar com o depósito ou avisar o entregador.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMine =
                  (actingAs === 'CLIENTE' && msg.sender === 'CLIENTE') ||
                  (actingAs === 'LOJA' && msg.sender === 'LOJA') ||
                  (actingAs === 'MOTOBOY' && msg.sender === 'MOTOBOY');

                const isFromMotoboy = msg.sender === 'MOTOBOY';
                const isFromStore = msg.sender === 'LOJA';

                return (
                  <div
                    key={msg.id || `chat-msg-${index}`}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                      {isFromMotoboy ? (
                        <span className="text-cyan-400 font-bold flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {msg.senderName || 'Motoboy'} (Motoboy)
                        </span>
                      ) : isFromStore ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Store className="w-3 h-3" /> {msg.senderName || 'Loja'} (Loja)
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <User className="w-3 h-3" /> {msg.senderName || 'Cliente'} (Cliente)
                        </span>
                      )}
                      <span>•</span>
                      <span>{formatSafeTime(msg.timestamp)}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md leading-relaxed ${
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

          {/* Mensagens Rápidas (Quick Prompts) para o Cliente */}
          {actingAs === 'CLIENTE' && (
            <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {QUICK_CUSTOMER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white border border-slate-700 shrink-0 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                actingAs === 'CLIENTE'
                  ? 'Digite uma mensagem para a loja ou motoboy...'
                  : actingAs === 'MOTOBOY'
                  ? 'Enviar mensagem ou aviso ao cliente...'
                  : 'Responder ao cliente pelo Depósito...'
              }
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
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </ErrorBoundary>
      </div>
    </div>
  );
};
