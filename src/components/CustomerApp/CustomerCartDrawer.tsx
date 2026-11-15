import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { PaymentMethod } from '../../types';
import {
  X,
  Trash2,
  Plus,
  Minus,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
  Snowflake,
  RefreshCw,
  AlertCircle,
  Truck,
  CheckCircle,
  Cloud,
  ExternalLink,
} from 'lucide-react';

interface CustomerCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CustomerCartDrawer: React.FC<CustomerCartDrawerProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    cartTotalAmount,
    submitCustomerCheckout,
    settings,
    cloudUser,
    cloudSyncing,
    connectCloudGoogle,
  } = useBeverage();

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [changeForInput, setChangeForInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showWhatsAppFallback, setShowWhatsAppFallback] = useState(false);

  if (!isOpen) return null;

  // Vasilhames para troca acumulados
  const totalVasilhamesTroca = cart.reduce((acc, item) => {
    if (item.product.isReturnable && item.vasilhameOption === 'TROCA') {
      return acc + item.unitsDeductedFromBaseStock;
    }
    return acc;
  }, 0);

  const totalVasilhamesComprados = cart.reduce((acc, item) => {
    if (item.product.isReturnable && item.vasilhameOption === 'COMPRAR_CASCO') {
      return acc + item.unitsDeductedFromBaseStock;
    }
    return acc;
  }, 0);

  const deliveryFee = settings.defaultDeliveryFee;
  const grandTotal = cartTotalAmount + deliveryFee;

  const buildWhatsAppOrderUrl = () => {
    const rawWa = (settings.ownerWhatsApp || settings.phone || '5521979474405').replace(/\D/g, '');
    const waDigits = rawWa.startsWith('55') ? rawWa : `55${rawWa}`;
    const itemsLines = cart
      .map(
        (it) =>
          `• ${it.quantity}x ${it.product.name} (${it.presentation === 'FARDO' ? it.product.packName : 'Unid'} · ${it.temperature === 'GELADA' ? 'Gelada' : 'Natural'}) — R$ ${it.subtotal.toFixed(2)}`
      )
      .join('\n');
    const payLabel =
      paymentMethod === 'CARTAO_ENTREGA'
        ? 'Cartão na Entrega'
        : paymentMethod === 'DINHEIRO'
        ? `Dinheiro${changeForInput ? ` (troco p/ R$ ${changeForInput})` : ''}`
        : 'PIX';
    const msg = [
      `🛒 *NOVO PEDIDO DELIVERY — ${settings.storeName}*`,
      ``,
      `*Cliente:* ${customerName || 'Não informado'}`,
      `*WhatsApp:* ${customerPhone || 'Não informado'}`,
      `*Endereço:* ${address}, ${number} - ${neighborhood}${complement ? ` (${complement})` : ''}`,
      ``,
      `*Itens:*`,
      itemsLines,
      ``,
      `*Taxa de Entrega:* R$ ${deliveryFee.toFixed(2)}`,
      `*Total:* R$ ${grandTotal.toFixed(2)}`,
      `*Pagamento:* ${payLabel}`,
    ].join('\n');
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(msg)}`;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setShowWhatsAppFallback(false);

    if (cart.length === 0) {
      setFormError('Seu carrinho está vazio!');
      return;
    }

    if (!customerName.trim() || !address.trim() || !number.trim() || !neighborhood.trim()) {
      setFormError('Por favor, preencha todos os dados de entrega.');
      return;
    }

    const parsedChangeFor = (() => {
      const cleaned = changeForInput.replace(/\s+/g, '').replace(',', '.');
      if (!cleaned || cleaned === '.') return undefined;
      const n = Number(cleaned);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })();

    if (paymentMethod === 'DINHEIRO' && parsedChangeFor && parsedChangeFor < grandTotal) {
      setFormError(`O valor para troco (R$ ${parsedChangeFor.toFixed(2)}) deve ser maior que o total (R$ ${grandTotal.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!cloudUser?.emailVerified) {
        const authRes = await connectCloudGoogle();
        if (!authRes.success) {
          setShowWhatsAppFallback(true);
          setFormError(
            'Não foi possível conectar sua conta Google neste navegador. Tente novamente ou envie o pedido pelo WhatsApp da loja abaixo.'
          );
          return;
        }
      }

      const res = await submitCustomerCheckout({
        customer: {
          name: customerName,
          phone: customerPhone,
          address,
          number,
          neighborhood,
          complement,
        },
        paymentMethod,
        changeFor: paymentMethod === 'DINHEIRO' ? parsedChangeFor : undefined,
      });

      if (res.success && res.orderId) {
        onOrderSuccess(res.orderId);
        onClose();
      } else {
        setShowWhatsAppFallback(true);
        setFormError(res.error || 'Erro ao processar pedido.');
      }
    } catch {
      setShowWhatsAppFallback(true);
      setFormError('Erro ao enviar na nuvem. Você pode tentar novamente ou enviar direto pelo WhatsApp abaixo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 text-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base">Seu Pedido Delivery</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
              {cart.length} {cart.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                <Truck className="w-8 h-8" />
              </div>
              <p className="font-semibold text-sm">Seu carrinho está vazio</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Escolha suas cervejas geladas, refrigerantes ou gelo no catálogo para montar seu pedido.
              </p>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Itens Selecionados
                </h4>

                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3 relative group"
                  >
                    {item.product.image && (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover bg-slate-900 shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{item.product.name}</h5>

                      {/* Badges de Regras */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                          {item.presentation === 'FARDO' ? item.product.packName : '1x Unidade'}
                        </span>

                        {item.temperature === 'GELADA' ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold flex items-center gap-0.5">
                            <Snowflake className="w-2.5 h-2.5" /> Gelada
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            Natural
                          </span>
                        )}

                        {item.product.isReturnable && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 ${
                              item.vasilhameOption === 'TROCA'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            {item.vasilhameOption === 'TROCA' ? 'Entrega Casco' : 'Comprou Casco'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-amber-400">
                          R$ {item.subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Alerta de Vasilhames Retornáveis (Regra Crítica Brasileira) */}
              {totalVasilhamesTroca > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin-slow" />
                    <span>Atenção: Troca de Cascos na Entrega</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-200/90">
                    Você selecionou a opção de troca. Deixe separadas{' '}
                    <strong className="underline text-white font-black">{totalVasilhamesTroca} garrafa(s) vazia(s)</strong> para entregar ao motoboy no ato do recebimento!
                  </p>
                </div>
              )}

              {totalVasilhamesComprados > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
                  <span>ℹ️ Você está adquirindo {totalVasilhamesComprados} vasilhame(s) novo(s) caucionado(s).</span>
                </div>
              )}

              {/* Formulário de Entrega */}
              <form onSubmit={handleCheckout} className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Endereço de Entrega</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-1">Rua / Avenida</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-amber-500"
                        placeholder="Nome da rua"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Número</label>
                      <input
                        type="text"
                        required
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-amber-500"
                        placeholder="Nº"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Bairro</label>
                      <input
                        type="text"
                        required
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-amber-500"
                        placeholder="Bairro"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Complemento / Ref.</label>
                      <input
                        type="text"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-amber-500"
                        placeholder="Apto, bloco, portão"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Seu Nome</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">WhatsApp</label>
                      <input
                        type="text"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(21) 99999-9999"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('PIX')}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'PIX'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500 font-bold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <QrCode className="w-5 h-5" />
                      <span className="text-[11px]">PIX Instantâneo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARTAO_ENTREGA')}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'CARTAO_ENTREGA'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500 font-bold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-[11px]">Cartão Maquininha</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('DINHEIRO')}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === 'DINHEIRO'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500 font-bold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Banknote className="w-5 h-5" />
                      <span className="text-[11px]">Dinheiro</span>
                    </button>
                  </div>

                  {/* Campo de Troco para Dinheiro */}
                  {paymentMethod === 'DINHEIRO' && (
                    <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700 mt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Precisa de troco para quanto?</span>
                        <span className="text-[10px] text-slate-400">(Opcional)</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={changeForInput}
                          onChange={(e) => setChangeForInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                          placeholder={`${Math.ceil(grandTotal / 10) * 10}`}
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {formError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{formError}</span>
                  </div>
                )}
              </form>
            </>
          )}
        </div>

        {/* Footer with Totals and Confirmation */}
        {cart.length > 0 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-3">
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal Produtos:</span>
                <span className="text-white font-medium">R$ {cartTotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-amber-400" /> Taxa de Entrega Expressa:
                </span>
                <span className="text-white font-medium">R$ {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800 text-sm font-extrabold text-white">
                <span>Total a Pagar:</span>
                <span className="text-base text-amber-400 font-black">R$ {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
                <Cloud
                  className={`w-3.5 h-3.5 shrink-0 ${
                    cloudUser?.emailVerified ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                <span className="truncate">
                  {cloudUser?.emailVerified
                    ? `Conectado: ${cloudUser.email}`
                    : 'Conecta com 1 toque no Google ao confirmar'}
                </span>
              </div>
              {cloudUser?.emailVerified && (
                <button
                  type="button"
                  disabled={cloudSyncing}
                  onClick={() => void connectCloudGoogle()}
                  className="text-amber-400 hover:text-amber-300 font-bold shrink-0 cursor-pointer"
                >
                  Trocar
                </button>
              )}
            </div>

            {showWhatsAppFallback && (
              <a
                href={buildWhatsAppOrderUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Enviar Pedido pelo WhatsApp da Loja</span>
              </a>
            )}

            <button
              type="button"
              disabled={isSubmitting || cloudSyncing}
              onClick={handleCheckout}
              className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                isSubmitting || cloudSyncing
                  ? 'bg-slate-800 text-slate-500 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-[0.98]'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              <span>
                {isSubmitting || cloudSyncing
                  ? 'Validando & Enviando na Nuvem...'
                  : 'Confirmar Pedido Express'}
              </span>
            </button>
            <p className="text-[10px] text-center text-slate-500">
              ⚡ Sincronizado instantaneamente na nuvem com o PDV do depósito
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
