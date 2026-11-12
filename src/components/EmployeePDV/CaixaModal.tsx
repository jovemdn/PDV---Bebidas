import React, { useState, useEffect } from 'react';
import { useBeverage } from '../../context/BeverageContext';
import { CashShiftRecord } from '../../types';
import {
  generateCashClosingPdf,
  generateCashClosingPdfBase64,
  buildCashClosingMessage,
  buildWhatsAppCompactMessage,
  buildWhatsAppReportUrl,
  buildWhatsAppWebUrl,
  buildEmailReportUrl,
  formatWhatsAppDisplay,
} from '../../services/reportPdfService';
import {
  initGmailAuth,
  signInWithGoogleForGmail,
  getGmailAccessToken,
  logoutGmail,
  sendEmailViaGmailApi,
} from '../../services/gmailService';
import { GoogleSignInButton } from '../common/GoogleSignInButton';
import {
  X,
  Lock,
  Unlock,
  Trash2,
  Banknote,
  CreditCard,
  QrCode,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  Printer,
  History,
  MessageCircle,
  Mail,
  Copy,
  Check,
  TrendingUp,
  Package,
  Send,
  Globe,
  Loader2,
  LogOut,
  Paperclip,
} from 'lucide-react';

interface CaixaModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'OPEN' | 'CLOSE' | 'CLEAN' | 'HISTORY';
}

export const CaixaModal: React.FC<CaixaModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'CLOSE',
}) => {
  const {
    cashShift,
    shiftHistory,
    settings,
    openCashShift,
    closeCashShift,
    cleanCashShift,
  } = useBeverage();

  const [activeTab, setActiveTab] = useState<'ACTIONS' | 'HISTORY'>(
    defaultMode === 'HISTORY' ? 'HISTORY' : 'ACTIONS'
  );

  // States para Abrir Caixa
  const [openingFloat, setOpeningFloat] = useState(200.0);
  const [cashierNameInput, setCashierNameInput] = useState(
    cashShift.cashierName !== 'Aguardando Operador' ? cashShift.cashierName : 'Operador Balcão'
  );

  // Cálculos do Turno Vigente
  const totalBalcao = cashShift.balcaoCash + cashShift.balcaoCard + cashShift.balcaoPix;
  const totalDelivery = cashShift.deliveryCash + cashShift.deliveryCard + cashShift.deliveryPix;
  const totalVendas = totalBalcao + totalDelivery;
  const expectedCashInDrawer = cashShift.initialFloat + cashShift.balcaoCash + cashShift.deliveryCash;

  const [countedCash, setCountedCash] = useState<number>(expectedCashInDrawer);
  const [closingNotes, setClosingNotes] = useState('');
  const [lastClosedReport, setLastClosedReport] = useState<CashShiftRecord | null>(null);

  // Destino do envio para o Dono (+5521960185101 / E-mail)
  const [targetWhatsApp, setTargetWhatsApp] = useState(settings.ownerWhatsApp || '5521960185101');
  const [targetEmail, setTargetEmail] = useState(settings.ownerEmail || 'tvhisoka@gmail.com');
  const [copiedReport, setCopiedReport] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  // Status da API de WhatsApp no servidor (/api/reports/status e /api/reports/whatsapp)
  const [apiStatus, setApiStatus] = useState<{
    whatsappApiConfigured: boolean;
    provider: string;
  }>({ whatsappApiConfigured: false, provider: 'DIRECT_LINK' });

  const [apiSendState, setApiSendState] = useState<{
    loading: boolean;
    ok?: boolean;
    needsConfig?: boolean;
    message?: string;
  }>({ loading: false });

  // Status da conexão e envio direto via Gmail (OAuth cliente sem API de WhatsApp)
  const [gmailConnectedEmail, setGmailConnectedEmail] = useState<string | null>(null);
  const [gmailHasToken, setGmailHasToken] = useState<boolean>(Boolean(getGmailAccessToken()));
  const [gmailAuthLoading, setGmailAuthLoading] = useState(false);
  const [pendingGmailRecord, setPendingGmailRecord] = useState<CashShiftRecord | null>(null);
  const [gmailSendState, setGmailSendState] = useState<{
    loading: boolean;
    ok?: boolean;
    message?: string;
  }>({ loading: false });

  // Confirmação para limpar caixa
  const [confirmClean, setConfirmClean] = useState(false);

  useEffect(() => {
    const unsubscribe = initGmailAuth(
      (user, token) => {
        setGmailConnectedEmail(user.email);
        setGmailHasToken(Boolean(token));
      },
      () => {
        setGmailConnectedEmail(null);
        setGmailHasToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCountedCash(Number(expectedCashInDrawer.toFixed(2)));
      setTargetWhatsApp(settings.ownerWhatsApp || '5521960185101');
      setTargetEmail(settings.ownerEmail || 'tvhisoka@gmail.com');
      setPdfFeedback(null);
      setCopiedReport(false);
      setApiSendState({ loading: false });
      setGmailSendState({ loading: false });
      setPendingGmailRecord(null);
      setGmailHasToken(Boolean(getGmailAccessToken()));

      fetch('/api/reports/status')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.whatsappApiConfigured === 'boolean') {
            setApiStatus({
              whatsappApiConfigured: data.whatsappApiConfigured,
              provider: data.provider || 'DIRECT_LINK',
            });
          }
        })
        .catch(() => {
          // Modo offline/link direto continua funcionando normalmente
        });
    }
  }, [isOpen, expectedCashInDrawer, settings.ownerWhatsApp, settings.ownerEmail]);

  if (!isOpen) return null;

  const handleConnectGmail = async () => {
    setGmailAuthLoading(true);
    setGmailSendState({ loading: false });
    try {
      const result = await signInWithGoogleForGmail();
      setGmailConnectedEmail(result.user.email);
      setGmailHasToken(Boolean(result.accessToken));
    } catch (err) {
      setGmailSendState({
        loading: false,
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Não foi possível conectar sua conta Google para enviar pelo Gmail.',
      });
    } finally {
      setGmailAuthLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    await logoutGmail();
    setGmailConnectedEmail(null);
    setGmailHasToken(false);
    setPendingGmailRecord(null);
    setGmailSendState({ loading: false });
  };

  const handleRequestGmailSend = (record: CashShiftRecord) => {
    setGmailSendState({ loading: false });
    setPendingGmailRecord(record);
  };

  const handleConfirmSendGmail = async () => {
    if (!pendingGmailRecord) return;
    const token = getGmailAccessToken();
    if (!token) {
      setGmailHasToken(false);
      setGmailSendState({
        loading: false,
        ok: false,
        message: 'Conecte sua conta Google primeiro para autorizar o envio pelo Gmail.',
      });
      return;
    }

    setGmailSendState({ loading: true });
    try {
      const record = pendingGmailRecord;
      const subject = `Fechamento de Caixa - ${settings.storeName} (${new Date(
        record.closedAt
      ).toLocaleDateString('pt-BR')})`;
      const textBody = buildCashClosingMessage(record, settings);
      const { fileName, base64 } = generateCashClosingPdfBase64(record, settings);

      await sendEmailViaGmailApi({
        toEmail: targetEmail,
        subject,
        textBody,
        pdfBase64: base64,
        pdfFileName: fileName,
        accessToken: token,
      });

      setPendingGmailRecord(null);
      setGmailSendState({
        loading: false,
        ok: true,
        message: `Relatório completo + PDF (${fileName}) enviados diretamente para ${targetEmail} via Gmail!`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar e-mail pelo Gmail.';
      setGmailHasToken(Boolean(getGmailAccessToken()));
      setGmailSendState({
        loading: false,
        ok: false,
        message: msg,
      });
    }
  };

  const sendViaBackendApi = async (record: CashShiftRecord) => {
    setApiSendState({ loading: true });
    try {
      const fullText = buildCashClosingMessage(record, settings);
      const { fileName, base64 } = generateCashClosingPdfBase64(record, settings);

      const response = await fetch('/api/reports/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toPhone: targetWhatsApp,
          message: fullText,
          pdfBase64: base64,
          fileName,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        sentViaApi?: boolean;
        needsConfig?: boolean;
        provider?: string;
        info?: string;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        setApiSendState({
          loading: false,
          ok: false,
          message: data.error || 'Falha ao enviar pela API do servidor.',
        });
        return;
      }

      if (data.sentViaApi) {
        setApiSendState({
          loading: false,
          ok: true,
          message: `Relatório completo + PDF enviados automaticamente via API (${data.provider}) para ${formatWhatsAppDisplay(
            targetWhatsApp
          )}!`,
        });
      } else {
        setApiSendState({
          loading: false,
          ok: false,
          needsConfig: true,
          message:
            data.info ||
            'Servidor ativo em modo Link Direto (sem token de API WhatsApp configurado no .env). Use os botões "Abrir WhatsApp" abaixo.',
        });
      }
    } catch {
      setApiSendState({
        loading: false,
        ok: false,
        message: 'Não foi possível conectar ao endpoint /api/reports/whatsapp.',
      });
    }
  };

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openCashShift(openingFloat, cashierNameInput);
    setLastClosedReport(null);
    onClose();
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const record = closeCashShift(countedCash, closingNotes);
    setLastClosedReport(record);
    if (apiStatus.whatsappApiConfigured) {
      void sendViaBackendApi(record);
    }
  };

  const handleCleanSubmit = () => {
    cleanCashShift();
    setConfirmClean(false);
    setLastClosedReport(null);
    onClose();
  };

  const handleDownloadPdf = (record: CashShiftRecord) => {
    const fileName = generateCashClosingPdf(record, settings);
    setPdfFeedback(`PDF "${fileName}" baixado! Pronto para anexar ou arquivar.`);
  };

  const handleCopyReport = async (record: CashShiftRecord) => {
    const text = buildCashClosingMessage(record, settings);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Fallback silencioso
    }
  };

  const diff = countedCash - expectedCashInDrawer;

  const renderClosingReportCard = (record: CashShiftRecord) => {
    const reportText = buildCashClosingMessage(record, settings);
    const compactWhatsAppText = buildWhatsAppCompactMessage(record, settings);
    const whatsappAppHref = buildWhatsAppReportUrl(targetWhatsApp, compactWhatsAppText);
    const whatsappWebHref = buildWhatsAppWebUrl(targetWhatsApp, compactWhatsAppText);
    const emailSubject = `Fechamento de Caixa - ${settings.storeName} (${new Date(
      record.closedAt
    ).toLocaleDateString('pt-BR')})`;
    const emailHref = buildEmailReportUrl(targetEmail, emailSubject, reportText);
    const marginPct =
      record.totalSales > 0
        ? Math.round((record.totalGrossProfit / record.totalSales) * 100)
        : 0;

    return (
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border-2 border-emerald-500/40 text-xs space-y-4 shadow-2xl">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Relatório Completo de Fechamento para o Dono
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Operador: <strong className="text-white">{record.cashierName}</strong> &bull; Fechado em{' '}
              {new Date(record.closedAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLastClosedReport(null)}
            className="px-2 py-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            title="Ocultar prévia"
          >
            ✕
          </button>
        </div>

        {/* Saldos e Quebra de Caixa */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Saldo Inicial</span>
            <strong className="text-sm font-black text-white">
              R$ {record.initialFloat.toFixed(2)}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Saldo Final Esperado</span>
            <strong className="text-sm font-black text-amber-300">
              R$ {record.expectedFinalCash.toFixed(2)}
            </strong>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Saldo Informado</span>
            <strong className="text-sm font-black text-cyan-300">
              R$ {record.finalCashInDrawer.toFixed(2)}
            </strong>
          </div>
          <div
            className={`p-2.5 rounded-xl border ${
              Math.abs(record.closingDifference) < 0.01
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : record.closingDifference > 0
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block">Quebra / Diferença</span>
            <strong className="text-sm font-black">
              {record.closingDifference >= 0 ? '+' : ''}R$ {record.closingDifference.toFixed(2)}
            </strong>
          </div>
        </div>

        {/* Faturamento, Custo Abatido & Lucro */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">
              Faturamento Total ({record.ordersCount} vendas)
            </span>
            <strong className="text-base font-black text-amber-400">
              R$ {record.totalSales.toFixed(2)}
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Balcão R$ {record.totalBalcao.toFixed(2)} &bull; Deliv. R$ {record.totalDelivery.toFixed(2)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/20">
            <span className="text-[10px] text-rose-300 block uppercase font-bold">
              (-) Custo Abatido (CMV)
            </span>
            <strong className="text-base font-black text-rose-300">
              R$ {record.totalCostOfGoods.toFixed(2)}
            </strong>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Custo dos produtos vendidos no dia
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-[10px] text-emerald-300 block uppercase font-bold">
              (=) Lucro Bruto Real ({marginPct}%)
            </span>
            <strong className="text-base font-black text-emerald-400">
              R$ {record.totalGrossProfit.toFixed(2)}
            </strong>
            <span className="text-[10px] text-emerald-200/80 block mt-0.5">
              Já descontado o custo dos produtos
            </span>
          </div>
        </div>

        {/* Lista do que foi vendido no dia */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-3 py-2 bg-slate-800/60 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              O que foi vendido hoje ({record.soldProducts.length} produtos)
            </span>
            {record.canceledOrdersCount > 0 && (
              <span className="text-[10px] text-rose-400 font-bold">
                {record.canceledOrdersCount} cancelado(s): R$ {record.canceledTotalValue.toFixed(2)}
              </span>
            )}
          </div>

          {record.soldProducts.length === 0 ? (
            <p className="p-3 text-[11px] text-slate-500 text-center">
              Nenhuma saída de produto registrada neste turno.
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-800/70">
              {record.soldProducts.map((prod) => (
                <div
                  key={prod.productId}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate">{prod.productName}</span>
                    <span className="text-[10px] text-slate-400">
                      {prod.unitsSold} un &bull; Custo: R$ {prod.costTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-amber-300 block">
                      R$ {prod.revenue.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      Lucro: R$ {prod.profitTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Destinatários do Envio para o Dono */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Enviar Relatório Completo + PDF para o Dono:
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                apiStatus.whatsappApiConfigured
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              {apiStatus.whatsappApiConfigured
                ? `API Automática Ativa (${apiStatus.provider})`
                : 'Integração Direta WhatsApp + Endpoint /api/reports/whatsapp'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">WhatsApp do Dono</label>
              <input
                type="text"
                value={targetWhatsApp}
                onChange={(e) => setTargetWhatsApp(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">E-mail do Dono</label>
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            {gmailHasToken ? (
              <>
                <div className="text-[11px] text-emerald-300 flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Gmail conectado{gmailConnectedEmail ? `: ${gmailConnectedEmail}` : ''} (pronto para enviar Texto + PDF direto!)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDisconnectGmail()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 border border-slate-700"
                >
                  <LogOut className="w-3 h-3" /> Trocar conta
                </button>
              </>
            ) : (
              <>
                <div className="text-[11px] text-slate-300">
                  <strong className="text-cyan-300 block">Envio Direto via Gmail (Texto + PDF em anexo):</strong>
                  <span>Conecte sua conta Google uma única vez — não precisa configurar API do WhatsApp.</span>
                </div>
                <GoogleSignInButton
                  onClick={() => void handleConnectGmail()}
                  loading={gmailAuthLoading}
                  label="Conectar Gmail"
                />
              </>
            )}
          </div>
        </div>

        {pdfFeedback && (
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
            ✓ {pdfFeedback}
          </div>
        )}

        {apiSendState.message && (
          <div
            className={`p-2.5 rounded-xl border text-[11px] font-semibold ${
              apiSendState.ok
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : apiSendState.needsConfig
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {apiSendState.message}
          </div>
        )}

        {gmailSendState.message && (
          <div
            className={`p-2.5 rounded-xl border text-[11px] font-semibold ${
              gmailSendState.ok
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            {gmailSendState.ok ? '✓ ' : ''}
            {gmailSendState.message}
          </div>
        )}

        {/* Botões de Exportação PDF & Envio Direto por E-mail (Gmail) / WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleRequestGmailSend(record)}
            className="sm:col-span-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-all active:scale-95"
          >
            <Mail className="w-4 h-4" />
            <span>Enviar Direto pelo Gmail com PDF em Anexo ({targetEmail})</span>
          </button>

          <button
            type="button"
            onClick={() => handleDownloadPdf(record)}
            className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            <span>Baixar Relatório Completo (PDF)</span>
          </button>

          <button
            type="button"
            disabled={apiSendState.loading}
            onClick={() => void sendViaBackendApi(record)}
            className="py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
          >
            {apiSendState.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {apiSendState.loading
                ? 'Enviando Texto + PDF...'
                : 'API WhatsApp Servidor (Texto + PDF)'}
            </span>
          </button>

          <a
            href={whatsappAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp App/Celular ({formatWhatsAppDisplay(targetWhatsApp)})</span>
          </a>

          <a
            href={whatsappWebHref}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 border border-emerald-500/40 transition-all active:scale-95"
          >
            <Globe className="w-4 h-4" />
            <span>Abrir no WhatsApp Web (PC)</span>
          </a>

          <a
            href={emailHref}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-cyan-500/30 transition-all active:scale-95"
          >
            <Mail className="w-4 h-4" />
            <span>Abrir App de E-mail (mailto)</span>
          </a>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleCopyReport(record)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 border border-slate-700"
              title="Imprimir fechamento"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto text-white shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                cashShift.status === 'OPEN'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {cashShift.status === 'OPEN' ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Gestão Financeira &amp; Caixa do PDV</h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    cashShift.status === 'OPEN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {cashShift.status === 'OPEN' ? 'Caixa Aberto' : 'Caixa Fechado'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Operador: <strong className="text-white">{cashShift.cashierName}</strong> &bull; Aberto em:{' '}
                {new Date(cashShift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'ACTIONS' ? 'HISTORY' : 'ACTIONS')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>{activeTab === 'ACTIONS' ? `Histórico (${shiftHistory.length})` : 'Operações'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1">
          {activeTab === 'HISTORY' ? (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Histórico de Turnos Fechados &amp; Envio de Relatórios
              </h4>
              {shiftHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <p className="text-xs">Nenhum turno fechado anteriormente registrado nesta sessão.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shiftHistory.map((rec) => {
                    const msg = buildCashClosingMessage(rec, settings);
                    const compactMsg = buildWhatsAppCompactMessage(rec, settings);
                    const waAppUrl = buildWhatsAppReportUrl(targetWhatsApp, compactMsg);
                    const waWebUrl = buildWhatsAppWebUrl(targetWhatsApp, compactMsg);
                    const emUrl = buildEmailReportUrl(
                      targetEmail,
                      `Fechamento de Caixa - ${settings.storeName}`,
                      msg
                    );
                    return (
                      <div
                        key={rec.id}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                          <span className="font-bold text-white">Operador: {rec.cashierName}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rec.closedAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <span className="text-slate-400 text-[10px] block">Saldo Inicial:</span>
                            <strong>R$ {rec.initialFloat.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Faturamento:</span>
                            <strong className="text-amber-400">R$ {rec.totalSales.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Lucro (custo abatido):</span>
                            <strong className="text-emerald-400">R$ {rec.totalGrossProfit.toFixed(2)}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] block">Quebra / Sobra:</span>
                            <strong
                              className={rec.closingDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                            >
                              {rec.closingDifference >= 0 ? '+' : ''}R$ {rec.closingDifference.toFixed(2)}
                            </strong>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleRequestGmailSend(rec)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-[11px] flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" /> Enviar via Gmail (PDF)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(rec)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1"
                          >
                            <FileDown className="w-3.5 h-3.5" /> PDF
                          </button>
                          <button
                            type="button"
                            disabled={apiSendState.loading}
                            onClick={() => void sendViaBackendApi(rec)}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <Send className="w-3.5 h-3.5" /> API WhatsApp
                          </button>
                          <a
                            href={waAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp App
                          </a>
                          <a
                            href={waWebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <Globe className="w-3.5 h-3.5" /> WhatsApp Web
                          </a>
                          <a
                            href={emUrl}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] flex items-center gap-1 border border-slate-700"
                          >
                            <Mail className="w-3.5 h-3.5" /> App E-mail
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Relatório completo emitido ao finalizar o caixa */}
              {lastClosedReport && renderClosingReportCard(lastClosedReport)}

              {/* Se o Caixa estiver FECHADO -> Formulário para ABRIR CAIXA */}
              {cashShift.status === 'CLOSED' ? (
                <form
                  onSubmit={handleOpenSubmit}
                  className="space-y-4 p-5 rounded-3xl bg-slate-950 border border-slate-800"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Unlock className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-black text-white">Abrir Novo Turno de Caixa</h4>
                      <p className="text-xs text-slate-400">
                        Informe o saldo inicial (fundo de troco) colocado na gaveta física.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Nome do Operador de Caixa
                      </label>
                      <input
                        type="text"
                        required
                        value={cashierNameInput}
                        onChange={(e) => setCashierNameInput(e.target.value)}
                        placeholder="Ex: Fernanda (Balcão 01)"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Saldo Inicial / Fundo de Caixa (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          required
                          value={openingFloat}
                          onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 font-black text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-[10px] text-slate-500">Valores rápidos:</span>
                    {[100, 150, 200, 300, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setOpeningFloat(val)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-amber-400 border border-slate-800"
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Confirmar Abertura de Caixa &amp; Iniciar Vendas</span>
                  </button>
                </form>
              ) : (
                /* Se o Caixa estiver ABERTO -> Resumo e Formulário de FECHAMENTO */
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Saldo Inicial:
                      </span>
                      <strong className="text-sm font-black text-white">
                        R$ {cashShift.initialFloat.toFixed(2)}
                      </strong>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Vendas Balcão:
                      </span>
                      <strong className="text-sm font-black text-amber-400">
                        R$ {totalBalcao.toFixed(2)}
                      </strong>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Delivery:
                      </span>
                      <strong className="text-sm font-black text-cyan-400">
                        R$ {totalDelivery.toFixed(2)}
                      </strong>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Faturamento Total:
                      </span>
                      <strong className="text-sm font-black text-emerald-400">
                        R$ {totalVendas.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Detalhamento por Modalidade */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Detalhamento por Forma de Pagamento:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <Banknote className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Dinheiro Físico:</span>
                          <strong className="text-xs">
                            R$ {(cashShift.balcaoCash + cashShift.deliveryCash).toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">Cartão Maquininhas:</span>
                          <strong className="text-xs">
                            R$ {(cashShift.balcaoCard + cashShift.deliveryCard).toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <QrCode className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="text-[10px] text-slate-400 block">PIX Total:</span>
                          <strong className="text-xs">
                            R$ {(cashShift.balcaoPix + cashShift.deliveryPix).toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Fechamento com Contagem de Gaveta */}
                  <form
                    onSubmit={handleCloseSubmit}
                    className="space-y-4 p-5 rounded-3xl bg-slate-950 border border-amber-500/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-800 gap-2">
                      <div>
                        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                          Conferência de Fechamento de Caixa
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Saldo Final Esperado na Gaveta (Inicial + Dinheiro):{' '}
                          <strong className="text-white font-bold">
                            R$ {expectedCashInDrawer.toFixed(2)}
                          </strong>
                        </p>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-slate-800 text-amber-300 border border-slate-700 self-start sm:self-auto">
                        Saldo Final: R$ {expectedCashInDrawer.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Saldo Informado (Contado na Gaveta) (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={countedCash}
                            onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-500 font-black text-sm"
                          />
                        </div>
                        {Math.abs(diff) >= 0.01 ? (
                          <p
                            className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
                              diff > 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {diff > 0
                              ? `Sobra de caixa: +R$ ${diff.toFixed(2)}`
                              : `Quebra de caixa (falta): -R$ ${Math.abs(diff).toFixed(2)}`}
                          </p>
                        ) : (
                          <p className="text-[10px] font-bold mt-1.5 text-emerald-400">
                            ✓ Caixa exato (sem quebra de caixa)
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Observações do Fechamento
                        </label>
                        <input
                          type="text"
                          value={closingNotes}
                          onChange={(e) => setClosingNotes(e.target.value)}
                          placeholder="Ex: Sangria realizada, moedas trocadas, etc."
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Ao finalizar, o sistema gera o <strong>PDF Completo</strong> e libera o envio direto para{' '}
                        <strong className="text-emerald-300">{formatWhatsAppDisplay(targetWhatsApp)}</strong> e E-mail.
                      </span>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Finalizar Caixa &amp; Gerar Relatório Completo (PDF / WhatsApp)</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Botão para Limpar / Zerar Caixa */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-black text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Limpar &amp; Zerar Caixa
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Zera todas as movimentações de vendas acumuladas do dia e reseta a gaveta para o estado inicial limpo.
                  </p>
                </div>

                {confirmClean ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmClean(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCleanSubmit}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow"
                    >
                      Sim, Limpar Tudo!
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClean(true)}
                    className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Caixa</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação Obrigatória antes do Envio via Gmail */}
      {pendingGmailRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-3xl max-w-md w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Confirmar Envio pelo Gmail</h4>
                  <p className="text-[11px] text-slate-400">
                    Revise os dados antes de disparar o e-mail para o dono.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingGmailRecord(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Destinatário:</span>
                <strong className="text-cyan-300">{targetEmail}</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Assunto:</span>
                <strong className="text-white text-right">
                  Fechamento de Caixa ({new Date(pendingGmailRecord.closedAt).toLocaleDateString('pt-BR')})
                </strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400">Anexo:</span>
                <strong className="text-amber-300 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  Fechamento_Caixa_{new Date(pendingGmailRecord.closedAt)
                    .toLocaleDateString('pt-BR')
                    .replace(/\//g, '-')}
                  _{pendingGmailRecord.id.slice(-4)}.pdf
                </strong>
              </div>
              <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Faturamento Total:</span>
                  <strong className="text-amber-400">
                    R$ {pendingGmailRecord.totalSales.toFixed(2)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Lucro Bruto (CMV abatido):</span>
                  <strong className="text-emerald-400">
                    R$ {pendingGmailRecord.totalGrossProfit.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>

            {!gmailHasToken ? (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-center">
                <p className="text-xs text-slate-300">
                  Conecte sua conta Google abaixo para autorizar este envio pelo Gmail com a sua permissão:
                </p>
                <div className="flex justify-center">
                  <GoogleSignInButton
                    onClick={() => void handleConnectGmail()}
                    loading={gmailAuthLoading}
                    label="Sign in with Google / Conectar Gmail"
                  />
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold">
                ✓ Conta Google conectada{gmailConnectedEmail ? ` (${gmailConnectedEmail})` : ''}. Pronto para enviar agora.
              </div>
            )}

            {gmailSendState.message && !gmailSendState.ok && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold">
                {gmailSendState.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingGmailRecord(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!gmailHasToken || gmailSendState.loading}
                onClick={() => void handleConfirmSendGmail()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
              >
                {gmailSendState.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{gmailSendState.loading ? 'Enviando...' : 'Confirmar e Enviar E-mail'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
