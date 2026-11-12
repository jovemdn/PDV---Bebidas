import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { useBeverage } from '../../context/BeverageContext';
import {
  X,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';

interface CancelOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_REASONS = [
  'Erro de lançamento no balcão',
  'Cliente desistiu da compra',
  'Troca de produto / forma de pagamento',
  'Pedido duplicado',
];

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const { cancelOrder, currentUser } = useBeverage();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reason, setReason] = useState(QUICK_REASONS[0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setReason(QUICK_REASONS[0]);
      setErrorMsg(null);
    }
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const canCancel = !currentUser || currentUser.role === 'DONO' || currentUser.role === 'BALCAO';

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!canCancel) {
      setErrorMsg('Somente o Dono ou operador do Balcão tem permissão para cancelar.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Informe a senha de autorização para confirmar o cancelamento.');
      return;
    }

    const res = cancelOrder(order.id, password, reason);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.message || 'Não foi possível cancelar a venda.');
    }
  };

  const totalUnits = order.items.reduce((sum, it) => sum + it.unitsCount, 0);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-md w-full text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-rose-950/50 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Cancelar Venda #{order.orderNumber}
              </h3>
              <p className="text-[11px] text-rose-300">
                {order.channel === 'BALCAO_PDV' ? 'Cupom de Balcão (PDV)' : 'Pedido Delivery App'} &bull; R${' '}
                {order.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirmCancel} className="p-5 space-y-4">
          {/* Warning */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">Estorno Automático ao Confirmar:</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                <strong>{totalUnits} unidade(s)</strong> retornarão ao estoque e o valor de{' '}
                <strong>R$ {order.totalAmount.toFixed(2)}</strong> será estornado do turno.
              </p>
            </div>
          </div>

          {/* Order Items Preview */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 max-h-32 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Itens da Venda ({order.customer.name}):
            </span>
            {order.items.map((it) => (
              <div key={it.id} className="flex justify-between text-[11px] text-slate-300">
                <span className="truncate pr-2">
                  {it.quantity}x {it.productName} ({it.unitsCount} un)
                </span>
                <span className="font-bold text-slate-400 shrink-0">R$ {it.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Motivo do Cancelamento */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block">
              Motivo do Cancelamento
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    reason === qr
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-500"
              required
            />
          </div>

          {/* Senha de Confirmação */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Senha de Autorização para Cancelamento *</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha (padrão: 123)"
                autoFocus
                className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-xs text-white font-bold focus:outline-none focus:border-rose-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Apenas Dono e Balcão possuem acesso. A senha pode ser alterada em Configurações do PDV.
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Confirmar Cancelamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
