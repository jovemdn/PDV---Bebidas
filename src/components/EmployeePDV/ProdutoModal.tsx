import React, { useState, useEffect, useRef } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Product, ProductCategory } from '../../types';
import {
  X,
  Save,
  Package,
  Snowflake,
  RefreshCw,
  DollarSign,
  AlertCircle,
  Upload,
  Trash2,
  Camera,
} from 'lucide-react';

interface ProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

function compressImageFileToDataUrl(file: File, maxSize = 420, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Imagem vazia.'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        try {
          const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
          const targetW = Math.max(1, Math.round(img.width * scale));
          const targetH = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export const ProdutoModal: React.FC<ProdutoModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct, vasilhames } = useBeverage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory>('cervejas');
  const [volume, setVolume] = useState('350ml');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  // Venda Fracionada & Estoque
  const [baseUnit, setBaseUnit] = useState<'LATA' | 'GARRAFA' | 'PET' | 'SACO' | 'UN'>('LATA');
  const [conversionFactor, setConversionFactor] = useState(12);
  const [packName, setPackName] = useState('Fardo c/ 12 latas');
  const [currentBaseStock, setCurrentBaseStock] = useState(120);
  const [minAlertStock, setMinAlertStock] = useState(24);

  // Preços e Custo
  const [costUnit, setCostUnit] = useState(3.20);
  const [priceUnit, setPriceUnit] = useState(5.00);
  const [pricePack, setPricePack] = useState(54.90);

  // Temperatura
  const [supportsCold, setSupportsCold] = useState(true);
  const [coldSurchargeUnit, setColdSurchargeUnit] = useState(1.00);
  const [coldSurchargePack, setColdSurchargePack] = useState(3.00);

  // Cascos / Vasilhame
  const [isReturnable, setIsReturnable] = useState(false);
  const [vasilhameId, setVasilhameId] = useState(vasilhames[0]?.id || '');
  const [vasilhameDepositPrice, setVasilhameDepositPrice] = useState(3.50);

  const [formError, setFormError] = useState<string | null>(null);

  // Preenche dados se estiver editando
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setBrand(productToEdit.brand);
      setCategory(productToEdit.category);
      setVolume(productToEdit.volume);
      setDescription(productToEdit.description);
      setImage(productToEdit.image);
      setBaseUnit(productToEdit.baseUnit);
      setConversionFactor(productToEdit.conversionFactor);
      setPackName(productToEdit.packName);
      setCurrentBaseStock(productToEdit.currentBaseStock);
      setMinAlertStock(productToEdit.minAlertStock);
      setCostUnit(productToEdit.costUnit ?? 0);
      setPriceUnit(productToEdit.priceUnit);
      setPricePack(productToEdit.pricePack);
      setSupportsCold(productToEdit.supportsCold);
      setColdSurchargeUnit(productToEdit.coldSurchargeUnit);
      setColdSurchargePack(productToEdit.coldSurchargePack);
      setIsReturnable(productToEdit.isReturnable);
      setVasilhameId(productToEdit.vasilhameId || vasilhames[0]?.id || '');
      setVasilhameDepositPrice(productToEdit.vasilhameDepositPrice || 3.50);
    } else {
      // Reset para novo produto
      setName('');
      setBrand('');
      setCategory('cervejas');
      setVolume('350ml');
      setDescription('');
      setImage('');
      setBaseUnit('LATA');
      setConversionFactor(12);
      setPackName('Fardo c/ 12 latas');
      setCurrentBaseStock(120);
      setMinAlertStock(24);
      setCostUnit(3.20);
      setPriceUnit(5.00);
      setPricePack(54.90);
      setSupportsCold(true);
      setColdSurchargeUnit(1.00);
      setColdSurchargePack(3.00);
      setIsReturnable(false);
      setVasilhameId(vasilhames[0]?.id || '');
      setVasilhameDepositPrice(3.50);
    }
  }, [productToEdit, isOpen, vasilhames]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }

    const selectedVasilhame = vasilhames.find((v) => v.id === vasilhameId);

    const productPayload: Omit<Product, 'id'> = {
      name,
      brand: brand.trim() || 'Genérica',
      category,
      volume,
      description: description || `${name} com alta qualidade e preço justo.`,
      image: image.trim(),
      baseUnit,
      conversionFactor: Math.max(1, conversionFactor),
      packName: conversionFactor > 1 ? packName : 'Unidade',
      currentBaseStock: Math.max(0, currentBaseStock),
      minAlertStock: Math.max(0, minAlertStock),
      costUnit: Math.max(0, costUnit),
      priceUnit: Math.max(0, priceUnit),
      pricePack: conversionFactor > 1 ? Math.max(0, pricePack) : Math.max(0, priceUnit),
      supportsCold,
      coldSurchargeUnit: supportsCold ? coldSurchargeUnit : 0,
      coldSurchargePack: supportsCold ? coldSurchargePack : 0,
      isReturnable,
      vasilhameId: isReturnable ? vasilhameId : undefined,
      vasilhameName: isReturnable ? selectedVasilhame?.name : undefined,
      vasilhameDepositPrice: isReturnable ? vasilhameDepositPrice : undefined,
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto text-white shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {productToEdit ? 'Editar Produto do Depósito' : 'Cadastrar Novo Produto com Quantidade'}
              </h3>
              <p className="text-xs text-slate-400">
                Defina venda fracionada, estoque base, temperatura e controle de vasilhames.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. DADOS BÁSICOS */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              1. Identificação do Produto
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cerveja Spaten Puro Malte 350ml"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Marca *
                </label>
                <input
                  type="text"
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Spaten / Ambev"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="cervejas">Cervejas</option>
                  <option value="destilados">Destilados</option>
                  <option value="refrigerantes">Refrigerantes & Sucos</option>
                  <option value="gelo_churrasco">Gelo & Churrasco</option>
                  <option value="petiscos">Petiscos & Bomboniere</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Volume / Peso
                </label>
                <input
                  type="text"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  placeholder="Ex: 350ml, 600ml, 5kg"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Unidade Base
                </label>
                <select
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="LATA">LATA</option>
                  <option value="GARRAFA">GARRAFA</option>
                  <option value="PET">PET</option>
                  <option value="SACO">SACO</option>
                  <option value="UN">UNIDADE</option>
                </select>
              </div>
            </div>

            {/* Foto do Produto (Opcional — adicionada pelo Dono) */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                <label className="text-[10px] font-bold uppercase text-slate-400 block">
                  Foto do Produto (Opcional — envie do Celular/PC ou cole um link)
                </label>
                <div className="flex items-center gap-1.5">
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remover Foto</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-black flex items-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? 'Processando foto...' : 'Enviar Foto Real (Celular / PC)'}</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setFormError(null);
                    setIsUploadingImage(true);
                    try {
                      const compressed = await compressImageFileToDataUrl(file);
                      setImage(compressed);
                    } catch {
                      setFormError('Não foi possível carregar essa imagem. Tente outra foto JPG ou PNG.');
                    } finally {
                      setIsUploadingImage(false);
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                {image ? (
                  <img
                    src={image}
                    alt="Pré-visualização"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover bg-slate-950 border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-950 border border-dashed border-slate-700 shrink-0 flex flex-col items-center justify-center text-slate-500">
                    <Camera className="w-4 h-4" />
                    <span className="text-[8px] mt-0.5">Sem foto</span>
                  </div>
                )}
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="Deixe vazio para exibir só o nome, ou envie/cole uma foto..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* 2. VENDA FRACIONADA & ESTOQUE */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              2. Venda Fracionada & Estoque Inicial
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Fator de Conversão *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white font-bold"
                />
                <span className="text-[9px] text-slate-500">Ex: 12 p/ fardo de 12 latas</span>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Nome do Pacote
                </label>
                <input
                  type="text"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  placeholder="Ex: Fardo c/ 12"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                  Qtd Estoque Inicial (Base) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={currentBaseStock}
                  onChange={(e) => setCurrentBaseStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-emerald-500/50 text-emerald-400 font-black text-sm"
                />
                <span className="text-[9px] text-slate-400">
                  Total em {baseUnit}s (~{Math.floor(currentBaseStock / Math.max(1, conversionFactor))} fardos)
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Estoque Mínimo Alerta
                </label>
                <input
                  type="number"
                  min="0"
                  value={minAlertStock}
                  onChange={(e) => setMinAlertStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>

            {/* PREÇOS E CUSTO (ABATE NA VENDA) */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Preço de Custo &amp; Preço de Venda (Abatimento Automático)
                </span>
                <span className="text-[10px] text-slate-400">
                  O custo é abatido automaticamente a cada venda para calcular o lucro real
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-rose-300 block mb-1">
                    Preço de Custo por Unidade (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-rose-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={costUnit}
                      onChange={(e) => setCostUnit(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-rose-500/40 text-white font-bold focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                {conversionFactor > 1 && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Custo Total do Fardo ({conversionFactor} un) — Opcional
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number((costUnit * conversionFactor).toFixed(2))}
                        onChange={(e) => {
                          const packCost = parseFloat(e.target.value) || 0;
                          setCostUnit(Number((packCost / Math.max(1, conversionFactor)).toFixed(4)));
                        }}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase text-amber-300 block mb-1">
                    Preço de Venda — Unidade Avulsa (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-amber-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={priceUnit}
                      onChange={(e) => setPriceUnit(parseFloat(e.target.value) || 0)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {conversionFactor > 1 && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-amber-300 block mb-1">
                      Preço de Venda — Fardo Fechado ({packName}) (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-amber-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={pricePack}
                        onChange={(e) => setPricePack(parseFloat(e.target.value) || 0)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview de Lucro & Margem após abater o custo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                {(() => {
                  const unitProfit = priceUnit - costUnit;
                  const unitMargin = priceUnit > 0 ? Math.round((unitProfit / priceUnit) * 100) : 0;
                  const packCost = costUnit * conversionFactor;
                  const packProfit = pricePack - packCost;
                  const packMargin = pricePack > 0 ? Math.round((packProfit / pricePack) * 100) : 0;

                  return (
                    <>
                      <div
                        className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
                          unitProfit >= 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        <span>Lucro por Unidade:</span>
                        <strong>
                          R$ {unitProfit.toFixed(2)} ({unitMargin}% margem)
                        </strong>
                      </div>
                      {conversionFactor > 1 && (
                        <div
                          className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
                            packProfit >= 0
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          }`}
                        >
                          <span>Lucro por Fardo:</span>
                          <strong>
                            R$ {packProfit.toFixed(2)} ({packMargin}% margem)
                          </strong>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 3. TEMPERATURA & VASILHAMES */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              3. Regras Especiais (Gelada & Casco Retornável)
            </h4>

            {/* Temperatura */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supportsCold}
                  onChange={(e) => setSupportsCold(e.target.checked)}
                  className="rounded accent-cyan-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5 text-cyan-400" /> Disponível na opção "Estupidamente Gelada"
                </span>
              </label>

              {supportsCold && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Acréscimo por Unidade (R$)</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={coldSurchargeUnit}
                      onChange={(e) => setColdSurchargeUnit(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Acréscimo por Fardo (R$)</label>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={coldSurchargePack}
                      onChange={(e) => setColdSurchargePack(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Vasilhame */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReturnable}
                  onChange={(e) => setIsReturnable(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Produto com Vasilhame / Garrafa Retornável
                </span>
              </label>

              {isReturnable && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Tipo de Casco Vinculado</label>
                    <select
                      value={vasilhameId}
                      onChange={(e) => setVasilhameId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white"
                    >
                      {vasilhames.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Preço Caução Casco Novo (R$)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={vasilhameDepositPrice}
                      onChange={(e) => setVasilhameDepositPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{productToEdit ? 'Salvar Alterações' : 'Cadastrar Produto com Estoque'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
