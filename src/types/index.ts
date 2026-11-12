export type TemperatureOption = 'GELADA' | 'NATURAL';
export type PresentationOption = 'UNIDADE' | 'FARDO';
export type VasilhameOption = 'TROCA' | 'COMPRAR_CASCO' | 'NAO_APLICA';
export type PaymentMethod = 'PIX' | 'CARTAO_ENTREGA' | 'DINHEIRO';
export type OrderStatus = 
  | 'PENDENTE'
  | 'CONFIRMADO_PREPARO'
  | 'AGUARDANDO_MOTOBOY'
  | 'EM_ROTA'
  | 'ENTREGUE'
  | 'CANCELADO';

export type ProductCategory = 
  | 'todas'
  | 'cervejas'
  | 'destilados'
  | 'refrigerantes'
  | 'gelo_churrasco'
  | 'petiscos';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string;
  image: string;
  description: string;
  volume: string; // ex: '350ml', '600ml', '1L', '5kg'
  
  // Regra de Venda Fracionada & Estoque Base
  baseUnit: 'LATA' | 'GARRAFA' | 'PET' | 'SACO' | 'UN';
  conversionFactor: number; // ex: 12 para fardo com 12 latas, 24 para engradado
  packName: string; // ex: "Fardo c/ 12 latas", "Caixa c/ 24"
  currentBaseStock: number; // Estoque unificado em unidades individuais
  minAlertStock: number;
  
  // Preços e Custo
  costUnit?: number; // Preço de custo de 1 unidade base
  priceUnit: number; // Preço 1 unidade natural
  pricePack: number; // Preço fardo natural (com desconto de atacado embutido)
  
  // Regra de Temperatura
  supportsCold: boolean;
  coldSurchargeUnit: number; // Acréscimo para 1 unidade gelada (ex: R$ 1,00)
  coldSurchargePack: number; // Acréscimo para fardo gelado (ex: R$ 3,00)
  
  // Regra de Vasilhames/Cascos
  isReturnable: boolean;
  vasilhameId?: string;
  vasilhameName?: string;
  vasilhameDepositPrice?: number; // Preço se o cliente comprar o casco avulso (ex: R$ 3,50)
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  presentation: PresentationOption;
  temperature: TemperatureOption;
  vasilhameOption: VasilhameOption;
  quantity: number; // quantidade de fardos ou unidades
  unitPriceCalculated: number; // Preço unitário final calculado
  coldSurchargeTotal: number;
  vasilhameFeeTotal: number;
  subtotal: number;
  unitsDeductedFromBaseStock: number; // Quantidade de unidades reais do estoque (qty * conversionFactor se fardo)
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  presentation: PresentationOption;
  temperature: TemperatureOption;
  vasilhameOption: VasilhameOption;
  quantity: number;
  unitsCount: number;
  unitPrice: number;
  coldSurcharge: number;
  vasilhameFee: number;
  subtotal: number;
  unitCost?: number;
  totalCost?: number;
}

export interface Order {
  id: string;
  orderNumber: number;
  channel: 'DELIVERY_APP' | 'BALCAO_PDV';
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    number: string;
    neighborhood: string;
    complement?: string;
  };
  items: OrderItem[];
  subtotalProducts: number;
  totalColdSurcharge: number;
  totalVasilhameFee: number;
  deliveryFee: number;
  totalAmount: number;
  totalCost?: number;
  grossProfit?: number;
  paymentMethod: PaymentMethod;
  changeFor?: number; // Troco para R$
  motoboyId?: string;
  motoboyName?: string;
  motoboyAssignedAt?: string;
  deliveredAt?: string;
  estimatedDeliveryMinutes: number;
  
  // Métricas de Vasilhames
  vasilhamesVaziosAReceber: number;
  vasilhamesNovosVendidos: number;

  // Comunicação em Tempo Real (Chat do Pedido)
  messages?: OrderMessage[];

  // Auditoria de Cancelamento (somente Dono / Balcão)
  canceledAt?: string;
  canceledBy?: string;
  cancelReason?: string;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  sender: 'CLIENTE' | 'LOJA' | 'MOTOBOY';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Motoboy {
  id: string;
  name: string;
  phone: string;
  vehiclePlate: string;
  vehicleModel: string;
  isOnline: boolean;
  activeDeliveriesCount: number;
  totalDeliveriesCompletedToday: number;
  totalCollectedCash: number;
  totalCollectedCard: number;
  totalCollectedPix: number;
  commissionBalance: number;
}

export interface VasilhameControl {
  id: string;
  name: string;
  bottleType: string;
  fullInStorage: number; // Garrafas cheias prontas para venda
  emptyInYard: number; // Cascos vazios no pátio aguardando cervejaria
  depositPrice: number; // Preço de venda/caução do vasilhame
  totalInCirculationWithCustomers: number;
}

export interface CashShift {
  id: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  initialFloat: number; // Fundo de caixa inicial colocado pelo operador
  balcaoCash: number;
  balcaoCard: number;
  balcaoPix: number;
  deliveryCash: number;
  deliveryCard: number;
  deliveryPix: number;
  closingCashInDrawer?: number; // Contagem física cega ou informada
  closingDifference?: number; // Quebra / sobra
  closingNotes?: string;
}

export interface CashShiftSoldProduct {
  productId: string;
  productName: string;
  brand: string;
  unitsSold: number;
  packsCount: number;
  singlesCount: number;
  revenue: number;
  costTotal: number;
  profitTotal: number;
}

export interface CashShiftRecord {
  id: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  initialFloat: number;
  totalBalcao: number;
  totalDelivery: number;
  totalSales: number;
  balcaoCash: number;
  balcaoCard: number;
  balcaoPix: number;
  deliveryCash: number;
  deliveryCard: number;
  deliveryPix: number;
  expectedFinalCash: number;
  finalCashInDrawer: number;
  closingDifference: number;
  totalCostOfGoods: number;
  totalGrossProfit: number;
  ordersCount: number;
  canceledOrdersCount: number;
  canceledTotalValue: number;
  soldProducts: CashShiftSoldProduct[];
  notes?: string;
}

export interface DepotSettings {
  storeName: string;
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
  cnpj: string;
  defaultDeliveryFee: number;
  minDeliveryMinutes: number;
  maxDeliveryMinutes: number;
  motoboyCommission: number;
  allowNegativeStock: boolean;
  autoPrintReceipt: boolean;
  cancelPassword: string;
  ownerWhatsApp: string;
  ownerEmail: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'ENTRADA' | 'AJUSTE' | 'PERDA' | 'VENDA';
  unitsQuantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  createdAt: string;
}

export type UserRole = 'CLIENTE' | 'DONO' | 'BALCAO' | 'MOTOBOY';

export interface UserSession {
  role: UserRole;
  name: string;
  username: string;
  motoboyId?: string;
  avatar?: string;
}

export type DeviceMode = 'MOBILE' | 'DESKTOP';

