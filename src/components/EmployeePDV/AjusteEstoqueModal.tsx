import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Product } from '../../types';
import {
  X,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
} from 'lucide-react';

interface AjusteEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProduct?: Product | null;
}

export const AjusteEstoqueModal: React.FC<AjusteEstoqueModalProps> = ({
  isOpen,
  onClose,
  targetProduct,
}) => {
  const { products, adjustStock, stockMovements } = useBeverage();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    targetProduct?.id || products[0]?.id || ''
  );

  const [adjustmentType, setAdjustmentType] = useState<'ENTRADA' | 'AJUSTE' | 'PERDA'>('ENTRADA');
  const [quantity, setQuantity] = useState<number>(12);
  const [reason, setReason] = useState('Entrada de Mercadoria / Reposição');

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct || quantity <= 0) return;

    if (adjustmentType === 'ENTRADA') {
      adjustStock(currentProduct.id, quantity, 'DELTA', reason, 'ENTRADA');
    } else if (adjustmentType === 'PERDA') {
      adjustStock(currentProduct.id, -quantity, 'DELTA', reason, 'PERDA');
    } else {
      // AJUSTE ABSOLUTO (Inventário cego)
      adjustStock(currentProduct.id, quantity, 'ABSOLUTE', reason, 'AJUSTE');
    }

    onClose();
  };

  const productMovements = stockMovements.filter((m) => m.productId === currentProduct?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto text-white shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Ajuste de Estoque & Inventário</h3>
              <p className="text-xs text-slate-400">
                Altere a quantidade física, dê entrada de notas ou registre avarias.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleAdjustSubmit} className="p-6 space-y-5 flex-1">
          {/* Seletor do Produto */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
              Selecione o Produto para Ajustar
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Atual: {p.currentBaseStock} {p.baseUnit}s)
                </option>
              ))}
            </select>
          </div>

          {currentProduct && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">
                  Estoque Atual Registrado:
                </span>
                <span className="text-xl font-black text-amber-400">
                  {currentProduct.currentBaseStock} {currentProduct.baseUnit}s
                </span>
                {currentProduct.conversionFactor > 1 && (
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Equivalente a{' '}
                    <strong className="text-white">
                      {Math.floor(currentProduct.currentBaseStock / currentProduct.conversionFactor)} fardos
                    </strong>{' '}
                    de {currentProduct.conversionFactor} unidades
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Preço de Venda:</span>
                <span className="text-xs font-bold text-white">
                  R$ {currentProduct.priceUnit.toFixed(2)} un / R$ {currentProduct.pricePack.toFixed(2)} fardo
                </span>
              </div>
            </div>
          )}

          {/* Tipo de Ajuste */}
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1.5">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('ENTRADA');
                  setReason('Entrada de Mercadoria / Reposição');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  adjustmentType === 'ENTRADA'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Plus className="w-4 h-4" /> Entrada (+)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('PERDA');
                  setReason('Quebra / Avaria de Vasilhame');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  adjustmentType === 'PERDA'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-400 ring-1 ring-rose-500'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Minus className="w-4 h-4" /> Quebra / Baixa (-)
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdjustmentType('AJUSTE');
                  setReason('Balanço / Inventário Físico');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  adjustmentType === 'AJUSTE'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 ring-1 ring-amber-500'
                    : 'border-slate-800 bg-slate-950 text-slate-400'
                }`}
              >
                <Layers className="w-4 h-4" /> Definir Exato (=)
              </button>
            </div>
          </div>

          {/* Quantidade a Movimentar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                {adjustmentType === 'AJUSTE'
                  ? 'Nova Quantidade Absoluta em Estoque'
                  : 'Quantidade de Unidades a ' + (adjustmentType === 'ENTRADA' ? 'Somar' : 'Subtrair')}
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-black text-sm"
              />
              {currentProduct?.conversionFactor > 1 && (
                <div className="flex gap-1.5 mt-2">
                  {[currentProduct.conversionFactor, currentProduct.conversionFactor * 5, currentProduct.conversionFactor * 10].map(
                    (q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-400 font-bold"
                      >
                        +{q} un ({q / currentProduct.conversionFactor} fardos)
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Motivo / Justificativa do Ajuste
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Nota Fiscal 1234, Quebra na descarga..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          {/* Histórico Recente do Item */}
          {productMovements.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> Últimas Movimentações deste Produto:
              </span>
              <div className="max-h-28 overflow-y-auto space-y-1.5 text-[11px]">
                {productMovements.slice(0, 3).map((mov) => (
                  <div
                    key={mov.id}
                    className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white">{mov.reason}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {new Date(mov.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span
                      className={`font-black ${
                        mov.type === 'ENTRADA'
                          ? 'text-emerald-400'
                          : mov.type === 'PERDA'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {mov.type === 'ENTRADA' ? '+' : mov.type === 'PERDA' ? '-' : ''}
                      {mov.unitsQuantity} un
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Ajuste no Estoque</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
