import { jsPDF } from 'jspdf';
import { CashShiftRecord, DepotSettings } from '../types';

const formatBRL = (value: number): string =>
  `R$ ${value.toFixed(2).replace('.', ',')}`;

const formatDateTimeBR = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const normalizeWhatsAppNumber = (rawPhone?: string): string => {
  const digits = (rawPhone || '').replace(/\D/g, '');
  if (!digits) return '5521960185101';
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
};

export const formatWhatsAppDisplay = (rawPhone?: string): string => {
  const normalized = normalizeWhatsAppNumber(rawPhone);
  if (normalized.length === 13 && normalized.startsWith('55')) {
    const ddd = normalized.slice(2, 4);
    const part1 = normalized.slice(4, 9);
    const part2 = normalized.slice(9, 13);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  return `+${normalized}`;
};

const createCashClosingDoc = (
  record: CashShiftRecord,
  settings: DepotSettings
): { doc: jsPDF; fileName: string } => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > 278) {
      doc.addPage();
      y = 16;
    }
  };

  // Cabeçalho escuro elegante
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(settings.storeName.toUpperCase(), margin, 13);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('RELATORIO COMPLETO DE FECHAMENTO DE CAIXA', margin, 20);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `CNPJ: ${settings.cnpj}  |  ${settings.address}, ${settings.neighborhood} - ${settings.city}`,
    margin,
    27
  );

  y = 42;

  // Bloco 1: Identificação do Turno
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Operador: ${record.cashierName}`, margin + 4, y + 6.5);
  doc.text(`Turno ID: ${record.id}`, pageWidth - margin - 4, y + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Abertura: ${formatDateTimeBR(record.openedAt)}`, margin + 4, y + 13.5);
  doc.text(`Fechamento: ${formatDateTimeBR(record.closedAt)}`, pageWidth - margin - 4, y + 13.5, {
    align: 'right',
  });

  y += 26;

  // Bloco 2: Conferência Financeira da Gaveta (Saldos & Quebra de Caixa)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. CONFERENCIA DE CAIXA & SALDOS DA GAVETA', margin, y);
  y += 3;

  const drawerRows: [string, string, boolean?][] = [
    ['Saldo Inicial (Fundo de Troco)', formatBRL(record.initialFloat)],
    ['(+) Entradas em Dinheiro (Balcao + Delivery)', formatBRL(record.balcaoCash + record.deliveryCash)],
    ['(=) Saldo Final Esperado em Gaveta', formatBRL(record.expectedFinalCash), true],
    ['Saldo Informado (Contado pelo Operador)', formatBRL(record.finalCashInDrawer), true],
  ];

  drawerRows.forEach(([label, val, bold]) => {
    doc.setFillColor(bold ? 241 : 255, bold ? 245 : 255, bold ? 249 : 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 7.5, 'FD');
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(label, margin + 3, y + 5);
    doc.text(val, pageWidth - margin - 3, y + 5, { align: 'right' });
    y += 7.5;
  });

  // Linha de Quebra / Sobra destacada
  const diff = record.closingDifference;
  const diffLabel =
    Math.abs(diff) < 0.01
      ? 'Quebra / Diferenca de Caixa (CAIXA EXATO / BATIDO)'
      : diff > 0
      ? 'Quebra / Diferenca de Caixa (SOBRA DE CAIXA)'
      : 'Quebra / Diferenca de Caixa (QUEBRA / FALTA NO CAIXA)';

  if (Math.abs(diff) < 0.01) {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(21, 128, 61);
  } else if (diff > 0) {
    doc.setFillColor(219, 234, 254);
    doc.setTextColor(29, 78, 216);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.setTextColor(185, 28, 28);
  }
  doc.rect(margin, y, contentWidth, 8.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(diffLabel, margin + 3, y + 5.7);
  doc.text(`${diff >= 0 ? '+' : ''}${formatBRL(diff)}`, pageWidth - margin - 3, y + 5.7, {
    align: 'right',
  });
  y += 14;

  // Bloco 3: Faturamento, Formas de Pagamento, Custo Abatido & Lucro
  ensureSpace(60);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. FATURAMENTO, CUSTOS ABATIDOS (CMV) & LUCRO DO DIA', margin, y);
  y += 3;

  const profitMarginPct =
    record.totalSales > 0 ? Math.round((record.totalGrossProfit / record.totalSales) * 100) : 0;

  const totalMoney = record.balcaoCash + record.deliveryCash;
  const totalCard = record.balcaoCard + record.deliveryCard;
  const totalPix = record.balcaoPix + record.deliveryPix;

  const summaryRows: [string, string, boolean?][] = [
    [`Vendas Balcao (PDV)`, formatBRL(record.totalBalcao)],
    [`Vendas Delivery`, formatBRL(record.totalDelivery)],
    [
      `Detalhe Pagamentos: Dinheiro ${formatBRL(totalMoney)} | Cartao ${formatBRL(totalCard)} | PIX ${formatBRL(totalPix)}`,
      `${record.ordersCount} pedido(s)`,
    ],
    ['FATURAMENTO TOTAL DO DIA (BRUTO)', formatBRL(record.totalSales), true],
    ['(-) Custo dos Produtos Vendidos (CMV Abatido)', `- ${formatBRL(record.totalCostOfGoods)}`],
    [
      `(=) LUCRO BRUTO REAL (${profitMarginPct}% margem)`,
      formatBRL(record.totalGrossProfit),
      true,
    ],
    [
      `Vendas Canceladas / Estornadas no Dia (${record.canceledOrdersCount})`,
      formatBRL(record.canceledTotalValue),
    ],
  ];

  summaryRows.forEach(([label, val, bold], index) => {
    doc.setFillColor(bold ? 241 : 255, bold ? 245 : 255, bold ? 249 : 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 7.5, 'FD');
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(index === 2 ? 8 : 9);
    doc.setTextColor(index === 5 ? 21 : 30, index === 5 ? 128 : 41, index === 5 ? 61 : 59);
    doc.text(label, margin + 3, y + 5);
    doc.text(val, pageWidth - margin - 3, y + 5, { align: 'right' });
    y += 7.5;
  });

  y += 8;

  // Bloco 4: Relação Completa do que Foi Vendido no Dia
  ensureSpace(25);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`3. PRODUTOS VENDIDOS NO DIA (${record.soldProducts.length} itens)`, margin, y);
  y += 3.5;

  // Cabeçalho da Tabela
  const drawTableHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Produto', margin + 2.5, y + 5);
    doc.text('Qtd', margin + 92, y + 5, { align: 'right' });
    doc.text('Venda', margin + 122, y + 5, { align: 'right' });
    doc.text('Custo', margin + 150, y + 5, { align: 'right' });
    doc.text('Lucro', pageWidth - margin - 2.5, y + 5, { align: 'right' });
    y += 7.5;
  };

  drawTableHeader();

  if (record.soldProducts.length === 0) {
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 9, 'D');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Nenhum produto registrado nas vendas validas deste dia.', margin + 3, y + 6);
    y += 11;
  } else {
    record.soldProducts.forEach((prod, idx) => {
      if (y + 7.5 > 276) {
        doc.addPage();
        y = 16;
        drawTableHeader();
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 7, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const truncatedName =
        prod.productName.length > 42
          ? `${prod.productName.slice(0, 39)}...`
          : prod.productName;
      doc.text(truncatedName, margin + 2.5, y + 4.8);
      doc.text(`${prod.unitsSold} un`, margin + 92, y + 4.8, { align: 'right' });
      doc.text(formatBRL(prod.revenue), margin + 122, y + 4.8, { align: 'right' });
      doc.text(formatBRL(prod.costTotal), margin + 150, y + 4.8, { align: 'right' });

      doc.setTextColor(prod.profitTotal >= 0 ? 21 : 185, prod.profitTotal >= 0 ? 128 : 28, prod.profitTotal >= 0 ? 61 : 28);
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(prod.profitTotal), pageWidth - margin - 2.5, y + 4.8, { align: 'right' });
      y += 7;
    });
  }

  // Observações
  if (record.notes) {
    y += 5;
    ensureSpace(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observacoes do Fechamento:', margin, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(record.notes, contentWidth);
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 4.5;
  }

  // Rodapé
  ensureSpace(12);
  y += 6;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Gerado automaticamente em ${new Date().toLocaleString('pt-BR')} - ${settings.storeName}`,
    pageWidth / 2,
    y + 5,
    { align: 'center' }
  );

  const safeDate = new Date(record.closedAt).toLocaleDateString('pt-BR').replace(/\//g, '-');
  const fileName = `Fechamento_Caixa_${safeDate}_${record.id.slice(-4)}.pdf`;
  return { doc, fileName };
};

export const generateCashClosingPdf = (
  record: CashShiftRecord,
  settings: DepotSettings
): string => {
  const { doc, fileName } = createCashClosingDoc(record, settings);
  doc.save(fileName);
  return fileName;
};

export const generateCashClosingPdfBase64 = (
  record: CashShiftRecord,
  settings: DepotSettings
): { fileName: string; base64: string } => {
  const { doc, fileName } = createCashClosingDoc(record, settings);
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
  return { fileName, base64 };
};

export const buildCashClosingMessage = (
  record: CashShiftRecord,
  settings: DepotSettings
): string => {
  const diff = record.closingDifference;
  const diffStatus =
    Math.abs(diff) < 0.01
      ? 'CAIXA BATIDO (R$ 0,00)'
      : diff > 0
      ? `SOBRA DE +${formatBRL(diff)}`
      : `QUEBRA / FALTA DE -${formatBRL(Math.abs(diff))}`;

  const totalMoney = record.balcaoCash + record.deliveryCash;
  const totalCard = record.balcaoCard + record.deliveryCard;
  const totalPix = record.balcaoPix + record.deliveryPix;
  const marginPct =
    record.totalSales > 0 ? Math.round((record.totalGrossProfit / record.totalSales) * 100) : 0;

  const lines: string[] = [
    `*FECHAMENTO DE CAIXA - ${settings.storeName.toUpperCase()}*`,
    `Operador: ${record.cashierName}`,
    `Abertura: ${formatDateTimeBR(record.openedAt)}`,
    `Fechamento: ${formatDateTimeBR(record.closedAt)}`,
    ``,
    `*1. CONFERENCIA DE SALDOS (GAVETA)*`,
    `• Saldo Inicial (Fundo): ${formatBRL(record.initialFloat)}`,
    `• (+) Dinheiro Entradas: ${formatBRL(totalMoney)}`,
    `• (=) Saldo Final Esperado: ${formatBRL(record.expectedFinalCash)}`,
    `• Saldo Informado (Contado): ${formatBRL(record.finalCashInDrawer)}`,
    `• Status / Quebra de Caixa: *${diffStatus}*`,
    ``,
    `*2. FATURAMENTO & LUCRO (ABATIDO CUSTO)*`,
    `• Balcao PDV: ${formatBRL(record.totalBalcao)}`,
    `• Delivery: ${formatBRL(record.totalDelivery)}`,
    `• Dinheiro: ${formatBRL(totalMoney)} | Cartao: ${formatBRL(totalCard)} | PIX: ${formatBRL(totalPix)}`,
    `• *Faturamento Total:* ${formatBRL(record.totalSales)}`,
    `• (-) Custo dos Produtos (CMV): ${formatBRL(record.totalCostOfGoods)}`,
    `• *(=) Lucro Bruto Real (${marginPct}%):* ${formatBRL(record.totalGrossProfit)}`,
  ];

  if (record.canceledOrdersCount > 0) {
    lines.push(
      `• Cancelamentos no dia: ${record.canceledOrdersCount} (${formatBRL(record.canceledTotalValue)})`
    );
  }

  if (record.soldProducts.length > 0) {
    lines.push(``);
    lines.push(`*3. O QUE FOI VENDIDO NO DIA (${record.soldProducts.length} produtos)*`);
    record.soldProducts.slice(0, 15).forEach((p, idx) => {
      lines.push(
        `${idx + 1}. ${p.productName} — ${p.unitsSold} un | Venda: ${formatBRL(p.revenue)} | Custo: ${formatBRL(p.costTotal)} | Lucro: ${formatBRL(p.profitTotal)}`
      );
    });
    if (record.soldProducts.length > 15) {
      lines.push(`... e mais ${record.soldProducts.length - 15} produto(s) no PDF completo.`);
    }
  }

  if (record.notes) {
    lines.push(``);
    lines.push(`*Observacoes:* ${record.notes}`);
  }

  lines.push(``);
  lines.push(`_Relatorio PDF detalhado gerado no sistema para anexo._`);

  return lines.join('\n');
};

export const buildWhatsAppCompactMessage = (
  record: CashShiftRecord,
  settings: DepotSettings
): string => {
  const diff = record.closingDifference;
  const diffStatus =
    Math.abs(diff) < 0.01
      ? 'CAIXA BATIDO (R$ 0,00)'
      : diff > 0
      ? `SOBRA +${formatBRL(diff)}`
      : `QUEBRA -${formatBRL(Math.abs(diff))}`;

  const totalMoney = record.balcaoCash + record.deliveryCash;
  const totalCard = record.balcaoCard + record.deliveryCard;
  const totalPix = record.balcaoPix + record.deliveryPix;
  const marginPct =
    record.totalSales > 0 ? Math.round((record.totalGrossProfit / record.totalSales) * 100) : 0;

  const lines: string[] = [
    `*FECHAMENTO DE CAIXA - ${settings.storeName.toUpperCase()}*`,
    `Operador: ${record.cashierName} | ${formatDateTimeBR(record.closedAt)}`,
    ``,
    `*SALDOS DA GAVETA:*`,
    `• Inicial: ${formatBRL(record.initialFloat)} | Dinheiro: +${formatBRL(totalMoney)}`,
    `• Esperado: ${formatBRL(record.expectedFinalCash)} | Informado: ${formatBRL(record.finalCashInDrawer)}`,
    `• Status: *${diffStatus}*`,
    ``,
    `*FATURAMENTO & LUCRO:*`,
    `• Balcao: ${formatBRL(record.totalBalcao)} | Delivery: ${formatBRL(record.totalDelivery)}`,
    `• Dinheiro ${formatBRL(totalMoney)} | Cartao ${formatBRL(totalCard)} | PIX ${formatBRL(totalPix)}`,
    `• *Total Vendido:* ${formatBRL(record.totalSales)}`,
    `• (-) Custo (CMV): ${formatBRL(record.totalCostOfGoods)}`,
    `• *(=) Lucro Real (${marginPct}%):* ${formatBRL(record.totalGrossProfit)}`,
  ];

  if (record.soldProducts.length > 0) {
    lines.push(``);
    lines.push(`*PRINCIPAIS SAIDAS (${record.soldProducts.length} itens):*`);
    record.soldProducts.slice(0, 6).forEach((p, idx) => {
      const shortName =
        p.productName.length > 26 ? `${p.productName.slice(0, 24)}..` : p.productName;
      lines.push(`${idx + 1}. ${shortName} (${p.unitsSold}un) ${formatBRL(p.revenue)}`);
    });
    if (record.soldProducts.length > 6) {
      lines.push(`+ ${record.soldProducts.length - 6} produto(s) no PDF.`);
    }
  }

  let result = lines.join('\n');
  if (result.length > 1050) {
    result = `${result.slice(0, 1020)}\n...(Veja PDF completo)`;
  }
  return result;
};

export const buildWhatsAppReportUrl = (phone: string, message: string): string => {
  const normalized = normalizeWhatsAppNumber(phone);
  return `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`;
};

export const buildWhatsAppWebUrl = (phone: string, message: string): string => {
  const normalized = normalizeWhatsAppNumber(phone);
  return `https://web.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(message)}`;
};

export const buildEmailReportUrl = (
  email: string,
  subject: string,
  body: string
): string => {
  const cleanEmail = email.trim() || 'tvhisoka@gmail.com';
  return `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

export interface PeriodPdfProductRow {
  productName: string;
  totalUnits: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  balcaoUnits: number;
  deliveryUnits: number;
}

export const generatePeriodSalesPdf = (params: {
  settings: DepotSettings;
  periodLabel: string;
  totalUnits: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  validOrdersCount: number;
  canceledOrdersCount: number;
  products: PeriodPdfProductRow[];
}): string => {
  const { settings, periodLabel, products } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.storeName.toUpperCase(), margin, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10.5);
  doc.text(`RELATORIO DE SAIDA DE PRODUTOS & LUCRO (${periodLabel.toUpperCase()})`, margin, 20);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Emitido em ${new Date().toLocaleString('pt-BR')}  |  Pedidos validos: ${params.validOrdersCount}`, margin, 27);

  y = 40;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Unidades Vendidas: ${params.totalUnits} un`, margin + 4, y + 7);
  doc.text(`Faturamento: ${formatBRL(params.totalRevenue)}`, margin + 65, y + 7);
  doc.text(`Custo Abatido (CMV): ${formatBRL(params.totalCost)}`, margin + 4, y + 14.5);
  doc.setTextColor(21, 128, 61);
  doc.text(`Lucro Bruto Real: ${formatBRL(params.totalProfit)}`, margin + 65, y + 14.5);

  y += 28;

  const drawHeader = () => {
    doc.setFillColor(30, 41, 59);
    doc.setTextColor(255, 255, 255);
    doc.rect(margin, y, contentWidth, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Produto', margin + 2.5, y + 5);
    doc.text('Qtd', margin + 88, y + 5, { align: 'right' });
    doc.text('Venda', margin + 120, y + 5, { align: 'right' });
    doc.text('Custo', margin + 150, y + 5, { align: 'right' });
    doc.text('Lucro', pageWidth - margin - 2.5, y + 5, { align: 'right' });
    y += 7.5;
  };

  drawHeader();

  products.forEach((prod, idx) => {
    if (y + 7.5 > 278) {
      doc.addPage();
      y = 16;
      drawHeader();
    }
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 7, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const name = prod.productName.length > 40 ? `${prod.productName.slice(0, 37)}...` : prod.productName;
    doc.text(name, margin + 2.5, y + 4.8);
    doc.text(`${prod.totalUnits} un`, margin + 88, y + 4.8, { align: 'right' });
    doc.text(formatBRL(prod.totalRevenue), margin + 120, y + 4.8, { align: 'right' });
    doc.text(formatBRL(prod.totalCost), margin + 150, y + 4.8, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(21, 128, 61);
    doc.text(formatBRL(prod.totalProfit), pageWidth - margin - 2.5, y + 4.8, { align: 'right' });
    y += 7;
  });

  const fileName = `Relatorio_Vendas_Saidas_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
  return fileName;
};
