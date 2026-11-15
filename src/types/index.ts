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
  code?: string;
  name: string;
  category: ProductCategory;
  brand: string;
  image: string;
  description: string;
  volume: string;

  // Regra de Venda Fracionada & Estoque Base
  baseUnit: 'LATA' | 'GARRAFA' | 'PET' | 'SACO' | 'UN';
  conversionFactor: number;
  packName: string;
  currentBaseStock: number;
  minAlertStock: number;

  // Preços e Custo
  costUnit?: number;
  priceUnit: number;
  pricePack: number;

  // Regra de Temperatura
  supportsCold: boolean;
  coldSurchargeUnit: number;
  coldSurchargePack: number;

  // Regra de Vasilhames/Cascos
  isReturnable: boolean;
  vasilhameId?: string;
  vasilhameName?: string;
  vasilhameDepositPrice?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  presentation: PresentationOption;
  temperature: TemperatureOption;
  vasilhameOption: VasilhameOption;
  quantity: number;
  unitPriceCalculated: number;
  coldSurchargeTotal: number;
  vasilhameFeeTotal: number;
  subtotal: number;
  unitsDeductedFromBaseStock: number;
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
  changeFor?: number;
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

  // Vínculo com usuário autenticado na nuvem
  customerUid?: string;
  customerEmail?: string;
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
  accessPassword?: string;
  googleEmail?: string;
  cloudUsername?: string;
}

export interface VasilhameControl {
  id: string;
  name: string;
  bottleType: string;
  fullInStorage: number;
  emptyInYard: number;
  depositPrice: number;
  totalInCirculationWithCustomers: number;
}

export type CashFlowType = 'RETIRADA_DESPESA' | 'SUPRIMENTO';
export type CashFlowCategory =
  | 'DESPESA_LOJA'
  | 'RETIRADA_DONO'
  | 'FORNECEDOR'
  | 'TROCO_REFORCO'
  | 'OUTROS';

export interface CashFlowMovement {
  id: string;
  shiftId: string;
  type: CashFlowType;
  category: CashFlowCategory;
  amount: number;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface CashShift {
  id: string;
  cashierName: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  initialFloat: number;
  balcaoCash: number;
  balcaoCard: number;
  balcaoPix: number;
  deliveryCash: number;
  deliveryCard: number;
  deliveryPix: number;
  closingCashInDrawer?: number;
  closingDifference?: number;
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
  totalCashInflows?: number;
  totalCashOutflows?: number;
  cashFlowMovements?: CashFlowMovement[];
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
  ownerPassword?: string;
  balcaoPassword?: string;
  motoboyDefaultPassword?: string;
  ownerWhatsApp: string;
  ownerEmail: string;
  staffEmails?: string[];
  staffUids?: string[];
}

export interface StaffAccount {
  uid: string;
  username: string;
  displayName: string;
  role: 'BALCAO' | 'MOTOBOY';
  motoboyId?: string;
  active: boolean;
  createdAt: string;
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

export type AppPageRoute =
  | { page: 'HUB' }
  | { page: 'CUSTOMER_STORE' }
  | { page: 'EMPLOYEE_PORTAL' };

export interface TableTabItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  volume: string;
  presentation: PresentationOption;
  temperature: TemperatureOption;
  vasilhameOption: VasilhameOption;
  quantity: number;
  unitsPerItem: number;
  unitPrice: number;
  coldSurchargeUnit: number;
  vasilhameFeeUnit: number;
  subtotal: number;
  addedAt: string;
}

export interface TableTab {
  id: string;
  numberOrLabel: string;
  customerName: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  items: TableTabItem[];
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  changeFor?: number;
  orderId?: string;
  orderNumber?: number;
}

