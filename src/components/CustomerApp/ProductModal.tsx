import React, { useState } from 'react';
import { Product, PresentationOption, TemperatureOption, VasilhameOption } from '../../types';
import { useBeverage } from '../../context/BeverageContext';
import { X, Sparkles, Snowflake, Thermometer, RefreshCw, AlertCircle, ShoppingBag } from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addToCart } = useBeverage();

  const [presentation, setPresentation] = useState<PresentationOption>(
    product?.conversionFactor && product.conversionFactor > 1 ? 'FARDO' : 'UNIDADE'
  );
  const [temperature, setTemperature] = useState<TemperatureOption>(
    product?.supportsCold ? 'GELADA' : 'NATURAL'
  );
  const [vasilhameOption, setVasilhameOption] = useState<VasilhameOption>(
    product?.isReturnable ? 'TROCA' : 'NAO_APLICA'
  );
  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (product) {
      setPresentation(product.conversionFactor > 1 ? 'FARDO' : 'UNIDADE');
      setTemperature(product.supportsCold ? 'GELADA' : 'NATURAL');
      setVasilhameOption(product.isReturnable ? 'TROCA' : 'NAO_APLICA');
      setQuantity(1);
      setErrorMessage(null);
    }
  }, [product?.id]);

  if (!product) return null;

  // Unidades consumidas do estoque base
  const unitsPerItem = presentation === 'FARDO' ? product.conversionFactor : 1;
  const totalUnitsRequired = quantity * unitsPerItem;
  const isOutOfStock = product.currentBaseStock < totalUnitsRequired;

  // Cálculos de preço dinâmico
  const basePrice = presentation === 'FARDO' ? product.pricePack : product.priceUnit;
  const coldSurcharge =
    temperature === 'GELADA'
      ? presentation === 'FARDO'
        ? product.coldSurchargePack
        : product.coldSurchargeUnit
      : 0;

  let vasilhameFeePerItem = 0;
  if (product.isReturnable && vasilhameOption === 'COMPRAR_CASCO') {
    vasilhameFeePerItem = (product.vasilhameDepositPrice || 3.5) * unitsPerItem;
  }

  const unitCalculatedPrice = basePrice + coldSurcharge + vasilhameFeePerItem;
  const totalCalculated = unitCalculatedPrice * quantity;

  // Economia no fardo vs unidades avulsas
  const savingsPack =
    presentation === 'FARDO'
      ? product.priceUnit * product.conversionFactor - product.pricePack
      : 0;

  const handleAddToCart = () => {
    setErrorMessage(null);
    const result = addToCart(product, presentation, temperature, vasilhameOption, quantity);
    if (!result.success) {
      setErrorMessage(result.message || 'Erro ao adicionar item.');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto text-white shadow-2xl relative flex flex-col">
        {/* Header Image (se houver) & Close */}
        {product.image ? (
          <div className="relative h-48 bg-slate-950 overflow-hidden shrink-0">
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                {product.brand} • {product.volume}
              </span>
              <h3 className="text-xl font-extrabold text-white mt-1 leading-tight">{product.name}</h3>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                {product.brand} • {product.volume}
              </span>
              <h3 className="text-xl font-extrabold text-white mt-2 leading-tight">{product.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 space-y-5 flex-1">
          {/* Estoque Unificado Indicator */}
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <span className="text-slate-400">Estoque Unificado (Base):</span>
            <span className="font-semibold text-emerald-400">
              {product.currentBaseStock} {product.baseUnit}s{' '}
              {product.conversionFactor > 1 && (
                <span className="text-slate-400 font-normal">
                  (~{Math.floor(product.currentBaseStock / product.conversionFactor)} fardos)
                </span>
              )}
            </span>
          </div>

          {/* 1. Escolha da Apresentação (Fracionada vs Fardo) */}
          {product.conversionFactor > 1 && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                1. Apresentação (Venda Fracionada)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPresentation('UNIDADE')}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    presentation === 'UNIDADE'
                      ? 'border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm">1 Unidade Avulsa</div>
                  <div className="text-xs text-slate-400 mt-0.5">{product.volume} individual</div>
                  <div className="text-amber-400 font-extrabold text-base mt-2">
                    R$ {product.priceUnit.toFixed(2)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPresentation('FARDO')}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    presentation === 'FARDO'
                      ? 'border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {savingsPack > 0 && (
                    <span className="absolute -top-2.5 right-2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Economize R$ {savingsPack.toFixed(2)}
                    </span>
                  )}
                  <div className="font-bold text-sm">{product.packName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {product.conversionFactor} unidades juntas
                  </div>
                  <div className="text-amber-400 font-extrabold text-base mt-2">
                    R$ {product.pricePack.toFixed(2)}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 2. Controle de Temperatura */}
          {product.supportsCold && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                2. Temperatura
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTemperature('GELADA')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    temperature === 'GELADA'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white ring-1 ring-cyan-500'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                      <Snowflake className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Estupidamente Gelada</div>
                      <div className="text-[11px] text-cyan-400">
                        Pronta para consumo imediato
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-cyan-300">
                    +{presentation === 'FARDO' ? `R$ ${product.coldSurchargePack.toFixed(2)}` : `R$ ${product.coldSurchargeUnit.toFixed(2)}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTemperature('NATURAL')}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    temperature === 'NATURAL'
                      ? 'border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500'
                      : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Temperatura Natural</div>
                      <div className="text-[11px] text-slate-400">Sem taxa adicional</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">R$ 0,00</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Regra de Vasilhame/Casco Retornável */}
          {product.isReturnable && (
            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  3. Vasilhame / Casco Retornável
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Este item é envasado em garrafa retornável ({product.vasilhameName}). Como deseja prosseguir?
              </p>

              <div className="space-y-2 pt-1">
                <label
                  onClick={() => setVasilhameOption('TROCA')}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    vasilhameOption === 'TROCA'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="vasilhame-opt"
                    checked={vasilhameOption === 'TROCA'}
                    onChange={() => setVasilhameOption('TROCA')}
                    className="mt-1 accent-emerald-500"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Vou entregar o casco vazio na troca</span>
                      <span className="text-emerald-400 font-extrabold">Sem acréscimo (R$ 0,00)</span>
                    </div>
                    <p className="text-slate-400 mt-0.5 text-[11px]">
                      Você deve entregar {totalUnitsRequired} garrafa(s) vazia(s) do mesmo tipo ao motoboy na entrega.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setVasilhameOption('COMPRAR_CASCO')}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    vasilhameOption === 'COMPRAR_CASCO'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                      : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="vasilhame-opt"
                    checked={vasilhameOption === 'COMPRAR_CASCO'}
                    onChange={() => setVasilhameOption('COMPRAR_CASCO')}
                    className="mt-1 accent-amber-500"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>Não tenho o casco (Comprar Líquido + Recipiente)</span>
                      <span className="text-amber-400 font-extrabold">
                        +R$ {((product.vasilhameDepositPrice || 3.5) * unitsPerItem).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5 text-[11px]">
                      Taxa de caução do casco: R$ {(product.vasilhameDepositPrice || 3.5).toFixed(2)} por garrafa. O casco passa a ser seu.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Erro de estoque */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer with Quantity & Add Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center gap-4">
          <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition-colors"
            >
              -
            </button>
            <span className="w-10 text-center font-bold text-sm text-white">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-between shadow-lg transition-all ${
              isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-[0.98]'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{isOutOfStock ? 'Estoque Insuficiente' : 'Adicionar ao Pedido'}</span>
            </div>
            <span className="text-base font-black">
              R$ {totalCalculated.toFixed(2)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
