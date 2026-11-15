import React, { useState } from 'react';
import { buildFullShareUrl, buildRoutePath, navigateToRoute } from '../../services/routeService';
import { GENERATED_IMAGES } from '../../assets/generatedImages';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react';

export const SystemHubPage: React.FC = () => {
  const [copiedType, setCopiedType] = useState<'store' | 'staff' | null>(null);

  const storeRoute = buildRoutePath({ page: 'CUSTOMER_STORE' });
  const staffRoute = buildRoutePath({ page: 'EMPLOYEE_PORTAL' });

  const storeShareUrl = buildFullShareUrl({ page: 'CUSTOMER_STORE' });
  const staffShareUrl = buildFullShareUrl({ page: 'EMPLOYEE_PORTAL' });

  const handleCopyLink = (type: 'store' | 'staff', url: string) => {
    try {
      navigator.clipboard?.writeText(url);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141413] flex flex-col">
      {/* Header Clean */}
      <header className="border-b border-[#E7E4DC] bg-[#F7F6F2]/95 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#141413] text-[#F7F6F2] flex items-center justify-center font-display font-extrabold text-sm">
              DS
            </div>
            <span className="font-display font-extrabold text-lg tracking-tight text-[#141413]">
              DepósitoSys
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <span className="hidden sm:inline">Sistema PDV + Loja Delivery Integrados</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B45309]">
              Acesso Separado por Link
            </p>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-[#141413] tracking-tight leading-[1.08]">
              Área da Empresa e Loja do Cliente em links separados.
            </h1>
            <p className="text-sm sm:text-base text-stone-600 leading-relaxed max-w-xl">
              Envie o link da loja simples para seus clientes comprarem bebidas geladas ou fardos,
              e mantenha o link exclusivo da equipe para login, frente de caixa, fluxo de caixa e
              entregas.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-3xl overflow-hidden border border-[#E7E4DC] shadow-sm aspect-[4/3]">
              <img
                src={GENERATED_IMAGES.heroDeposito}
                alt="Depósito de Bebidas"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* 2 Cards Exclusivos */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Link Exclusivo da Empresa */}
          <div className="rounded-2xl bg-[#141413] text-white p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-xl bg-stone-800 text-amber-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono-tabular font-bold text-amber-400 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  /e · /equipe
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-display font-extrabold text-white">
                  Login &amp; PDV da Empresa
                </h2>
                <p className="text-xs sm:text-sm text-stone-300 mt-1.5 leading-relaxed">
                  Tela de login exclusiva para Dono, Balcão e Motoboy. Inclui frente de caixa,
                  delivery ao vivo, fluxo de caixa (retiradas e despesas), estoque e fechamento.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono-tabular text-stone-300 break-all">
                {staffShareUrl}
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => navigateToRoute({ page: 'EMPLOYEE_PORTAL' })}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#141413] text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Abrir Login da Empresa</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink('staff', staffShareUrl)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'staff' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Link Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link da Empresa</span>
                    </>
                  )}
                </button>
                <a
                  href={staffRoute}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <span>Nova Aba</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Card 2: Link Exclusivo do Cliente */}
          <div className="rounded-2xl bg-white border border-[#E7E4DC] p-6 sm:p-7 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-[#B45309] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono-tabular font-bold text-[#B45309]">
                  /l · /loja
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-display font-extrabold text-[#141413]">
                  Loja Simples do Cliente
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1.5 leading-relaxed">
                  Link direto para enviar no WhatsApp e Instagram dos clientes. Sem tela de login,
                  rápido para escolher bebidas, fechar o pedido e acompanhar a entrega.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F2] border border-[#E7E4DC] text-[11px] font-mono-tabular text-stone-600 break-all">
                {storeShareUrl}
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[#ECE9E1]">
              <button
                type="button"
                onClick={() => navigateToRoute({ page: 'CUSTOMER_STORE' })}
                className="w-full py-3 px-4 rounded-xl bg-[#D97706] hover:bg-amber-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Abrir Loja do Cliente</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink('store', storeShareUrl)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#F7F6F2] hover:bg-stone-200 text-stone-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedType === 'store' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Link Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link do Cliente</span>
                    </>
                  )}
                </button>
                <a
                  href={storeRoute}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3.5 rounded-xl bg-[#F7F6F2] hover:bg-stone-200 text-stone-700 text-xs font-semibold inline-flex items-center gap-1"
                >
                  <span>Nova Aba</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
