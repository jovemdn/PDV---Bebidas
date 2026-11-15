import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { Product } from '../../types';
import { ProdutoModal } from './ProdutoModal';
import { AjusteEstoqueModal } from './AjusteEstoqueModal';
import {
  Package,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Truck,
  ArrowDownUp,
  Snowflake,
  Layers,
  Search,
  Sparkles,
  SlidersHorizontal,
  Camera,
} from 'lucide-react';

export const EstoqueVasilhames: React.FC = () => {
  const {
    products,
    vasilhames,
    restockProductStock,
    receiveEmptyVasilhames,
    deleteProduct,
  } = useBeverage();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Modais de Produto e Estoque
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [targetProductForAjuste, setTargetProductForAjuste] = useState<Product | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtragem
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const isLow = p.currentBaseStock <= p.minAlertStock;
    return matchesSearch && (!filterLowStockOnly || isLow);
  });

  const totalBaseUnitsInDepot = products.reduce((acc, p) => acc + p.currentBaseStock, 0);
  const lowStockCount = products.filter((p) => p.currentBaseStock <= p.minAlertStock).length;
  const totalStockValue = products.reduce((acc, p) => acc + p.currentBaseStock * p.priceUnit, 0);
  const totalStockCostValue = products.reduce(
    (acc, p) => acc + p.currentBaseStock * (p.costUnit || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE AÇÕES & CARDS DE RESUMO DO ESTOQUE */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Total Itens Cadastrados
            </span>
            <span className="text-xl font-black text-white mt-0.5 block">
              {products.length} produtos
            </span>
            <span className="text-[10px] text-slate-500">Com grade fracionada</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Unidades Físicas (Base)
            </span>
            <span className="text-xl font-black text-amber-400 mt-0.5 block">
              {totalBaseUnitsInDepot} un
            </span>
            <span className="text-[10px] text-slate-500">Latas, garrafas e sacos</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Estoque Baixo / Crítico
            </span>
            <span className={`text-xl font-black mt-0.5 block ${lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {lowStockCount} itens
            </span>
            <span className="text-[10px] text-slate-500">Abaixo do mínimo</span>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${lowStockCount > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Valor Estimado em Estoque
            </span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              R$ {totalStockValue.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              Custo investido: <strong className="text-rose-300">R$ {totalStockCostValue.toFixed(2)}</strong>
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CARD PRINCIPAL: GESTÃO & EDIÇÃO DE ESTOQUE E PRODUTOS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Controle Geral do Estoque
            </span>
            <h3 className="text-base font-extrabold text-white mt-0.5">
              Grade de Produtos, Edição Cadastral & Inventário Físico
            </h3>
            <p className="text-xs text-slate-400">
              Cadastre novos itens com quantidade, edite preços e acerte o estoque base a qualquer momento.
            </p>
          </div>

          {/* Botões de Ação para Cadastrar e Ajustar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setTargetProductForAjuste(null);
                setIsAjusteModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Ajustar Estoque / Balanço</span>
            </button>

            <button
              onClick={() => {
                setProductToEdit(null);
                setIsProductModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Produto com Quantidade</span>
            </button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por nome ou marca..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              filterLowStockOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Apenas Estoque Baixo ({lowStockCount})</span>
          </button>
        </div>

        {/* TABELA DE PRODUTOS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Produto & Marca</th>
                <th className="py-3 px-3">Unidade Base</th>
                <th className="py-3 px-3">Fator Conversão</th>
                <th className="py-3 px-3">Estoque Unificado (Base)</th>
                <th className="py-3 px-3">Equivalente Fardos</th>
                <th className="py-3 px-3">Custo / Venda / Lucro</th>
                <th className="py-3 px-3">Regras Especiais</th>
                <th className="py-3 px-3 text-right">Ações & Edição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.currentBaseStock <= 0;
                const isLowStock = p.currentBaseStock > 0 && p.currentBaseStock <= p.minAlertStock;
                const fardosCount = Math.floor(p.currentBaseStock / Math.max(1, p.conversionFactor));
                const remainderUnits = p.currentBaseStock % Math.max(1, p.conversionFactor);

                return (
                  <tr key={p.id} className="hover:bg-slate-850 transition-colors group">
                    {/* Produto */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        {p.image && (
                          <img
                            src={p.image}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover bg-slate-950 shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-bold text-white group-hover:text-amber-400 transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {p.brand} • {p.volume} • {p.category}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Unidade */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {p.baseUnit}
                      </span>
                    </td>

                    {/* Fator */}
                    <td className="py-3 px-3">
                      {p.conversionFactor > 1 ? (
                        <span className="text-amber-400 font-bold">
                          1 = {p.conversionFactor} {p.baseUnit}s
                        </span>
                      ) : (
                        <span className="text-slate-500">1:1</span>
                      )}
                    </td>

                    {/* Estoque Base */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOutOfStock
                              ? 'bg-red-400 animate-ping'
                              : isLowStock
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                        />
                        <span
                          className={`font-black text-sm ${
                            isOutOfStock
                              ? 'text-red-400 font-extrabold'
                              : isLowStock
                              ? 'text-amber-400'
                              : 'text-white'
                          }`}
                        >
                          {p.currentBaseStock} un
                        </span>
                      </div>
                    </td>

                    {/* Fardos */}
                    <td className="py-3 px-3">
                      {p.conversionFactor > 1 ? (
                        <span className="text-slate-300 font-semibold">
                          {fardosCount} fardos{' '}
                          {remainderUnits > 0 && (
                            <span className="text-amber-400 text-[10px]">
                              (+{remainderUnits} un)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Preços & Custo */}
                    <td className="py-3 px-3">
                      <div className="text-slate-300 space-y-0.5">
                        <div className="text-[11px] text-rose-300 font-semibold">
                          Custo: R$ {(p.costUnit || 0).toFixed(2)}
                        </div>
                        <div>
                          Venda Un: <strong className="text-white">R$ {p.priceUnit.toFixed(2)}</strong>
                        </div>
                        {p.conversionFactor > 1 && (
                          <div className="text-amber-400 font-bold">
                            Fardo: R$ {p.pricePack.toFixed(2)}
                          </div>
                        )}
                        <div className="text-[10px] text-emerald-400 font-bold">
                          Lucro/un: R$ {(p.priceUnit - (p.costUnit || 0)).toFixed(2)}
                        </div>
                      </div>
                    </td>

                    {/* Regras */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1 text-[10px]">
                        {p.supportsCold && (
                          <span className="text-cyan-300 font-semibold flex items-center gap-1">
                            <Snowflake className="w-3 h-3" /> Gelada (+R$ {p.coldSurchargeUnit.toFixed(2)})
                          </span>
                        )}
                        {p.isReturnable && (
                          <span className="text-emerald-300 font-semibold flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" /> Casco Retornável
                          </span>
                        )}
                        {!p.supportsCold && !p.isReturnable && (
                          <span className="text-slate-500">Padrão</span>
                        )}
                      </div>
                    </td>

                    {/* Ações: Editar, Ajustar Estoque e Excluir */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão de Ajustar Estoque Rápido */}
                        <button
                          onClick={() => {
                            setTargetProductForAjuste(p);
                            setIsAjusteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-colors"
                          title="Ajustar Quantidade / Inventário"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão rápido de Foto / Editar Produto */}
                        <button
                          onClick={() => {
                            setProductToEdit(p);
                            setIsProductModalOpen(true);
                          }}
                          className={`px-2 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1 text-[10px] font-bold ${
                            p.image
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                              : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                          }`}
                          title={p.image ? 'Editar Produto / Foto' : 'Adicionar Foto / Editar'}
                        >
                          {p.image ? (
                            <Edit2 className="w-3.5 h-3.5" />
                          ) : (
                            <>
                              <Camera className="w-3.5 h-3.5" />
                              <span>Foto</span>
                            </>
                          )}
                        </button>

                        {/* Botão de Excluir */}
                        {deleteConfirmId === p.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                deleteProduct(p.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-1 rounded bg-slate-800 text-slate-400 text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
                            title="Excluir Produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* GESTÃO DE VASILHAMES & CASCOS RETORNÁVEIS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Economia Circular & Pátio
            </span>
            <h3 className="text-base font-extrabold text-white mt-0.5">
              Gestão de Vasilhames & Cascos Retornáveis
            </h3>
            <p className="text-xs text-slate-400">
              Controle de garrafas cheias, cascos vazios no pátio e em circulação com clientes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vasilhames.map((v) => (
            <div
              key={v.id}
              className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-white">{v.name}</h4>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    {v.bottleType}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <RefreshCw className="w-4 h-4" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Garrafas Cheias:</span>
                  <strong className="text-sm font-black text-emerald-400">
                    {v.fullInStorage} un
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Cascos no Pátio:</span>
                  <strong className="text-sm font-black text-amber-400">
                    {v.emptyInYard} un
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Na Rua (Clientes):</span>
                  <strong className="text-sm font-black text-cyan-400">
                    {v.totalInCirculationWithCustomers} un
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Caução do Casco:</span>
                  <strong className="text-sm font-black text-white">
                    R$ {v.depositPrice.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button
                  onClick={() => receiveEmptyVasilhames(v.id, 12)}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                >
                  +12 Vazias
                </button>
                <button
                  onClick={() => receiveEmptyVasilhames(v.id, 24)}
                  className="flex-1 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 transition-colors"
                >
                  +24 Vazias
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modais */}
      <ProdutoModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <AjusteEstoqueModal
        isOpen={isAjusteModalOpen}
        onClose={() => setIsAjusteModalOpen(false)}
        targetProduct={targetProductForAjuste}
      />
    </div>
  );
};
