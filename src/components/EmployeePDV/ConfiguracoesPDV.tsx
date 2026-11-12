import React, { useState } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { DepotSettings } from '../../types';
import {
  Settings,
  Store,
  Truck,
  DollarSign,
  Printer,
  ShieldAlert,
  Save,
  RotateCcw,
  Volume2,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ConfiguracoesPDV: React.FC = () => {
  const { settings, updateSettings, soundEnabled, toggleSound, resetAllData } = useBeverage();

  const [formData, setFormData] = useState<DepotSettings>({ ...settings });
  const [showCancelPass, setShowCancelPass] = useState(false);

  const handleChange = (field: keyof DepotSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-5 rounded-3xl border border-slate-800">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Painel Administrativo
          </span>
          <h2 className="text-lg font-black text-white mt-0.5">
            Configurações Globais do PDV & Delivery
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize os dados cadastrais da loja, taxas de entrega, comissão de motoboys e regras de venda.
          </p>
        </div>

        <button
          onClick={resetAllData}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold border border-slate-700 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar Padrões</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. DADOS DA EMPRESA / DEPÓSITO */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Store className="w-4 h-4" /> 1. Informações do Estabelecimento & Cupom Fiscal
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Nome Comercial do Depósito
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                CNPJ (Exibido no Cupom)
              </label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                WhatsApp / Telefone de Contato
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Endereço Completo
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-emerald-400 block mb-1">
                WhatsApp do Dono (Receber Fechamento de Caixa)
              </label>
              <input
                type="text"
                value={formData.ownerWhatsApp || '5521960185101'}
                onChange={(e) => handleChange('ownerWhatsApp', e.target.value)}
                placeholder="Ex: 5521960185101"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-cyan-400 block mb-1">
                E-mail do Dono (Enviar Relatórios PDF)
              </label>
              <input
                type="email"
                value={formData.ownerEmail || 'tvhisoka@gmail.com'}
                onChange={(e) => handleChange('ownerEmail', e.target.value)}
                placeholder="dono@deposito.com.br"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* 2. REGRAS DE DELIVERY & LOGÍSTICA */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Truck className="w-4 h-4" /> 2. Taxas & Prazos do Delivery Express
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Taxa Padrão de Entrega (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={formData.defaultDeliveryFee}
                  onChange={(e) => handleChange('defaultDeliveryFee', parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Comissão do Motoboy por Corrida (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  required
                  value={formData.motoboyCommission}
                  onChange={(e) => handleChange('motoboyCommission', parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Tempo Estimado de Entrega (Minutos)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  value={formData.minDeliveryMinutes}
                  onChange={(e) => handleChange('minDeliveryMinutes', parseInt(e.target.value) || 15)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white text-center font-bold"
                />
                <span className="text-slate-500 text-xs font-bold">a</span>
                <input
                  type="number"
                  min="10"
                  value={formData.maxDeliveryMinutes}
                  onChange={(e) => handleChange('maxDeliveryMinutes', parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white text-center font-bold"
                />
                <span className="text-slate-400 text-xs">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. REGRAS DE OPERAÇÃO DO PDV */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> 3. Políticas de Estoque & Automação
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-bold text-white block">
                  Permitir Venda com Estoque Negativo
                </span>
                <span className="text-[11px] text-slate-400">
                  Se ativado, permite lançar vendas no balcão mesmo se o sistema marcar saldo zero (para posterior acerto de estoque).
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.allowNegativeStock}
                onChange={(e) => handleChange('allowNegativeStock', e.target.checked)}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-bold text-white block">
                  Alerta Sonoro de Pedidos (Web Audio)
                </span>
                <span className="text-[11px] text-slate-400">
                  Toca carrilhão polyphonic de novo pedido imediatamente ao chegar ordem no delivery.
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={toggleSound}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-bold text-white block">
                  Exibir Modal de Impressão de Cupom
                </span>
                <span className="text-[11px] text-slate-400">
                  Abre automaticamente a prévia do ticket do cliente após finalizar a venda no balcão.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.autoPrintReceipt}
                onChange={(e) => handleChange('autoPrintReceipt', e.target.checked)}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </label>

            <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Senha de Autorização para Cancelar Vendas
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Solicitada sempre que o Dono ou Balcão precisar cancelar e estornar um cupom/pedido. (Padrão: 123)
                  </span>
                </div>

                <div className="relative sm:w-52">
                  <input
                    type={showCancelPass ? 'text' : 'password'}
                    required
                    value={formData.cancelPassword || ''}
                    onChange={(e) => handleChange('cancelPassword', e.target.value)}
                    placeholder="Senha (ex: 123)"
                    className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCancelPass(!showCancelPass)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    {showCancelPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>Salvar Todas as Configurações do Sistema</span>
          </button>
        </div>
      </form>
    </div>
  );
};
