import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Product,
  CartItem,
  Order,
  OrderStatus,
  Motoboy,
  VasilhameControl,
  CashShift,
  CashShiftRecord,
  DepotSettings,
  StockMovement,
  PaymentMethod,
  PresentationOption,
  TemperatureOption,
  VasilhameOption,
  UserRole,
  UserSession,
  DeviceMode,
  CashShiftSoldProduct,
  CashFlowMovement,
  CashFlowType,
  CashFlowCategory,
  TableTab,
  TableTabItem,
  StaffAccount,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_VASILHAMES,
  INITIAL_MOTOBOYS,
  INITIAL_ORDERS,
} from '../data/mockData';
import { executeOrderCheckout, CheckoutInput } from '../services/checkoutService';
import { soundService } from '../services/soundService';
import {
  firebaseAuth,
  subscribeCloudAuth,
  signInWithGoogleForCloud,
  signOutCloudAuth,
  checkUserStaffAuthorization,
  CloudRoleStatus,
  isCurrentUserOwner,
  isSyntheticStaffEmail,
  canPerformCloudStaffWrite,
  signInStaffWithUsernameInCloud,
  createStaffAccountInCloud,
  updateStaffAccountInCloud,
  deleteStaffAccountFromCloud,
  subscribeStaffAccountsFromFirestore,
  resetStoreOwnershipInCloud,
  syncOrderStaffEmailsToCloud,
  sanitizeStaffEmails,
  testFirestoreConnection,
  subscribePublicStoreSettings,
  subscribeOwnerPrivateSettings,
  subscribeProductsFromFirestore,
  subscribeVasilhamesFromFirestore,
  subscribeMotoboysFromFirestore,
  subscribeStaffOrdersFromFirestore,
  subscribeCustomerOrdersFromFirestore,
  subscribeTablesFromFirestore,
  subscribeCashShiftsFromFirestore,
  subscribeShiftHistoryFromFirestore,
  subscribeCashFlowsFromFirestore,
  subscribeStockMovementsFromFirestore,
  syncCashFlowToFirestore,
  deleteCashFlowFromFirestore,
  syncStoreSettingsToCloud,
  syncStaffAccessListToCloud,
  syncProductToCloud,
  syncProductStockToCloud,
  deleteProductFromCloud,
  syncVasilhameCountersToCloud,
  syncMotoboyToCloud,
  deleteMotoboyFromCloud,
  syncOrderCreateToCloud,
  syncOrderUpdateToCloud,
  syncTableToCloud,
  deleteTableFromCloud,
  syncCashShiftToCloud,
  syncShiftRecordCreateToCloud,
  syncStockMovementCreateToCloud,
  uploadFullLocalStoreToCloud,
  seedCloudIfEmptyForOwner,
} from '../services/firebaseDbService';
import { parseCurrentRoute } from '../services/routeService';

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'success' | 'warning' | 'info';
  timestamp: string;
}

const DEFAULT_SETTINGS: DepotSettings = {
  storeName: 'GelaFácil Express',
  phone: '(21) 97947-4405',
  address: 'Avenida Hermínio Aurélio Sampaio, 53',
  neighborhood: 'Entrega Local',
  city: 'Rio de Janeiro - RJ',
  cnpj: '12.345.678/0001-90',
  defaultDeliveryFee: 7.00,
  minDeliveryMinutes: 15,
  maxDeliveryMinutes: 30,
  motoboyCommission: 8.00,
  allowNegativeStock: false,
  autoPrintReceipt: true,
  cancelPassword: '123',
  ownerPassword: '123',
  balcaoPassword: '123',
  motoboyDefaultPassword: '123',
  ownerWhatsApp: '5521979474405',
  ownerEmail: '',
  staffEmails: [],
};

const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

interface BeverageContextType {
  // Navigation & View
  activeView: 'PORTAL_LOGIN' | 'CUSTOMER_APP' | 'EMPLOYEE_PDV' | 'MOTOBOY_APP' | 'SYSTEM_ARCHITECTURE';
  setActiveView: (view: 'PORTAL_LOGIN' | 'CUSTOMER_APP' | 'EMPLOYEE_PDV' | 'MOTOBOY_APP' | 'SYSTEM_ARCHITECTURE') => void;
  customerMobileFrame: boolean;
  setCustomerMobileFrame: (val: boolean) => void;
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  toggleDeviceMode: () => void;

  // Auth & Permissions
  currentUser: UserSession | null;
  loginAsCustomer: (mode?: DeviceMode) => void;
  loginAsEmployee: (username: string, password: string, specificMotoboyId?: string) => { success: boolean; message?: string };
  loginAsQuickRole: (role: UserRole, motoboyId?: string) => void;
  logout: () => void;
  
  // Real-time Data
  products: Product[];
  vasilhames: VasilhameControl[];
  orders: Order[];
  motoboys: Motoboy[];
  cashShift: CashShift;
  shiftHistory: CashShiftRecord[];
  cashFlows: CashFlowMovement[];
  settings: DepotSettings;
  stockMovements: StockMovement[];
  
  // Customer Cart
  cart: CartItem[];
  addToCart: (
    product: Product,
    presentation: PresentationOption,
    temperature: TemperatureOption,
    vasilhameOption: VasilhameOption,
    quantity: number
  ) => { success: boolean; message?: string };
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  cartTotalAmount: number;
  cartTotalItemsCount: number;
  
  // Checkout & Order Life Cycle
  submitCustomerCheckout: (input: Omit<CheckoutInput, 'items' | 'channel'>) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  submitBalcaoCheckout: (items: CartItem[], paymentMethod: PaymentMethod, changeFor?: number, customerName?: string) => Promise<{ success: boolean; error?: string }>;
  
  // PDV / KDS Operations
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, motoboyId?: string) => void;
  cancelOrder: (orderId: string, password: string, reason?: string) => { success: boolean; message?: string };
  assignMotoboyToOrder: (orderId: string, motoboyId: string) => void;
  settleMotoboyShift: (motoboyId: string) => { success: boolean; totalCollected: number; receipts: string };
  restockProductStock: (productId: string, additionalUnits: number) => void;
  receiveEmptyVasilhames: (vasilhameId: string, quantity: number) => void;
  
  // Comunicação em Tempo Real (Chat do Pedido & Contato com Motoboy)
  sendOrderMessage: (orderId: string, sender: 'CLIENTE' | 'LOJA' | 'MOTOBOY', senderName: string, text: string) => void;
  notifyCustomerArrival: (orderId: string) => void;
  
  // Motoboy Management (CRUD)
  addMotoboy: (motoboyData: {
    name: string;
    phone: string;
    vehiclePlate: string;
    vehicleModel: string;
    isOnline?: boolean;
    accessPassword?: string;
    googleEmail?: string;
  }) => Motoboy;
  updateMotoboy: (id: string, updated: Partial<Motoboy>) => void;
  deleteMotoboy: (id: string) => void;
  toggleMotoboyOnline: (id: string) => void;
  
  // Caixa & Fluxo de Caixa (Abrir, Fechar, Limpar, Retiradas/Despesas, Suprimentos)
  openCashShift: (initialFloat: number, cashierName: string) => void;
  closeCashShift: (countedCash: number, notes?: string) => CashShiftRecord;
  cleanCashShift: () => void;
  addCashFlowMovement: (params: {
    type: CashFlowType;
    category: CashFlowCategory;
    amount: number;
    description: string;
  }) => { success: boolean; message?: string };
  removeCashFlowMovement: (flowId: string) => void;
  
  // Product & Stock Management (CRUD)
  addProduct: (productData: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, updated: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (
    productId: string,
    quantity: number,
    mode: 'ABSOLUTE' | 'DELTA',
    reason: string,
    type: 'ENTRADA' | 'AJUSTE' | 'PERDA'
  ) => void;
  
  // Settings Management
  updateSettings: (newSettings: Partial<DepotSettings>) => void;
  
  // Sound & Notifications
  soundEnabled: boolean;
  toggleSound: () => void;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  
  // Mesas / Comandas do Balcão
  tables: TableTab[];
  openTable: (label: string, customerName?: string) => { success: boolean; table?: TableTab; error?: string };
  addProductToTable: (
    tableId: string,
    product: Product,
    presentation: PresentationOption,
    temperature: TemperatureOption,
    vasilhameOption: VasilhameOption
  ) => { success: boolean; error?: string };
  updateTableItemQty: (tableId: string, itemId: string, delta: number) => { success: boolean; error?: string };
  removeTableItem: (tableId: string, itemId: string) => void;
  renameTableCustomer: (tableId: string, customerName: string) => void;
  closeTableCheckout: (
    tableId: string,
    paymentMethod: PaymentMethod,
    changeFor?: number
  ) => Promise<{ success: boolean; order?: Order; table?: TableTab; error?: string }>;
  cancelOpenTable: (tableId: string) => void;

  // Utility
  resetAllData: () => void;
  lastCreatedOrderId: string | null;

  // Cloud Sync (Firestore + Google Auth + Staff Username/Password)
  cloudUser: { uid: string; email: string; displayName: string; emailVerified: boolean } | null;
  cloudAuthReady: boolean;
  cloudRoleStatus: CloudRoleStatus;
  cloudSyncing: boolean;
  cloudSyncError: string | null;
  staffAccounts: StaffAccount[];
  connectCloudGoogle: () => Promise<{ success: boolean; error?: string }>;
  disconnectCloudGoogle: () => Promise<void>;
  releaseCloudStoreOwnership: () => Promise<{ success: boolean; error?: string }>;
  syncAllLocalToCloudNow: () => Promise<{ success: boolean; uploadedCount?: number; error?: string }>;
  loginWithCloudUsername: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  createCloudStaffUser: (params: {
    username: string;
    displayName: string;
    password: string;
    role: 'BALCAO' | 'MOTOBOY';
    motoboyId?: string;
  }) => Promise<{ success: boolean; account?: StaffAccount; error?: string }>;
  toggleCloudStaffUserActive: (uid: string, active: boolean) => Promise<void>;
  deleteCloudStaffUser: (uid: string) => Promise<void>;
}

const BeverageContext = createContext<BeverageContextType | undefined>(undefined);

interface PersistedTenantStoreState {
  products: Product[];
  vasilhames: VasilhameControl[];
  orders: Order[];
  motoboys: Motoboy[];
  cashShift: CashShift;
  shiftHistory: CashShiftRecord[];
  cashFlows: CashFlowMovement[];
  tables?: TableTab[];
  settings: DepotSettings;
  stockMovements: StockMovement[];
  updatedAt: number;
  senderId?: string;
}

const DEFAULT_CASH_SHIFT: CashShift = {
  id: 'SHIFT-EMPTY',
  cashierName: 'Caixa Fechado',
  status: 'CLOSED',
  openedAt: new Date().toISOString(),
  closedAt: new Date().toISOString(),
  initialFloat: 0,
  balcaoCash: 0,
  balcaoCard: 0,
  balcaoPix: 0,
  deliveryCash: 0,
  deliveryCard: 0,
  deliveryPix: 0,
};

const TAB_SENDER_ID = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const STORE_STORAGE_KEY = 'deposito_store_state_catalog_v5';
const PREV_V4_STORAGE_KEY = 'deposito_store_state_catalog_v4';
const PREV_V3_STORAGE_KEY = 'deposito_store_state_catalog_v3';
const PREV_STORE_STORAGE_KEY = 'deposito_store_state_catalog_v2';
const LEGACY_STORE_STORAGE_KEY = 'deposito_store_state_clean_v1';
const STORE_CHANNEL_NAME = 'deposito_store_sync_catalog_v5';
const SESSION_STORAGE_KEY = 'deposito_active_session_v1';

const safeNum = (val: unknown, fallback = 0): number =>
  typeof val === 'number' && Number.isFinite(val) ? val : fallback;

function sanitizeCashShift(raw?: Partial<CashShift>): CashShift {
  const base = { ...DEFAULT_CASH_SHIFT, ...raw };
  return {
    ...base,
    initialFloat: safeNum(base.initialFloat, 0),
    balcaoCash: safeNum(base.balcaoCash, 0),
    balcaoCard: safeNum(base.balcaoCard, 0),
    balcaoPix: safeNum(base.balcaoPix, 0),
    deliveryCash: safeNum(base.deliveryCash, 0),
    deliveryCard: safeNum(base.deliveryCard, 0),
    deliveryPix: safeNum(base.deliveryPix, 0),
    closingCashInDrawer:
      base.closingCashInDrawer !== undefined ? safeNum(base.closingCashInDrawer, 0) : undefined,
    closingDifference:
      base.closingDifference !== undefined ? safeNum(base.closingDifference, 0) : undefined,
  };
}

function sanitizeShiftHistory(raw?: CashShiftRecord[]): CashShiftRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((rec) => ({
    ...rec,
    initialFloat: safeNum(rec.initialFloat, 0),
    totalBalcao: safeNum(rec.totalBalcao, 0),
    totalDelivery: safeNum(rec.totalDelivery, 0),
    totalSales: safeNum(rec.totalSales, 0),
    balcaoCash: safeNum(rec.balcaoCash, 0),
    balcaoCard: safeNum(rec.balcaoCard, 0),
    balcaoPix: safeNum(rec.balcaoPix, 0),
    deliveryCash: safeNum(rec.deliveryCash, 0),
    deliveryCard: safeNum(rec.deliveryCard, 0),
    deliveryPix: safeNum(rec.deliveryPix, 0),
    totalCashInflows: safeNum(rec.totalCashInflows, 0),
    totalCashOutflows: safeNum(rec.totalCashOutflows, 0),
    expectedFinalCash: safeNum(rec.expectedFinalCash, 0),
    finalCashInDrawer: safeNum(rec.finalCashInDrawer, 0),
    closingDifference: safeNum(rec.closingDifference, 0),
    totalCostOfGoods: safeNum(rec.totalCostOfGoods, 0),
    totalGrossProfit: safeNum(rec.totalGrossProfit, 0),
    ordersCount: safeNum(rec.ordersCount, 0),
    canceledOrdersCount: safeNum(rec.canceledOrdersCount, 0),
    canceledTotalValue: safeNum(rec.canceledTotalValue, 0),
    soldProducts: Array.isArray(rec.soldProducts) ? rec.soldProducts : [],
  }));
}

function normalizeLoadedSettings(rawSettings?: Partial<DepotSettings>): DepotSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    phone:
      !rawSettings?.phone || rawSettings.phone === '(11) 98765-4321'
        ? '(21) 97947-4405'
        : rawSettings.phone,
    address:
      !rawSettings?.address ||
      rawSettings.address === 'Av. das Bebidas, 1500' ||
      rawSettings.address === 'Rua Principal, 100'
        ? 'Avenida Hermínio Aurélio Sampaio, 53'
        : rawSettings.address,
    neighborhood:
      !rawSettings?.neighborhood || rawSettings.neighborhood === 'Centro Comercial'
        ? 'Entrega Local'
        : rawSettings.neighborhood,
    city:
      !rawSettings?.city || rawSettings.city === 'São Paulo - SP'
        ? 'Rio de Janeiro - RJ'
        : rawSettings.city,
    ownerWhatsApp:
      !rawSettings?.ownerWhatsApp || rawSettings.ownerWhatsApp === '5521960185101'
        ? '5521979474405'
        : rawSettings.ownerWhatsApp,
  };
}

function stripAutoGeneratedProductImages(savedProducts: Product[]): Product[] {
  return savedProducts.map((p) => {
    const isCustomImage =
      typeof p.image === 'string' &&
      (p.image.startsWith('data:image/') || p.image.startsWith('http://') || p.image.startsWith('https://'));
    return isCustomImage ? p : { ...p, image: '' };
  });
}

function loadStoreState(): PersistedTenantStoreState {
  try {
    const raw = localStorage.getItem(STORE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedTenantStoreState;
      if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.orders)) {
        return {
          ...parsed,
          motoboys: Array.isArray(parsed.motoboys) ? parsed.motoboys : INITIAL_MOTOBOYS,
          cashShift: sanitizeCashShift(parsed.cashShift),
          shiftHistory: sanitizeShiftHistory(parsed.shiftHistory),
          cashFlows: Array.isArray(parsed.cashFlows) ? parsed.cashFlows : [],
          tables: Array.isArray(parsed.tables) ? parsed.tables : [],
          settings: normalizeLoadedSettings(parsed.settings),
        };
      }
    }

    const prevV4Raw = localStorage.getItem(PREV_V4_STORAGE_KEY);
    if (prevV4Raw) {
      const prevV4 = JSON.parse(prevV4Raw) as PersistedTenantStoreState;
      if (prevV4 && Array.isArray(prevV4.products) && Array.isArray(prevV4.orders)) {
        try {
          localStorage.removeItem(PREV_V3_STORAGE_KEY);
          localStorage.removeItem(PREV_STORE_STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORE_STORAGE_KEY);
        } catch {
          // ignore
        }
        return {
          ...prevV4,
          products: stripAutoGeneratedProductImages(prevV4.products),
          motoboys: Array.isArray(prevV4.motoboys) ? prevV4.motoboys : INITIAL_MOTOBOYS,
          cashFlows: Array.isArray(prevV4.cashFlows) ? prevV4.cashFlows : [],
          tables: Array.isArray(prevV4.tables) ? prevV4.tables : [],
          settings: normalizeLoadedSettings(prevV4.settings),
          updatedAt: Date.now(),
        };
      }
    }

    const prevV3Raw = localStorage.getItem(PREV_V3_STORAGE_KEY);
    if (prevV3Raw) {
      const prevV3 = JSON.parse(prevV3Raw) as PersistedTenantStoreState;
      if (prevV3 && Array.isArray(prevV3.products) && Array.isArray(prevV3.orders)) {
        return {
          ...prevV3,
          products: stripAutoGeneratedProductImages(prevV3.products),
          motoboys: Array.isArray(prevV3.motoboys) ? prevV3.motoboys : INITIAL_MOTOBOYS,
          cashFlows: Array.isArray(prevV3.cashFlows) ? prevV3.cashFlows : [],
          tables: Array.isArray(prevV3.tables) ? prevV3.tables : [],
          settings: normalizeLoadedSettings(prevV3.settings),
          updatedAt: Date.now(),
        };
      }
    }

    const prevRaw = localStorage.getItem(PREV_STORE_STORAGE_KEY);
    if (prevRaw) {
      const prev = JSON.parse(prevRaw) as PersistedTenantStoreState;
      if (prev && Array.isArray(prev.products) && Array.isArray(prev.orders)) {
        return {
          ...prev,
          products: stripAutoGeneratedProductImages(prev.products),
          motoboys: Array.isArray(prev.motoboys) ? prev.motoboys : INITIAL_MOTOBOYS,
          cashFlows: Array.isArray(prev.cashFlows) ? prev.cashFlows : [],
          tables: Array.isArray(prev.tables) ? prev.tables : [],
          settings: normalizeLoadedSettings(prev.settings),
          updatedAt: Date.now(),
        };
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORE_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as PersistedTenantStoreState;
      if (legacy && Array.isArray(legacy.orders)) {
        return {
          ...legacy,
          products: INITIAL_PRODUCTS,
          motoboys: Array.isArray(legacy.motoboys) ? legacy.motoboys : INITIAL_MOTOBOYS,
          cashFlows: Array.isArray(legacy.cashFlows) ? legacy.cashFlows : [],
          tables: [],
          settings: normalizeLoadedSettings(legacy.settings),
          updatedAt: Date.now(),
        };
      }
    }
  } catch {
    // fallback to initial state
  }
  return {
    products: INITIAL_PRODUCTS,
    vasilhames: INITIAL_VASILHAMES,
    orders: INITIAL_ORDERS,
    motoboys: INITIAL_MOTOBOYS,
    cashShift: DEFAULT_CASH_SHIFT,
    shiftHistory: [],
    cashFlows: [],
    tables: [],
    settings: DEFAULT_SETTINGS,
    stockMovements: INITIAL_STOCK_MOVEMENTS,
    updatedAt: Date.now(),
  };
}

export const BeverageProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const initialStore = loadStoreState();

  const initialSession = (() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          user?: UserSession | null;
          activeView?: 'PORTAL_LOGIN' | 'CUSTOMER_APP' | 'EMPLOYEE_PDV' | 'MOTOBOY_APP' | 'SYSTEM_ARCHITECTURE';
        };
        if (parsed?.user && parsed?.activeView) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  })();

  const [activeView, setActiveView] = useState<
    'PORTAL_LOGIN' | 'CUSTOMER_APP' | 'EMPLOYEE_PDV' | 'MOTOBOY_APP' | 'SYSTEM_ARCHITECTURE'
  >(initialSession?.activeView || 'PORTAL_LOGIN');
  const [customerMobileFrame, setCustomerMobileFrame] = useState(false);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('DESKTOP');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(initialSession?.user || null);

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ user: currentUser, activeView })
        );
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser, activeView]);

  const [products, setProducts] = useState<Product[]>(initialStore.products);
  const [vasilhames, setVasilhames] = useState<VasilhameControl[]>(initialStore.vasilhames);
  const [orders, setOrders] = useState<Order[]>(initialStore.orders);
  const [motoboys, setMotoboys] = useState<Motoboy[]>(initialStore.motoboys);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(null);

  const [settings, setSettings] = useState<DepotSettings>(initialStore.settings);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(initialStore.stockMovements);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const [cashShift, setCashShift] = useState<CashShift>(initialStore.cashShift);
  const [shiftHistory, setShiftHistory] = useState<CashShiftRecord[]>(initialStore.shiftHistory);
  const [cashFlows, setCashFlows] = useState<CashFlowMovement[]>(initialStore.cashFlows);
  const [tables, setTables] = useState<TableTab[]>(Array.isArray(initialStore.tables) ? initialStore.tables : []);

  const [cloudUser, setCloudUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    emailVerified: boolean;
  } | null>(null);
  const [cloudAuthReady, setCloudAuthReady] = useState(false);
  const [cloudRoleStatus, setCloudRoleStatus] = useState<CloudRoleStatus>({
    isOwner: false,
    isAuthorizedStaff: false,
    storeClaimed: false,
  });
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);

  const isRemoteApplyingRef = useRef(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isInitialPersistRef = useRef(true);
  const lastSyncedAtRef = useRef<number>(initialStore.updatedAt || 0);
  const knownOrderIdsRef = useRef<Set<string>>(new Set(initialStore.orders.map((o) => o.id)));
  const initialOrdersLoadedRef = useRef(false);
  const fannedOutOrderStaffRef = useRef<Map<string, string>>(new Map());

  const latestBundleRef = useRef({
    products,
    vasilhames,
    motoboys,
    orders,
    tables,
    cashShift,
    shiftHistory,
    cashFlows,
    settings,
  });
  latestBundleRef.current = {
    products,
    vasilhames,
    motoboys,
    orders,
    tables,
    cashShift,
    shiftHistory,
    cashFlows,
    settings,
  };

  // Helper seguro para disparo assíncrono na nuvem sem travar a UI local
  const runCloudTask = (task: () => Promise<void>) => {
    if (!canPerformCloudStaffWrite()) return;
    void task().catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      setCloudSyncError(msg);
    });
  };

  const connectCloudGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setCloudSyncing(true);
    setCloudSyncError(null);
    try {
      const user = await signInWithGoogleForCloud();
      const isEmployeeRoute = parseCurrentRoute().page === 'EMPLOYEE_PORTAL';
      const roleStatus = await checkUserStaffAuthorization(user, {
        autoClaimIfUnclaimed: isEmployeeRoute,
        bundleForClaim: latestBundleRef.current,
      });
      setCloudRoleStatus(roleStatus);
      if (roleStatus.isOwner && user.email) {
        const cleanEmail = user.email.trim().toLowerCase();
        setSettings((prev) => (prev.ownerEmail?.trim() ? prev : { ...prev, ownerEmail: cleanEmail }));
      }
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível conectar com o Google.';
      setCloudSyncError(msg);
      return { success: false, error: msg };
    } finally {
      setCloudSyncing(false);
    }
  };

  const disconnectCloudGoogle = async (): Promise<void> => {
    await signOutCloudAuth();
    setCloudRoleStatus({ isOwner: false, isAuthorizedStaff: false, storeClaimed: cloudRoleStatus.storeClaimed });
  };

  const releaseCloudStoreOwnership = async (): Promise<{ success: boolean; error?: string }> => {
    setCloudSyncing(true);
    setCloudSyncError(null);
    try {
      await resetStoreOwnershipInCloud();
      setCloudRoleStatus({ isOwner: false, isAuthorizedStaff: false, storeClaimed: false });
      setSettings((prev) => ({ ...prev, ownerEmail: '' }));
      addToast(
        'Loja Liberada na Nuvem',
        'Outro e-mail Google já pode conectar no painel da equipe para assumir como Dono.',
        'info'
      );
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível liberar a loja na nuvem.';
      setCloudSyncError(msg);
      return { success: false, error: msg };
    } finally {
      setCloudSyncing(false);
    }
  };

  const syncAllLocalToCloudNow = async (): Promise<{
    success: boolean;
    uploadedCount?: number;
    error?: string;
  }> => {
    setCloudSyncing(true);
    setCloudSyncError(null);
    try {
      const res = await uploadFullLocalStoreToCloud(latestBundleRef.current);
      addToast(
        'Nuvem Atualizada!',
        `${res.uploadedCount} registros sincronizados com PC, Motoboys e App Cliente.`,
        'success'
      );
      return { success: true, uploadedCount: res.uploadedCount };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar dados para a nuvem.';
      setCloudSyncError(msg);
      return { success: false, error: msg };
    } finally {
      setCloudSyncing(false);
    }
  };

  const loginWithCloudUsername = async (
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    setCloudSyncing(true);
    setCloudSyncError(null);
    try {
      const { user, account } = await signInStaffWithUsernameInCloud(usernameInput, passwordInput);
      const roleStatus: CloudRoleStatus = {
        isOwner: false,
        isAuthorizedStaff: true,
        role: account.role,
        storeClaimed: true,
        staffUid: user.uid,
        staffUsername: account.username,
        staffDisplayName: account.displayName,
        motoboyId: account.motoboyId,
      };
      setCloudRoleStatus(roleStatus);
      setCurrentUser({
        role: account.role,
        name: account.displayName || account.username,
        username: account.username,
        motoboyId: account.motoboyId,
      });
      setActiveView(account.role === 'MOTOBOY' ? 'MOTOBOY_APP' : 'EMPLOYEE_PDV');
      addToast(
        `Olá, ${account.displayName}!`,
        account.role === 'MOTOBOY'
          ? 'Conectado na nuvem como Entregador / Motoboy.'
          : 'Conectado na nuvem no Balcão / PDV em tempo real.',
        'success'
      );
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível entrar na nuvem.';
      if (msg === 'AUTH_EMAIL_PASSWORD_DISABLED') {
        return {
          success: false,
          error: 'AUTH_EMAIL_PASSWORD_DISABLED',
          message:
            'O login por Usuário/Senha ainda não foi ativado pelo Dono no Firebase Console (Authentication → Sign-in method → E-mail/senha).',
        };
      }
      return { success: false, message: msg };
    } finally {
      setCloudSyncing(false);
    }
  };

  const createCloudStaffUser = async (params: {
    username: string;
    displayName: string;
    password: string;
    role: 'BALCAO' | 'MOTOBOY';
    motoboyId?: string;
  }): Promise<{ success: boolean; account?: StaffAccount; error?: string }> => {
    setCloudSyncing(true);
    setCloudSyncError(null);
    try {
      const account = await createStaffAccountInCloud(params);
      setStaffAccounts((prev) => {
        const filtered = prev.filter((a) => a.uid !== account.uid);
        return [...filtered, account].sort((a, b) => a.username.localeCompare(b.username, 'pt-BR'));
      });
      addToast(
        'Usuário Criado na Nuvem!',
        `Login "@${account.username}" (${account.role === 'MOTOBOY' ? 'Motoboy' : 'Balcão'}) pronto para usar em qualquer aparelho.`,
        'success'
      );
      return { success: true, account };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário na nuvem.';
      setCloudSyncError(msg);
      return { success: false, error: msg };
    } finally {
      setCloudSyncing(false);
    }
  };

  const toggleCloudStaffUserActive = async (uid: string, active: boolean): Promise<void> => {
    try {
      await updateStaffAccountInCloud(uid, { active });
      addToast(
        active ? 'Usuário Reativado' : 'Usuário Bloqueado',
        active
          ? 'O acesso em tempo real na nuvem foi liberado novamente.'
          : 'O usuário foi bloqueado e não sincronizará mais na nuvem.',
        active ? 'success' : 'warning'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar usuário.';
      setCloudSyncError(msg);
    }
  };

  const deleteCloudStaffUser = async (uid: string): Promise<void> => {
    try {
      await deleteStaffAccountFromCloud(uid);
      setStaffAccounts((prev) => prev.filter((a) => a.uid !== uid));
      addToast('Usuário Removido', 'A conta da equipe foi removida da nuvem.', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover usuário.';
      setCloudSyncError(msg);
    }
  };

  // Monitora autenticação Google/Usuário Firebase e verifica permissão na loja
  useEffect(() => {
    void testFirestoreConnection();
    const unsub = subscribeCloudAuth((user) => {
      if (user) {
        setCloudUser({
          uid: user.uid,
          email: (user.email || '').toLowerCase(),
          displayName: user.displayName || user.email || 'Usuário da Loja',
          emailVerified: user.emailVerified,
        });
        const isEmployeeRoute = parseCurrentRoute().page === 'EMPLOYEE_PORTAL';
        void checkUserStaffAuthorization(user, {
          autoClaimIfUnclaimed: isEmployeeRoute,
          bundleForClaim: latestBundleRef.current,
        })
          .then((status) => {
            setCloudRoleStatus(status);
            if (status.isOwner && user.email) {
              const cleanEmail = user.email.trim().toLowerCase();
              setSettings((prev) =>
                prev.ownerEmail?.trim() ? prev : { ...prev, ownerEmail: cleanEmail }
              );
            }
            if (
              isEmployeeRoute &&
              isSyntheticStaffEmail(user.email) &&
              status.isAuthorizedStaff &&
              status.role
            ) {
              setCurrentUser((prev) => {
                if (prev && prev.username === status.staffUsername) return prev;
                return {
                  role: status.role!,
                  name: status.staffDisplayName || status.staffUsername || 'Equipe',
                  username: status.staffUsername || 'equipe',
                  motoboyId: status.motoboyId,
                };
              });
              setActiveView(status.role === 'MOTOBOY' ? 'MOTOBOY_APP' : 'EMPLOYEE_PDV');
            }
            setCloudAuthReady(true);
          })
          .catch((err) => {
            const msg = err instanceof Error ? err.message : String(err);
            setCloudSyncError(msg);
            setCloudAuthReady(true);
          });
      } else {
        setCloudUser(null);
        setCloudRoleStatus({ isOwner: false, isAuthorizedStaff: false, storeClaimed: false });
        setStaffAccounts([]);
        setCloudAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Listeners PÚBLICOS (Catálogo, Vasilhames e Dados da Loja) — ativos sempre sem login
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    try {
      unsubs.push(
        subscribePublicStoreSettings((partial) => {
          setSettings((prev) => ({ ...prev, ...partial }));
        })
      );
      unsubs.push(
        subscribeProductsFromFirestore((remoteProducts) => {
          if (remoteProducts.length > 0) {
            setProducts(remoteProducts);
          }
        })
      );
      unsubs.push(
        subscribeVasilhamesFromFirestore((remoteVasilhames) => {
          if (remoteVasilhames.length > 0) {
            setVasilhames(remoteVasilhames);
          }
        })
      );
    } catch {
      // fallback local
    }
    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);

  // Listeners AUTENTICADOS (Equipe no PDV/Motoboy OU Pedidos do Cliente no App)
  useEffect(() => {
    const hasCloudSession = Boolean(cloudUser?.emailVerified || isSyntheticStaffEmail(cloudUser?.email));
    if (!cloudAuthReady || !hasCloudSession) return;

    const currentRoute = parseCurrentRoute();
    const unsubs: Array<() => void> = [];
    const isStaff = cloudRoleStatus.isOwner || cloudRoleStatus.isAuthorizedStaff;

    if (currentRoute.page === 'CUSTOMER_STORE' || !isStaff) {
      unsubs.push(
        subscribeCustomerOrdersFromFirestore((customerOrders) => {
          if (customerOrders.length === 0) return;
          setOrders((prev) => {
            const byId = new Map(prev.map((o) => [o.id, o]));
            customerOrders.forEach((co) => byId.set(co.id, co));
            return Array.from(byId.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          });
        })
      );
    }

    if (isStaff && currentRoute.page === 'EMPLOYEE_PORTAL') {
      if (cloudRoleStatus.isOwner) {
        void seedCloudIfEmptyForOwner(latestBundleRef.current).catch(() => {
          // ignore
        });
        unsubs.push(
          subscribeOwnerPrivateSettings((remoteSettings) => {
            setSettings((prev) => ({ ...prev, ...remoteSettings }));
          })
        );
        unsubs.push(
          subscribeStaffAccountsFromFirestore((remoteAccounts) => {
            setStaffAccounts(remoteAccounts);
          })
        );
      }

      unsubs.push(
        subscribeMotoboysFromFirestore((remoteMotoboys) => {
          if (remoteMotoboys.length > 0) {
            setMotoboys(remoteMotoboys);
          }
        })
      );

      unsubs.push(
        subscribeStaffOrdersFromFirestore((remoteOrders) => {
          if (initialOrdersLoadedRef.current) {
            const newIncoming = remoteOrders.filter(
              (o) => !knownOrderIdsRef.current.has(o.id) && o.status === 'PENDENTE'
            );
            if (newIncoming.length > 0) {
              soundService.playNewOrderChime();
              newIncoming.forEach((o) => {
                addToast(
                  '🚨 NOVO PEDIDO NA NUVEM!',
                  `Pedido #${o.orderNumber} de ${o.customer.name} — R$ ${o.totalAmount.toFixed(2)}`,
                  'order'
                );
              });
            }
          }
          knownOrderIdsRef.current = new Set(remoteOrders.map((o) => o.id));
          initialOrdersLoadedRef.current = true;
          if (remoteOrders.length > 0) {
            setOrders(remoteOrders);
          }

          if (cloudRoleStatus.isOwner) {
            const currentStaff = sanitizeStaffEmails(latestBundleRef.current.settings.staffEmails);
            if (currentStaff.length > 0) {
              const staffKey = currentStaff.join(',');
              remoteOrders
                .filter((o) => o.status !== 'ENTREGUE' && o.status !== 'CANCELADO')
                .forEach((o) => {
                  if (fannedOutOrderStaffRef.current.get(o.id) !== staffKey) {
                    fannedOutOrderStaffRef.current.set(o.id, staffKey);
                    void syncOrderStaffEmailsToCloud(o.id, currentStaff);
                  }
                });
            }
          }
        })
      );

      unsubs.push(
        subscribeTablesFromFirestore((remoteTables) => {
          setTables(remoteTables);
        })
      );

      unsubs.push(
        subscribeCashShiftsFromFirestore((remoteShift) => {
          if (remoteShift) {
            setCashShift(sanitizeCashShift(remoteShift));
          }
        })
      );

      unsubs.push(
        subscribeShiftHistoryFromFirestore((remoteHistory) => {
          if (remoteHistory.length > 0) {
            setShiftHistory(sanitizeShiftHistory(remoteHistory));
          }
        })
      );

      unsubs.push(
        subscribeCashFlowsFromFirestore((remoteFlows) => {
          setCashFlows(remoteFlows);
        })
      );

      unsubs.push(
        subscribeStockMovementsFromFirestore((remoteMovs) => {
          if (remoteMovs.length > 0) {
            setStockMovements(remoteMovs);
          }
        })
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [cloudAuthReady, cloudUser?.uid, cloudUser?.email, cloudUser?.emailVerified, cloudRoleStatus.isOwner, cloudRoleStatus.isAuthorizedStaff]);

  // Persist & Broadcast store state across separated pages/tabs (/loja <-> /equipe)
  useEffect(() => {
    if (isRemoteApplyingRef.current) {
      isRemoteApplyingRef.current = false;
      return;
    }

    const nowTs = Date.now();
    lastSyncedAtRef.current = nowTs;
    const payload: PersistedTenantStoreState = {
      products,
      vasilhames,
      orders,
      motoboys,
      cashShift,
      shiftHistory,
      cashFlows,
      tables,
      settings,
      stockMovements,
      updatedAt: nowTs,
      senderId: TAB_SENDER_ID,
    };
    try {
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota errors
    }

    if (isInitialPersistRef.current) {
      isInitialPersistRef.current = false;
      return;
    }

    try {
      broadcastChannelRef.current?.postMessage(payload);
    } catch {
      // ignore BroadcastChannel errors
    }
  }, [
    products,
    vasilhames,
    orders,
    motoboys,
    cashShift,
    shiftHistory,
    cashFlows,
    tables,
    settings,
    stockMovements,
  ]);

  // Listen to real-time updates from other tabs (/loja <-> /equipe)
  useEffect(() => {
    const applyRemotePayload = (remote: PersistedTenantStoreState) => {
      if (!remote || remote.senderId === TAB_SENDER_ID) return;
      if (typeof remote.updatedAt === 'number' && remote.updatedAt < lastSyncedAtRef.current) return;
      if (typeof remote.updatedAt === 'number') {
        lastSyncedAtRef.current = remote.updatedAt;
      }
      isRemoteApplyingRef.current = true;
      if (Array.isArray(remote.products)) setProducts(remote.products);
      if (Array.isArray(remote.vasilhames)) setVasilhames(remote.vasilhames);
      if (Array.isArray(remote.orders)) {
        setOrders((prevOrders) => {
          if (remote.orders.length > prevOrders.length) {
            soundService.playNewOrderChime();
          }
          return remote.orders;
        });
      }
      if (Array.isArray(remote.motoboys)) setMotoboys(remote.motoboys);
      if (remote.cashShift) setCashShift(remote.cashShift);
      if (Array.isArray(remote.shiftHistory)) setShiftHistory(remote.shiftHistory);
      if (Array.isArray(remote.cashFlows)) setCashFlows(remote.cashFlows);
      if (Array.isArray(remote.tables)) setTables(remote.tables);
      if (remote.settings) setSettings(remote.settings);
      if (Array.isArray(remote.stockMovements)) setStockMovements(remote.stockMovements);
    };

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORE_STORAGE_KEY && ev.newValue) {
        try {
          applyRemotePayload(JSON.parse(ev.newValue) as PersistedTenantStoreState);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(STORE_CHANNEL_NAME);
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        if (event.data) {
          applyRemotePayload(event.data as PersistedTenantStoreState);
        }
      };
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      if (broadcastChannelRef.current === channel) {
        broadcastChannelRef.current = null;
      }
      channel?.close();
    };
  }, []);

  const addToast = (title: string, message: string, type: 'order' | 'success' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = { id, title, message, type, timestamp: new Date().toLocaleTimeString() };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleSound = () => {
    const next = soundService.toggleSound();
    setSoundEnabled(next);
  };

  // Cart Calculations
  const cartTotalAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const cartTotalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (
    product: Product,
    presentation: PresentationOption,
    temperature: TemperatureOption,
    vasilhameOption: VasilhameOption,
    quantity: number
  ) => {
    if (quantity <= 0) return { success: false, message: 'Quantidade deve ser maior que 0' };

    const unitsPerItem = presentation === 'FARDO' ? product.conversionFactor : 1;
    const requiredUnits = quantity * unitsPerItem;

    const existingIndex = cart.findIndex(
      (c) =>
        c.productId === product.id &&
        c.presentation === presentation &&
        c.temperature === temperature &&
        c.vasilhameOption === vasilhameOption
    );

    const alreadyInCartUnits = cart
      .filter((c) => c.productId === product.id)
      .reduce((sum, c) => sum + c.unitsDeductedFromBaseStock, 0);

    if (!settings.allowNegativeStock && product.currentBaseStock < alreadyInCartUnits + requiredUnits) {
      return {
        success: false,
        message: `Estoque insuficiente! Disponível: ${product.currentBaseStock} un. Já no carrinho: ${alreadyInCartUnits} un.`,
      };
    }

    const basePrice = presentation === 'FARDO' ? product.pricePack : product.priceUnit;
    const coldSurcharge =
      temperature === 'GELADA'
        ? presentation === 'FARDO'
          ? product.coldSurchargePack
          : product.coldSurchargeUnit
        : 0;

    let vasilhameFee = 0;
    if (product.isReturnable && vasilhameOption === 'COMPRAR_CASCO') {
      vasilhameFee = (product.vasilhameDepositPrice || 3.5) * unitsPerItem;
    }

    const calculatedUnitPrice = basePrice + coldSurcharge + vasilhameFee;
    const subtotal = calculatedUnitPrice * quantity;

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const prev = updatedCart[existingIndex];
      const newQty = prev.quantity + quantity;
      updatedCart[existingIndex] = {
        ...prev,
        quantity: newQty,
        coldSurchargeTotal: coldSurcharge * newQty,
        vasilhameFeeTotal: vasilhameFee * newQty,
        subtotal: calculatedUnitPrice * newQty,
        unitsDeductedFromBaseStock: newQty * unitsPerItem,
      };
      setCart(updatedCart);
    } else {
      const newItem: CartItem = {
        id: `cart-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        product,
        presentation,
        temperature,
        vasilhameOption,
        quantity,
        unitPriceCalculated: calculatedUnitPrice,
        coldSurchargeTotal: coldSurcharge * quantity,
        vasilhameFeeTotal: vasilhameFee * quantity,
        subtotal,
        unitsDeductedFromBaseStock: requiredUnits,
      };
      setCart((prev) => [...prev, newItem]);
    }

    addToast('Item adicionado', `${quantity}x ${product.name} (${presentation})`, 'success');
    return { success: true };
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    const item = cart.find((i) => i.id === cartItemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    const unitsPerItem = item.presentation === 'FARDO' ? item.product.conversionFactor : 1;
    const newTotalUnitsNeeded = newQty * unitsPerItem;

    const otherUnitsInCart = cart
      .filter((c) => c.productId === item.productId && c.id !== cartItemId)
      .reduce((sum, c) => sum + c.unitsDeductedFromBaseStock, 0);

    if (!settings.allowNegativeStock && item.product.currentBaseStock < otherUnitsInCart + newTotalUnitsNeeded) {
      addToast('Estoque Limite', `Estoque máximo atingido para ${item.product.name}`, 'warning');
      return;
    }

    setCart((prev) =>
      prev.map((c) => {
        if (c.id === cartItemId) {
          const coldSurchargePerUnit =
            c.temperature === 'GELADA'
              ? c.presentation === 'FARDO'
                ? c.product.coldSurchargePack
                : c.product.coldSurchargeUnit
              : 0;
          const vasilhameFeePerUnit =
            c.product.isReturnable && c.vasilhameOption === 'COMPRAR_CASCO'
              ? (c.product.vasilhameDepositPrice || 3.5) * unitsPerItem
              : 0;

          return {
            ...c,
            quantity: newQty,
            coldSurchargeTotal: coldSurchargePerUnit * newQty,
            vasilhameFeeTotal: vasilhameFeePerUnit * newQty,
            subtotal: c.unitPriceCalculated * newQty,
            unitsDeductedFromBaseStock: newTotalUnitsNeeded,
          };
        }
        return c;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Submissão do pedido pelo Delivery App do Cliente
  const submitCustomerCheckout = async (
    customerInfo: Omit<CheckoutInput, 'items' | 'channel'>
  ): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    if (cart.length === 0) {
      return { success: false, error: 'Carrinho vazio!' };
    }

    const checkoutInput: CheckoutInput = {
      channel: 'DELIVERY_APP',
      customer: customerInfo.customer,
      paymentMethod: customerInfo.paymentMethod,
      changeFor: customerInfo.changeFor,
      deliveryFee: settings.defaultDeliveryFee,
      items: cart.map((c) => ({
        productId: c.productId,
        presentation: c.presentation,
        temperature: c.temperature,
        vasilhameOption: c.vasilhameOption,
        quantity: c.quantity,
      })),
    };

    const nextOrderNumber = orders.length > 0 ? Math.max(...orders.map((o) => o.orderNumber)) + 1 : 1001;
    const result = executeOrderCheckout(checkoutInput, products, vasilhames, nextOrderNumber);

    if (!result.success || !result.order) {
      return { success: false, error: result.error || 'Falha ao processar checkout' };
    }

    const fbUser = firebaseAuth.currentUser;
    const orderForState: Order = {
      ...result.order,
      ...(fbUser ? { customerUid: fbUser.uid, customerEmail: fbUser.email || '' } : {}),
    };

    if (result.updatedProducts) setProducts(result.updatedProducts);
    if (result.updatedVasilhames) setVasilhames(result.updatedVasilhames);

    knownOrderIdsRef.current.add(orderForState.id);
    setOrders((prev) => [orderForState, ...prev]);
    setLastCreatedOrderId(orderForState.id);
    clearCart();

    const newStockMovs: StockMovement[] = [];
    orderForState.items.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      if (prod) {
        newStockMovs.push({
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: it.productId,
          productName: it.productName,
          type: 'VENDA',
          unitsQuantity: it.unitsCount,
          previousStock: prod.currentBaseStock,
          newStock: Math.max(0, prod.currentBaseStock - it.unitsCount),
          reason: `Venda Delivery Pedido #${orderForState.orderNumber}`,
          createdAt: new Date().toISOString(),
        });
      }
    });
    if (newStockMovs.length > 0) {
      setStockMovements((prev) => [...newStockMovs, ...prev]);
    }

    // Sincroniza pedido, baixa de estoque e vasilhames em tempo real na nuvem
    if (canPerformCloudStaffWrite(fbUser)) {
      const staffEmails = settings.staffEmails || [];
      try {
        await syncOrderCreateToCloud(orderForState, staffEmails);
        if (result.updatedProducts) {
          const orderedIds = new Set(orderForState.items.map((i) => i.productId));
          result.updatedProducts
            .filter((p) => orderedIds.has(p.id))
            .forEach((p) => {
              void syncProductStockToCloud(p.id, p.currentBaseStock).catch(() => {});
            });
        }
        if (result.updatedVasilhames) {
          result.updatedVasilhames.forEach((v) => {
            void syncVasilhameCountersToCloud(v).catch(() => {});
          });
        }
        newStockMovs.forEach((mov) => {
          void syncStockMovementCreateToCloud(mov, staffEmails).catch(() => {});
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao enviar pedido para a nuvem.';
        setCloudSyncError(msg);
      }
    }

    soundService.playNewOrderChime();
    addToast(
      '🚨 NOVO PEDIDO DELIVERY CHEGANDO!',
      `Pedido #${orderForState.orderNumber} por ${orderForState.customer.name} - Total: R$ ${orderForState.totalAmount.toFixed(2)}`,
      'order'
    );

    return { success: true, orderId: orderForState.id };
  };

  // Submissão de venda balcão (PDV Frente de Caixa)
  const submitBalcaoCheckout = async (
    items: CartItem[],
    paymentMethod: PaymentMethod,
    changeFor?: number,
    customerName = 'Cliente Balcão'
  ): Promise<{ success: boolean; error?: string }> => {
    if (cashShift.status === 'CLOSED') {
      return { success: false, error: 'O caixa está fechado! Abra o caixa antes de realizar vendas.' };
    }
    if (items.length === 0) return { success: false, error: 'Nenhum produto adicionado' };

    const checkoutInput: CheckoutInput = {
      channel: 'BALCAO_PDV',
      customer: {
        name: customerName,
        phone: 'Balcão',
        address: 'Retirada no Depósito',
        number: 'S/N',
        neighborhood: 'Balcão',
      },
      paymentMethod,
      changeFor,
      deliveryFee: 0,
      items: items.map((c) => ({
        productId: c.productId,
        presentation: c.presentation,
        temperature: c.temperature,
        vasilhameOption: c.vasilhameOption,
        quantity: c.quantity,
      })),
    };

    const nextOrderNumber = orders.length > 0 ? Math.max(...orders.map((o) => o.orderNumber)) + 1 : 1001;
    const result = executeOrderCheckout(checkoutInput, products, vasilhames, nextOrderNumber);

    if (!result.success || !result.order) {
      return { success: false, error: result.error || 'Erro na venda balcão' };
    }

    const fbUser = firebaseAuth.currentUser;
    const completedBalcaoOrder: Order = {
      ...result.order,
      status: 'ENTREGUE',
      deliveredAt: new Date().toISOString(),
      ...(fbUser ? { customerUid: fbUser.uid, customerEmail: fbUser.email || '' } : {}),
    };

    if (result.updatedProducts) setProducts(result.updatedProducts);
    if (result.updatedVasilhames) setVasilhames(result.updatedVasilhames);

    knownOrderIdsRef.current.add(completedBalcaoOrder.id);
    setOrders((prev) => [completedBalcaoOrder, ...prev]);

    const amount = completedBalcaoOrder.totalAmount;
    const nextCashShift: CashShift = {
      ...cashShift,
      balcaoCash: paymentMethod === 'DINHEIRO' ? cashShift.balcaoCash + amount : cashShift.balcaoCash,
      balcaoCard: paymentMethod === 'CARTAO_ENTREGA' ? cashShift.balcaoCard + amount : cashShift.balcaoCard,
      balcaoPix: paymentMethod === 'PIX' ? cashShift.balcaoPix + amount : cashShift.balcaoPix,
    };
    setCashShift(nextCashShift);

    const newStockMovs: StockMovement[] = items.map((it) => ({
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: it.productId,
      productName: it.product.name,
      type: 'VENDA',
      unitsQuantity: it.unitsDeductedFromBaseStock,
      previousStock: it.product.currentBaseStock,
      newStock: Math.max(0, it.product.currentBaseStock - it.unitsDeductedFromBaseStock),
      reason: `Venda Balcão Cupom #${completedBalcaoOrder.orderNumber}`,
      createdAt: new Date().toISOString(),
    }));
    setStockMovements((prev) => [...newStockMovs, ...prev]);

    runCloudTask(async () => {
      const staffEmails = settings.staffEmails || [];
      await syncOrderCreateToCloud(completedBalcaoOrder, staffEmails);
      await syncCashShiftToCloud(nextCashShift, staffEmails);
      if (result.updatedProducts) {
        const orderedIds = new Set(items.map((i) => i.productId));
        for (const p of result.updatedProducts.filter((prod) => orderedIds.has(prod.id))) {
          await syncProductStockToCloud(p.id, p.currentBaseStock);
        }
      }
      if (result.updatedVasilhames) {
        for (const v of result.updatedVasilhames) {
          await syncVasilhameCountersToCloud(v);
        }
      }
      for (const mov of newStockMovs) {
        await syncStockMovementCreateToCloud(mov, staffEmails);
      }
    });

    soundService.playCashRegisterSound();
    addToast('Venda Balcão Concluída!', `Cupom #${completedBalcaoOrder.orderNumber} - R$ ${completedBalcaoOrder.totalAmount.toFixed(2)}`, 'success');

    return { success: true };
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, motoboyId?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const nowIso = new Date().toISOString();
    const boy = motoboyId ? motoboys.find((m) => m.id === motoboyId) : undefined;
    const updatedOrder: Order = {
      ...targetOrder,
      status: newStatus,
      updatedAt: nowIso,
      ...(newStatus === 'ENTREGUE' ? { deliveredAt: nowIso } : {}),
      ...(motoboyId
        ? {
            motoboyId,
            motoboyName: boy?.name,
            motoboyAssignedAt: nowIso,
          }
        : {}),
    };

    setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));

    const staffEmails = settings.staffEmails || [];
    let updatedMotoboyForCloud: Motoboy | null = null;
    let updatedCashShiftForCloud: CashShift | null = null;

    if (newStatus === 'ENTREGUE' && targetOrder.status !== 'ENTREGUE' && targetOrder.channel === 'DELIVERY_APP') {
      const effectiveMotoId = updatedOrder.motoboyId;
      if (effectiveMotoId) {
        const existingBoy = motoboys.find((m) => m.id === effectiveMotoId);
        if (existingBoy) {
          const amt = targetOrder.totalAmount;
          updatedMotoboyForCloud = {
            ...existingBoy,
            activeDeliveriesCount: Math.max(0, existingBoy.activeDeliveriesCount - 1),
            totalDeliveriesCompletedToday: existingBoy.totalDeliveriesCompletedToday + 1,
            totalCollectedCash:
              targetOrder.paymentMethod === 'DINHEIRO'
                ? existingBoy.totalCollectedCash + amt
                : existingBoy.totalCollectedCash,
            totalCollectedCard:
              targetOrder.paymentMethod === 'CARTAO_ENTREGA'
                ? existingBoy.totalCollectedCard + amt
                : existingBoy.totalCollectedCard,
            totalCollectedPix:
              targetOrder.paymentMethod === 'PIX'
                ? existingBoy.totalCollectedPix + amt
                : existingBoy.totalCollectedPix,
            commissionBalance: existingBoy.commissionBalance + (settings.motoboyCommission || 0),
          };
          setMotoboys((prev) =>
            prev.map((m) => (m.id === effectiveMotoId ? updatedMotoboyForCloud! : m))
          );
        }
      }

      if (cashShift.status === 'OPEN') {
        const amt = targetOrder.totalAmount;
        updatedCashShiftForCloud = {
          ...cashShift,
          deliveryCash:
            targetOrder.paymentMethod === 'DINHEIRO'
              ? cashShift.deliveryCash + amt
              : cashShift.deliveryCash,
          deliveryCard:
            targetOrder.paymentMethod === 'CARTAO_ENTREGA'
              ? cashShift.deliveryCard + amt
              : cashShift.deliveryCard,
          deliveryPix:
            targetOrder.paymentMethod === 'PIX'
              ? cashShift.deliveryPix + amt
              : cashShift.deliveryPix,
        };
        setCashShift(updatedCashShiftForCloud);
      }
    }

    runCloudTask(async () => {
      await syncOrderUpdateToCloud(updatedOrder, staffEmails);
      if (updatedMotoboyForCloud) {
        await syncMotoboyToCloud(updatedMotoboyForCloud, staffEmails, true);
      }
      if (updatedCashShiftForCloud) {
        await syncCashShiftToCloud(updatedCashShiftForCloud, staffEmails);
      }
    });

    addToast('Status Atualizado', `Pedido foi alterado para "${newStatus.replace('_', ' ')}"`, 'info');
  };

  const cancelOrder = (
    orderId: string,
    passwordInput: string,
    reasonInput?: string
  ): { success: boolean; message?: string } => {
    if (currentUser && currentUser.role !== 'DONO' && currentUser.role !== 'BALCAO') {
      return {
        success: false,
        message: 'Acesso negado. Somente o Dono ou o Balcão podem cancelar vendas.',
      };
    }

    const expectedPassword = settings.cancelPassword || '123';
    if (passwordInput.trim() !== expectedPassword) {
      return {
        success: false,
        message: 'Senha de autorização incorreta! Verifique a senha de cancelamento.',
      };
    }

    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) {
      return { success: false, message: 'Venda/pedido não encontrado.' };
    }

    if (targetOrder.status === 'CANCELADO') {
      return { success: false, message: 'Esta venda já foi cancelada anteriormente.' };
    }

    const nowIso = new Date().toISOString();
    const cancelReason = reasonInput?.trim() || 'Erro de lançamento no atendimento';
    const canceledBy = currentUser?.name || 'Operador PDV';

    const staffEmails = settings.staffEmails || [];
    const canceledOrder: Order = {
      ...targetOrder,
      status: 'CANCELADO',
      canceledAt: nowIso,
      canceledBy,
      cancelReason,
      updatedAt: nowIso,
    };

    // 1. Atualiza status do pedido para CANCELADO
    setOrders((prev) => prev.map((o) => (o.id === orderId ? canceledOrder : o)));

    // 2. Estorna unidades para o estoque físico e registra movimentação
    const newMovements: StockMovement[] = [];
    const updatedProductsForCloud: Product[] = [];
    setProducts((prev) =>
      prev.map((p) => {
        const returnedUnits = targetOrder.items
          .filter((it) => it.productId === p.id)
          .reduce((sum, it) => sum + it.unitsCount, 0);

        if (returnedUnits > 0) {
          const nextStock = p.currentBaseStock + returnedUnits;
          newMovements.push({
            id: `mov-cancel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: p.id,
            productName: p.name,
            type: 'AJUSTE',
            unitsQuantity: returnedUnits,
            previousStock: p.currentBaseStock,
            newStock: nextStock,
            reason: `Estorno por Cancelamento #${targetOrder.orderNumber} (${cancelReason})`,
            createdAt: nowIso,
          });
          const nextProd = { ...p, currentBaseStock: nextStock };
          updatedProductsForCloud.push(nextProd);
          return nextProd;
        }
        return p;
      })
    );

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // 3. Estorna vasilhames caso haja itens retornáveis
    const updatedVasForCloud: VasilhameControl[] = [];
    setVasilhames((prev) =>
      prev.map((v) => {
        let deltaFull = 0;
        let deltaEmpty = 0;
        let deltaCirc = 0;

        targetOrder.items.forEach((it) => {
          const prod = products.find((p) => p.id === it.productId);
          if (prod && prod.isReturnable && prod.vasilhameId === v.id) {
            deltaFull += it.unitsCount;
            if (it.vasilhameOption === 'TROCA') {
              deltaEmpty -= it.unitsCount;
            } else if (it.vasilhameOption === 'COMPRAR_CASCO') {
              deltaCirc -= it.unitsCount;
            }
          }
        });

        if (deltaFull === 0 && deltaEmpty === 0 && deltaCirc === 0) return v;

        const nextVas: VasilhameControl = {
          ...v,
          fullInStorage: v.fullInStorage + deltaFull,
          emptyInYard: Math.max(0, v.emptyInYard + deltaEmpty),
          totalInCirculationWithCustomers: Math.max(
            0,
            v.totalInCirculationWithCustomers + deltaCirc
          ),
        };
        updatedVasForCloud.push(nextVas);
        return nextVas;
      })
    );

    // 4. Estorna valor do caixa se a venda foi feita no Balcão (ou hoje no turno atual)
    let nextShiftForCloud: CashShift | null = null;
    if (targetOrder.channel === 'BALCAO_PDV') {
      const amount = targetOrder.totalAmount;
      nextShiftForCloud = {
        ...cashShift,
        balcaoCash:
          targetOrder.paymentMethod === 'DINHEIRO'
            ? Math.max(0, cashShift.balcaoCash - amount)
            : cashShift.balcaoCash,
        balcaoCard:
          targetOrder.paymentMethod === 'CARTAO_ENTREGA'
            ? Math.max(0, cashShift.balcaoCard - amount)
            : cashShift.balcaoCard,
        balcaoPix:
          targetOrder.paymentMethod === 'PIX'
            ? Math.max(0, cashShift.balcaoPix - amount)
            : cashShift.balcaoPix,
      };
      setCashShift(nextShiftForCloud);
    }

    runCloudTask(async () => {
      await syncOrderUpdateToCloud(canceledOrder, staffEmails);
      for (const p of updatedProductsForCloud) {
        await syncProductStockToCloud(p.id, p.currentBaseStock);
      }
      for (const v of updatedVasForCloud) {
        await syncVasilhameCountersToCloud(v);
      }
      for (const mov of newMovements) {
        await syncStockMovementCreateToCloud(mov, staffEmails);
      }
      if (nextShiftForCloud) {
        await syncCashShiftToCloud(nextShiftForCloud, staffEmails);
      }
    });

    soundService.playCashRegisterSound();
    addToast(
      'Venda Cancelada e Estornada',
      `Cupom/Pedido #${targetOrder.orderNumber} cancelado por ${canceledBy}. Estoque e valores estornados.`,
      'warning'
    );

    return { success: true };
  };

  const assignMotoboyToOrder = (orderId: string, motoboyId: string) => {
    const targetMotoboy = motoboys.find((m) => m.id === motoboyId);
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetMotoboy || !targetOrder) return;

    const nowIso = new Date().toISOString();
    const updatedOrder: Order = {
      ...targetOrder,
      status: 'EM_ROTA',
      motoboyId,
      motoboyName: targetMotoboy.name,
      motoboyAssignedAt: nowIso,
      updatedAt: nowIso,
    };
    const updatedBoy: Motoboy = {
      ...targetMotoboy,
      activeDeliveriesCount: targetMotoboy.activeDeliveriesCount + 1,
    };

    setOrders((prev) => prev.map((ord) => (ord.id === orderId ? updatedOrder : ord)));
    setMotoboys((prev) => prev.map((m) => (m.id === motoboyId ? updatedBoy : m)));

    const staffEmails = settings.staffEmails || [];
    runCloudTask(async () => {
      await syncOrderUpdateToCloud(updatedOrder, staffEmails);
      await syncMotoboyToCloud(updatedBoy, staffEmails, true);
    });

    addToast(
      'Motoboy Despachado 🛵',
      `${targetMotoboy.name} saiu para entrega do pedido`,
      'info'
    );
  };

  const settleMotoboyShift = (motoboyId: string) => {
    const motoboy = motoboys.find((m) => m.id === motoboyId);
    if (!motoboy) return { success: false, totalCollected: 0, receipts: '' };

    const totalMoney = motoboy.totalCollectedCash;
    const totalCard = motoboy.totalCollectedCard;
    const totalPix = motoboy.totalCollectedPix;
    const total = totalMoney + totalCard + totalPix;

    const settledBoy: Motoboy = {
      ...motoboy,
      totalCollectedCash: 0,
      totalCollectedCard: 0,
      totalCollectedPix: 0,
      activeDeliveriesCount: 0,
    };
    setMotoboys((prev) => prev.map((m) => (m.id === motoboyId ? settledBoy : m)));

    runCloudTask(async () => {
      await syncMotoboyToCloud(settledBoy, settings.staffEmails || [], true);
    });

    soundService.playCashRegisterSound();
    addToast(
      'Prestação de Contas Realizada!',
      `${motoboy.name}: Dinheiro entregue ao caixa R$ ${totalMoney.toFixed(2)}`,
      'success'
    );

    return {
      success: true,
      totalCollected: total,
      receipts: `Fechamento do Motoboy ${motoboy.name}:\n- Dinheiro em mãos recolhido: R$ ${totalMoney.toFixed(2)}\n- Comprovantes Maquininha Cartão: R$ ${totalCard.toFixed(2)}\n- PIX na Entrega conferidos: R$ ${totalPix.toFixed(2)}\nTotal Acertado: R$ ${total.toFixed(2)}`,
    };
  };

  const restockProductStock = (productId: string, additionalUnits: number) => {
    adjustStock(productId, additionalUnits, 'DELTA', 'Reposição Rápida de Estoque', 'ENTRADA');
  };

  const receiveEmptyVasilhames = (vasilhameId: string, quantity: number) => {
    const target = vasilhames.find((v) => v.id === vasilhameId);
    if (!target) return;
    const nextVas: VasilhameControl = {
      ...target,
      emptyInYard: target.emptyInYard + quantity,
      totalInCirculationWithCustomers: Math.max(0, target.totalInCirculationWithCustomers - quantity),
    };
    setVasilhames((prev) => prev.map((v) => (v.id === vasilhameId ? nextVas : v)));
    runCloudTask(async () => {
      await syncVasilhameCountersToCloud(nextVas);
    });
    addToast('Vasilhames Recolhidos', `+${quantity} cascos vazios recebidos no pátio`, 'info');
  };

  // =========================================================================
  // COMUNICAÇÃO EM TEMPO REAL: CHAT DO PEDIDO & AVISOS DO MOTOBOY
  // =========================================================================
  const sendOrderMessage = (
    orderId: string,
    sender: 'CLIENTE' | 'LOJA' | 'MOTOBOY',
    senderName: string,
    text: string
  ) => {
    if (!text.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId,
      sender,
      senderName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const targetOrd = orders.find((o) => o.id === orderId);
    if (!targetOrd) return;

    const updatedOrd: Order = {
      ...targetOrd,
      messages: [...(targetOrd.messages || []), newMessage],
      updatedAt: new Date().toISOString(),
    };
    setOrders((prev) => prev.map((ord) => (ord.id === orderId ? updatedOrd : ord)));

    runCloudTask(async () => {
      await syncOrderUpdateToCloud(updatedOrd, settings.staffEmails || [], true);
    });

    soundService.playCashRegisterSound();

    if (sender === 'CLIENTE') {
      addToast(
        `💬 Mensagem do Cliente (${senderName})`,
        text.length > 60 ? `${text.substring(0, 60)}...` : text,
        'order'
      );
    } else if (sender === 'MOTOBOY') {
      addToast(
        `🛵 Mensagem do Motoboy (${senderName})`,
        text.length > 60 ? `${text.substring(0, 60)}...` : text,
        'info'
      );
    } else {
      addToast(
        `🏪 Resposta Enviada pela Loja`,
        'Mensagem enviada com sucesso ao cliente.',
        'success'
      );
    }
  };

  const notifyCustomerArrival = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const motoboyName = order.motoboyName || 'Entregador';
    const arrivalText = `🛵 CHEGUEI NO PORTÃO / PORTARIA! ${motoboyName} está no seu endereço com seu pedido. Favor descer ou atender!`;

    sendOrderMessage(orderId, 'MOTOBOY', motoboyName, arrivalText);

    soundService.playNewOrderChime();
    addToast(
      '🚨 MOTOBOY NO PORTÃO!',
      `Aviso de chegada emitido para ${order.customer.name}!`,
      'order'
    );
  };

  // =========================================================================
  // GESTÃO DE MOTOBOYS & ENTREGADORES (CRUD)
  // =========================================================================
  const addMotoboy = (data: {
    name: string;
    phone: string;
    vehiclePlate: string;
    vehicleModel: string;
    isOnline?: boolean;
    accessPassword?: string;
    googleEmail?: string;
  }): Motoboy => {
    const newBoy: Motoboy = {
      id: `moto-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      phone: data.phone,
      vehiclePlate: data.vehiclePlate.toUpperCase(),
      vehicleModel: data.vehicleModel,
      isOnline: data.isOnline !== undefined ? data.isOnline : true,
      activeDeliveriesCount: 0,
      totalDeliveriesCompletedToday: 0,
      totalCollectedCash: 0,
      totalCollectedCard: 0,
      totalCollectedPix: 0,
      commissionBalance: 0,
      accessPassword: data.accessPassword?.trim() || undefined,
      googleEmail: data.googleEmail?.trim().toLowerCase() || undefined,
    };
    const cleanEmail = data.googleEmail?.trim().toLowerCase() || '';
    const nextStaffEmails = cleanEmail
      ? sanitizeStaffEmails([...(settings.staffEmails || []), cleanEmail])
      : sanitizeStaffEmails(settings.staffEmails);
    const nextMotoboys = [...motoboys, newBoy];

    setMotoboys(nextMotoboys);
    if (cleanEmail && nextStaffEmails.length !== (settings.staffEmails || []).length) {
      setSettings((prev) => ({ ...prev, staffEmails: nextStaffEmails }));
    }

    runCloudTask(async () => {
      await syncMotoboyToCloud(newBoy, nextStaffEmails, false);
      if (cleanEmail && isCurrentUserOwner()) {
        await syncStoreSettingsToCloud({ ...settings, staffEmails: nextStaffEmails });
        await syncStaffAccessListToCloud(nextStaffEmails, nextMotoboys);
      }
    });
    addToast('Motoboy Cadastrado!', `${newBoy.name} foi adicionado à frota de entregadores.`, 'success');
    return newBoy;
  };

  const updateMotoboy = (id: string, updated: Partial<Motoboy>) => {
    const target = motoboys.find((m) => m.id === id);
    if (!target) return;
    const cleanEmail =
      updated.googleEmail !== undefined
        ? updated.googleEmail?.trim().toLowerCase() || undefined
        : target.googleEmail;
    const nextBoy: Motoboy = { ...target, ...updated, googleEmail: cleanEmail };
    const nextMotoboys = motoboys.map((m) => (m.id === id ? nextBoy : m));
    const nextStaffEmails = cleanEmail
      ? sanitizeStaffEmails([...(settings.staffEmails || []), cleanEmail])
      : sanitizeStaffEmails(settings.staffEmails);

    setMotoboys(nextMotoboys);
    if (cleanEmail && nextStaffEmails.length !== (settings.staffEmails || []).length) {
      setSettings((prev) => ({ ...prev, staffEmails: nextStaffEmails }));
    }

    runCloudTask(async () => {
      await syncMotoboyToCloud(nextBoy, nextStaffEmails, false);
      if (updated.googleEmail !== undefined && isCurrentUserOwner()) {
        await syncStoreSettingsToCloud({ ...settings, staffEmails: nextStaffEmails });
        await syncStaffAccessListToCloud(nextStaffEmails, nextMotoboys);
      }
    });
    addToast('Entregador Atualizado', 'As informações do motoboy foram salvas.', 'success');
  };

  const deleteMotoboy = (id: string) => {
    const boy = motoboys.find((m) => m.id === id);
    setMotoboys((prev) => prev.filter((m) => m.id !== id));
    runCloudTask(async () => {
      await deleteMotoboyFromCloud(id);
    });
    addToast('Entregador Removido', `${boy?.name || 'Motoboy'} foi removido da frota.`, 'info');
  };

  const toggleMotoboyOnline = (id: string) => {
    const target = motoboys.find((m) => m.id === id) || motoboys[0];
    if (!target) {
      addToast('Nenhum Entregador', 'Cadastre um entregador na aba Motoboys para alterar o status.', 'warning');
      return;
    }

    const nextStatus = !(target.isOnline ?? true);
    const nextBoy = { ...target, isOnline: nextStatus };
    setMotoboys((prev) => prev.map((m) => (m.id === target.id ? nextBoy : m)));
    runCloudTask(async () => {
      await syncMotoboyToCloud(nextBoy, settings.staffEmails || [], true);
    });
    addToast(
      nextStatus ? 'Entregador Online' : 'Entregador Offline',
      `${target.name} está agora ${nextStatus ? 'disponível para entregas' : 'em pausa / offline'}.`,
      'info'
    );
  };

  // =========================================================================
  // GESTÃO DE CAIXA: ABRIR, FECHAR E LIMPAR CAIXA
  // =========================================================================
  const openCashShift = (initialFloat: number, cashierName: string) => {
    const validFloat = Number.isFinite(initialFloat) ? Math.max(0, initialFloat) : 0;
    const newShift: CashShift = {
      id: `SHIFT-${Date.now()}`,
      cashierName,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      initialFloat: validFloat,
      balcaoCash: 0,
      balcaoCard: 0,
      balcaoPix: 0,
      deliveryCash: 0,
      deliveryCard: 0,
      deliveryPix: 0,
    };
    setCashShift(newShift);
    runCloudTask(async () => {
      await syncCashShiftToCloud(newShift, settings.staffEmails || []);
    });
    soundService.playCashRegisterSound();
    addToast('Caixa Aberto com Sucesso!', `Operador: ${cashierName} | Fundo Inicial: R$ ${validFloat.toFixed(2)}`, 'success');
  };

  const closeCashShift = (countedCash: number, notes?: string): CashShiftRecord => {
    const validCountedCash = Number.isFinite(countedCash) ? Math.max(0, countedCash) : 0;
    const totalBalcao = cashShift.balcaoCash + cashShift.balcaoCard + cashShift.balcaoPix;
    const totalDelivery = cashShift.deliveryCash + cashShift.deliveryCard + cashShift.deliveryPix;
    const totalSales = totalBalcao + totalDelivery;

    // Movimentações de Fluxo de Caixa deste turno (Retiradas p/ compras como detergente, e Suprimentos)
    const shiftFlows = cashFlows.filter((f) => f.shiftId === cashShift.id);
    const totalCashInflows = shiftFlows
      .filter((f) => f.type === 'SUPRIMENTO')
      .reduce((sum, f) => sum + f.amount, 0);
    const totalCashOutflows = shiftFlows
      .filter((f) => f.type === 'RETIRADA_DESPESA')
      .reduce((sum, f) => sum + f.amount, 0);

    // Dinheiro físico esperado na gaveta = Fundo inicial + Vendas em dinheiro + Suprimentos - Retiradas/Despesas
    const expectedFinalCash =
      cashShift.initialFloat +
      cashShift.balcaoCash +
      cashShift.deliveryCash +
      totalCashInflows -
      totalCashOutflows;
    const diff = validCountedCash - expectedFinalCash; // Quebra (negativo) ou sobra (positivo)

    // Consolida tudo o que foi vendido no dia (excluindo cancelados) + custo abatido + lucro
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
    const validTodayOrders = todayOrders.filter((o) => o.status !== 'CANCELADO');
    const canceledTodayOrders = todayOrders.filter((o) => o.status === 'CANCELADO');

    const soldMap = new Map<string, CashShiftSoldProduct>();
    let totalCostOfGoods = 0;
    let totalProductsRevenue = 0;

    validTodayOrders.forEach((order) => {
      order.items.forEach((it) => {
        const prod = products.find((p) => p.id === it.productId);
        const itemCost =
          it.totalCost !== undefined ? it.totalCost : (prod?.costUnit || 0) * it.unitsCount;
        const itemProfit = it.subtotal - itemCost;

        totalCostOfGoods += itemCost;
        totalProductsRevenue += it.subtotal;

        const existing = soldMap.get(it.productId);
        if (existing) {
          existing.unitsSold += it.unitsCount;
          existing.packsCount += it.presentation === 'FARDO' ? it.quantity : 0;
          existing.singlesCount += it.presentation === 'UNIDADE' ? it.quantity : 0;
          existing.revenue += it.subtotal;
          existing.costTotal += itemCost;
          existing.profitTotal += itemProfit;
        } else {
          soldMap.set(it.productId, {
            productId: it.productId,
            productName: prod?.name || it.productName,
            brand: prod?.brand || it.brand,
            unitsSold: it.unitsCount,
            packsCount: it.presentation === 'FARDO' ? it.quantity : 0,
            singlesCount: it.presentation === 'UNIDADE' ? it.quantity : 0,
            revenue: it.subtotal,
            costTotal: itemCost,
            profitTotal: itemProfit,
          });
        }
      });
    });

    const soldProducts = Array.from(soldMap.values()).sort((a, b) => b.unitsSold - a.unitsSold);
    const totalGrossProfit =
      totalSales > 0 ? totalSales - totalCostOfGoods : totalProductsRevenue - totalCostOfGoods;
    const canceledTotalValue = canceledTodayOrders.reduce((s, o) => s + o.totalAmount, 0);

    const record: CashShiftRecord = {
      id: cashShift.id,
      cashierName: cashShift.cashierName,
      openedAt: cashShift.openedAt,
      closedAt: new Date().toISOString(),
      initialFloat: cashShift.initialFloat,
      totalBalcao,
      totalDelivery,
      totalSales,
      balcaoCash: cashShift.balcaoCash,
      balcaoCard: cashShift.balcaoCard,
      balcaoPix: cashShift.balcaoPix,
      deliveryCash: cashShift.deliveryCash,
      deliveryCard: cashShift.deliveryCard,
      deliveryPix: cashShift.deliveryPix,
      totalCashInflows,
      totalCashOutflows,
      cashFlowMovements: shiftFlows,
      expectedFinalCash,
      finalCashInDrawer: validCountedCash,
      closingDifference: diff,
      totalCostOfGoods,
      totalGrossProfit,
      ordersCount: validTodayOrders.length,
      canceledOrdersCount: canceledTodayOrders.length,
      canceledTotalValue,
      soldProducts,
      notes,
    };

    const closedShift: CashShift = {
      ...cashShift,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closingCashInDrawer: validCountedCash,
      closingDifference: diff,
      closingNotes: notes,
    };

    setShiftHistory((prev) => [record, ...prev]);
    setCashShift(closedShift);

    runCloudTask(async () => {
      const staffEmails = settings.staffEmails || [];
      await syncCashShiftToCloud(closedShift, staffEmails);
      await syncShiftRecordCreateToCloud(record, staffEmails);
    });

    soundService.playCashRegisterSound();
    addToast(
      'Caixa Fechado com Sucesso!',
      `Faturado: R$ ${totalSales.toFixed(2)} | Lucro (custo abatido): R$ ${totalGrossProfit.toFixed(2)} | Diferença: ${diff >= 0 ? '+' : ''}R$ ${diff.toFixed(2)}`,
      'info'
    );

    return record;
  };

  const cleanCashShift = () => {
    const freshShift: CashShift = {
      id: `SHIFT-${Date.now()}`,
      cashierName: 'Aguardando Operador',
      status: 'CLOSED',
      openedAt: new Date().toISOString(),
      initialFloat: 0,
      balcaoCash: 0,
      balcaoCard: 0,
      balcaoPix: 0,
      deliveryCash: 0,
      deliveryCard: 0,
      deliveryPix: 0,
      closingCashInDrawer: 0,
      closingDifference: 0,
    };
    setCashShift(freshShift);
    runCloudTask(async () => {
      await syncCashShiftToCloud(freshShift, settings.staffEmails || []);
    });
    addToast('Caixa Zerado & Limpo!', 'Todas as movimentações do turno foram limpas com sucesso.', 'info');
  };

  const addCashFlowMovement = (params: {
    type: CashFlowType;
    category: CashFlowCategory;
    amount: number;
    description: string;
  }): { success: boolean; message?: string } => {
    if (params.amount <= 0) {
      return { success: false, message: 'Informe um valor maior que R$ 0,00.' };
    }
    if (!params.description.trim()) {
      return { success: false, message: 'Descreva o motivo (ex: compra de detergente).' };
    }

    const movement: CashFlowMovement = {
      id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      shiftId: cashShift.id,
      type: params.type,
      category: params.category,
      amount: Number(params.amount),
      description: params.description.trim(),
      createdBy: currentUser?.name || 'Dono',
      createdAt: new Date().toISOString(),
    };

    setCashFlows((prev) => [movement, ...prev]);

    runCloudTask(async () => {
      await syncCashFlowToFirestore(movement, settings.staffEmails || []);
    });

    soundService.playCashRegisterSound();
    addToast(
      params.type === 'SUPRIMENTO' ? 'Suprimento Registrado' : 'Retirada / Despesa Registrada',
      `${movement.description} — R$ ${movement.amount.toFixed(2)}`,
      params.type === 'SUPRIMENTO' ? 'success' : 'warning'
    );
    return { success: true };
  };

  const removeCashFlowMovement = (flowId: string) => {
    setCashFlows((prev) => prev.filter((f) => f.id !== flowId));
    if (canPerformCloudStaffWrite()) {
      void deleteCashFlowFromFirestore(flowId).catch(() => {
        // Local já removido
      });
    }
    addToast('Lançamento Removido', 'A movimentação do fluxo de caixa foi estornada.', 'info');
  };

  // =========================================================================
  // GESTÃO DE PRODUTOS & AJUSTE DE ESTOQUE (CRUD)
  // =========================================================================
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const newId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProd: Product = {
      ...productData,
      id: newId,
    };

    setProducts((prev) => [newProd, ...prev]);

    const initialMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: newId,
      productName: newProd.name,
      type: 'ENTRADA',
      unitsQuantity: newProd.currentBaseStock,
      previousStock: 0,
      newStock: newProd.currentBaseStock,
      reason: 'Cadastro Inicial de Produto no Sistema',
      createdAt: new Date().toISOString(),
    };
    setStockMovements((prev) => [initialMovement, ...prev]);

    runCloudTask(async () => {
      await syncProductToCloud(newProd);
      await syncStockMovementCreateToCloud(initialMovement, settings.staffEmails || []);
    });

    addToast('Produto Cadastrado!', `${newProd.name} foi adicionado ao catálogo.`, 'success');
    return newProd;
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    const existingProd = products.find((p) => p.id === id);
    if (!existingProd) return;
    const nextProd: Product = { ...existingProd, ...updated };
    let stockMov: StockMovement | null = null;

    if (updated.currentBaseStock !== undefined && updated.currentBaseStock !== existingProd.currentBaseStock) {
      stockMov = {
        id: `mov-${Date.now()}`,
        productId: existingProd.id,
        productName: updated.name || existingProd.name,
        type: 'AJUSTE',
        unitsQuantity: Math.abs(updated.currentBaseStock - existingProd.currentBaseStock),
        previousStock: existingProd.currentBaseStock,
        newStock: updated.currentBaseStock,
        reason: 'Edição Cadastral de Produto',
        createdAt: new Date().toISOString(),
      };
      setStockMovements((movements) => [stockMov!, ...movements]);
    }

    setProducts((prev) => prev.map((p) => (p.id === id ? nextProd : p)));
    runCloudTask(async () => {
      await syncProductToCloud(nextProd);
      if (stockMov) {
        await syncStockMovementCreateToCloud(stockMov, settings.staffEmails || []);
      }
    });
    addToast('Produto Atualizado!', 'As informações foram salvas com sucesso.', 'success');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    runCloudTask(async () => {
      await deleteProductFromCloud(id);
    });
    addToast('Produto Removido', `${prod?.name || 'Item'} foi excluído do catálogo.`, 'info');
  };

  const adjustStock = (
    productId: string,
    quantity: number,
    mode: 'ABSOLUTE' | 'DELTA',
    reason: string,
    type: 'ENTRADA' | 'AJUSTE' | 'PERDA'
  ) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const prevStock = target.currentBaseStock;
    const nextStock =
      mode === 'ABSOLUTE' ? Math.max(0, quantity) : Math.max(0, prevStock + quantity);
    const diff = Math.abs(nextStock - prevStock);
    const mov: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: target.id,
      productName: target.name,
      type,
      unitsQuantity: diff,
      previousStock: prevStock,
      newStock: nextStock,
      reason: reason || 'Ajuste manual de estoque',
      createdAt: new Date().toISOString(),
    };

    setStockMovements((movements) => [mov, ...movements]);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, currentBaseStock: nextStock } : p))
    );

    runCloudTask(async () => {
      await syncProductStockToCloud(target.id, nextStock);
      await syncStockMovementCreateToCloud(mov, settings.staffEmails || []);
    });

    addToast('Estoque Atualizado', `Estoque ajustado com motivo: ${reason}`, 'success');
  };

  // =========================================================================
  // CONFIGURAÇÕES DO SISTEMA / DEPÓSITO
  // =========================================================================
  const updateSettings = (newSettings: Partial<DepotSettings>) => {
    const sanitizedStaff =
      newSettings.staffEmails !== undefined
        ? sanitizeStaffEmails(newSettings.staffEmails)
        : sanitizeStaffEmails(settings.staffEmails);
    const nextSettings: DepotSettings = {
      ...settings,
      ...newSettings,
      staffEmails: sanitizedStaff,
    };
    setSettings(nextSettings);

    runCloudTask(async () => {
      await syncStoreSettingsToCloud(nextSettings);
      if (isCurrentUserOwner()) {
        await syncStaffAccessListToCloud(sanitizedStaff, motoboys);
        for (const m of motoboys) {
          await syncMotoboyToCloud(m, sanitizedStaff, false);
        }
        for (const t of tables.filter((tb) => tb.status === 'OPEN')) {
          await syncTableToCloud(t, sanitizedStaff);
        }
        for (const o of orders.filter((ord) => ord.status !== 'ENTREGUE' && ord.status !== 'CANCELADO')) {
          await syncOrderUpdateToCloud(o, sanitizedStaff);
        }
        if (cashShift.status === 'OPEN') {
          await syncCashShiftToCloud(cashShift, sanitizedStaff);
        }
      }
    });

    addToast('Configurações Salvas', 'Os parâmetros do PDV e Delivery foram atualizados.', 'success');
  };

  // =========================================================================
  // AUTENTICAÇÃO, CONTROLE DE ACESSO & SESSÃO (DONO, BALCÃO, MOTOBOY, CLIENTE)
  // =========================================================================
  const toggleDeviceMode = () => {
    setDeviceMode((prev) => (prev === 'MOBILE' ? 'DESKTOP' : 'MOBILE'));
    setCustomerMobileFrame((prev) => !prev);
  };

  const loginAsCustomer = (mode?: DeviceMode) => {
    const session: UserSession = {
      role: 'CLIENTE',
      name: 'Cliente Delivery',
      username: 'cliente',
    };
    setCurrentUser(session);
    if (mode) {
      setDeviceMode(mode);
      setCustomerMobileFrame(mode === 'MOBILE');
    }
    setActiveView('CUSTOMER_APP');
    addToast('Bem-vindo(a) ao GelaFácil!', 'Você está na Área do Cliente. Escolha suas bebidas geladas!', 'success');
  };

  const loginAsEmployee = (
    usernameInput: string,
    passwordInput: string,
    specificMotoboyId?: string
  ): { success: boolean; message?: string } => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser) {
      return { success: false, message: 'Digite o seu usuário ou cargo.' };
    }

    if (!cleanPass) {
      return { success: false, message: 'Digite a senha de acesso.' };
    }

    // Role detection: Dono
    if (cleanUser === 'dono' || cleanUser === 'admin' || cleanUser.includes('gerente') || cleanUser === 'proprietario') {
      const expectedOwnerPass = (settings.ownerPassword || '123').trim();
      if (cleanPass !== expectedOwnerPass) {
        return { success: false, message: 'Senha do proprietário incorreta.' };
      }
      const session: UserSession = {
        role: 'DONO',
        name: 'Sr. Dono (Gerente Geral)',
        username: cleanUser,
      };
      setCurrentUser(session);
      setActiveView('EMPLOYEE_PDV');
      addToast('Acesso Dono Liberado', 'Controle total da loja, fluxo de caixa, estoque e motoboys.', 'success');
      return { success: true };
    }

    // Role detection: Motoboy (por cargo 'motoboy'/'entregador' ou pelo nome do entregador)
    const matchedMotoboyByName = motoboys.find((boy) =>
      boy.name.toLowerCase().includes(cleanUser)
    );
    if (
      cleanUser === 'motoboy' ||
      cleanUser.includes('moto') ||
      cleanUser.includes('entrega') ||
      matchedMotoboyByName
    ) {
      const targetId = matchedMotoboyByName?.id || specificMotoboyId || motoboys[0]?.id || 'moto-1';
      const m = motoboys.find((boy) => boy.id === targetId) || motoboys[0];
      const expectedMotoPass = (m?.accessPassword || settings.motoboyDefaultPassword || '123').trim();
      if (cleanPass !== expectedMotoPass) {
        return { success: false, message: 'Senha do entregador incorreta.' };
      }
      const session: UserSession = {
        role: 'MOTOBOY',
        name: m ? m.name : 'Entregador da Loja',
        username: cleanUser || 'motoboy',
        motoboyId: m?.id || 'moto-1',
      };
      setCurrentUser(session);
      setActiveView('MOTOBOY_APP');
      addToast(`Olá, ${session.name}!`, 'Painel do Entregador ativo. Boas entregas!', 'success');
      return { success: true };
    }

    // Role detection: Balcão / Caixa
    const expectedBalcaoPass = (settings.balcaoPassword || '123').trim();
    if (cleanPass !== expectedBalcaoPass) {
      return { success: false, message: 'Senha do operador de balcão incorreta.' };
    }
    const session: UserSession = {
      role: 'BALCAO',
      name: 'Operador de Balcão (Caixa)',
      username: cleanUser,
    };
    setCurrentUser(session);
    setActiveView('EMPLOYEE_PDV');
    addToast('Acesso Balcão Liberado', 'Frente de Caixa e KDS ativos para atendimento.', 'success');
    return { success: true };
  };

  const loginAsQuickRole = (role: UserRole, motoboyId?: string) => {
    if (role === 'CLIENTE') {
      loginAsCustomer();
      return;
    }

    if (role === 'DONO') {
      const session: UserSession = {
        role: 'DONO',
        name: 'Sr. Dono (Proprietário)',
        username: 'dono',
      };
      setCurrentUser(session);
      setActiveView('EMPLOYEE_PDV');
      addToast('Acesso Dono Liberado', 'Você tem controle administrativo total do depósito.', 'success');
      return;
    }

    if (role === 'BALCAO') {
      const session: UserSession = {
        role: 'BALCAO',
        name: 'Operador de Balcão (Caixa 01)',
        username: 'balcao',
      };
      setCurrentUser(session);
      setActiveView('EMPLOYEE_PDV');
      addToast('Acesso Balcão Liberado', 'Modo Frente de Caixa, KDS e abertura/fechamento de caixa.', 'success');
      return;
    }

    if (role === 'MOTOBOY') {
      const targetBoy = motoboys.find((b) => b.id === (motoboyId || 'moto-1')) || motoboys[0];
      const motoboyName = targetBoy?.name || 'Entregador da Loja';
      const session: UserSession = {
        role: 'MOTOBOY',
        name: motoboyName,
        username: 'motoboy',
        motoboyId: targetBoy?.id || 'moto-1',
      };
      setCurrentUser(session);
      setActiveView('MOTOBOY_APP');
      addToast(`Bem-vindo, ${motoboyName}!`, 'Painel exclusivo do Motoboy ativo.', 'success');
    }
  };

  const logout = () => {
    if (isSyntheticStaffEmail(firebaseAuth.currentUser?.email)) {
      void signOutCloudAuth().catch(() => undefined);
    }
    setCurrentUser(null);
    setActiveView('PORTAL_LOGIN');
    addToast('Sessão Encerrada', 'Você retornou à tela de login da empresa.', 'info');
  };

  // =========================================================================
  // CONTROLE DE MESAS / COMANDAS DO BALCÃO
  // =========================================================================
  const getReservedUnitsInOpenTables = (productId: string): number => {
    return tables
      .filter((t) => t.status === 'OPEN')
      .reduce(
        (sum, t) =>
          sum +
          t.items
            .filter((it) => it.productId === productId)
            .reduce((s, it) => s + it.quantity * it.unitsPerItem, 0),
        0
      );
  };

  const openTable = (
    label: string,
    customerName?: string
  ): { success: boolean; table?: TableTab; error?: string } => {
    const cleanLabel = label.trim() || `Mesa ${tables.filter((t) => t.status === 'OPEN').length + 1}`;
    const alreadyOpen = tables.find(
      (t) => t.status === 'OPEN' && t.numberOrLabel.toLowerCase() === cleanLabel.toLowerCase()
    );
    if (alreadyOpen) {
      return { success: false, error: `A "${alreadyOpen.numberOrLabel}" já está aberta.` };
    }

    const newTable: TableTab = {
      id: `MESA-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      numberOrLabel: cleanLabel,
      customerName: customerName?.trim() || `Cliente ${cleanLabel}`,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      openedBy: currentUser?.name || 'Balcão',
      items: [],
      totalAmount: 0,
    };

    setTables((prev) => [newTable, ...prev]);
    runCloudTask(async () => {
      await syncTableToCloud(newTable, settings.staffEmails || []);
    });
    addToast('Mesa Aberta', `${newTable.numberOrLabel} (${newTable.customerName}) pronta para lançar itens.`, 'success');
    return { success: true, table: newTable };
  };

  const addProductToTable = (
    tableId: string,
    product: Product,
    presentation: PresentationOption,
    temperature: TemperatureOption,
    vasilhameOption: VasilhameOption
  ): { success: boolean; error?: string } => {
    const target = tables.find((t) => t.id === tableId && t.status === 'OPEN');
    if (!target) {
      return { success: false, error: 'Mesa não encontrada ou já fechada.' };
    }

    const unitsPerItem = presentation === 'FARDO' ? Math.max(1, product.conversionFactor) : 1;
    const reservedOther = getReservedUnitsInOpenTables(product.id);
    if (!settings.allowNegativeStock && reservedOther + unitsPerItem > product.currentBaseStock) {
      return {
        success: false,
        error: `Estoque insuficiente de "${product.name}". Disponível: ${Math.max(
          0,
          product.currentBaseStock - reservedOther
        )} un.`,
      };
    }

    const basePrice = presentation === 'FARDO' ? product.pricePack : product.priceUnit;
    const coldSurchargeUnit =
      temperature === 'GELADA'
        ? presentation === 'FARDO'
          ? product.coldSurchargePack
          : product.coldSurchargeUnit
        : 0;
    const vasilhameFeeUnit =
      product.isReturnable && vasilhameOption === 'COMPRAR_CASCO'
        ? (product.vasilhameDepositPrice || 3.5) * unitsPerItem
        : 0;
    const unitPrice = basePrice + coldSurchargeUnit + vasilhameFeeUnit;

    const existingIdx = target.items.findIndex(
      (it) =>
        it.productId === product.id &&
        it.presentation === presentation &&
        it.temperature === temperature &&
        it.vasilhameOption === vasilhameOption
    );

    let nextItems: TableTabItem[];
    if (existingIdx > -1) {
      nextItems = target.items.map((it, idx) => {
        if (idx !== existingIdx) return it;
        const newQty = it.quantity + 1;
        return {
          ...it,
          quantity: newQty,
          subtotal: unitPrice * newQty,
          addedAt: new Date().toISOString(),
        };
      });
    } else {
      const newItem: TableTabItem = {
        id: `mitem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        volume: product.volume,
        presentation,
        temperature,
        vasilhameOption,
        quantity: 1,
        unitsPerItem,
        unitPrice,
        coldSurchargeUnit,
        vasilhameFeeUnit,
        subtotal: unitPrice,
        addedAt: new Date().toISOString(),
      };
      nextItems = [...target.items, newItem];
    }

    const nextTable: TableTab = {
      ...target,
      items: nextItems,
      totalAmount: nextItems.reduce((s, it) => s + it.subtotal, 0),
    };
    setTables((prev) => prev.map((t) => (t.id === tableId ? nextTable : t)));
    runCloudTask(async () => {
      await syncTableToCloud(nextTable, settings.staffEmails || []);
    });

    return { success: true };
  };

  const updateTableItemQty = (
    tableId: string,
    itemId: string,
    delta: number
  ): { success: boolean; error?: string } => {
    const target = tables.find((t) => t.id === tableId && t.status === 'OPEN');
    if (!target) return { success: false, error: 'Mesa não encontrada ou já fechada.' };
    const item = target.items.find((it) => it.id === itemId);
    if (!item) return { success: false, error: 'Item não encontrado.' };

    if (delta > 0) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod && !settings.allowNegativeStock) {
        const reserved = getReservedUnitsInOpenTables(prod.id);
        if (reserved + delta * item.unitsPerItem > prod.currentBaseStock) {
          return {
            success: false,
            error: `Estoque insuficiente de "${prod.name}". Disponível: ${Math.max(
              0,
              prod.currentBaseStock - reserved
            )} un.`,
          };
        }
      }
    }

    const nextItems = target.items
      .map((it) => {
        if (it.id !== itemId) return it;
        const nextQty = it.quantity + delta;
        if (nextQty <= 0) return null;
        return {
          ...it,
          quantity: nextQty,
          subtotal: it.unitPrice * nextQty,
        };
      })
      .filter((it): it is TableTabItem => it !== null);

    const nextTable: TableTab = {
      ...target,
      items: nextItems,
      totalAmount: nextItems.reduce((s, it) => s + it.subtotal, 0),
    };
    setTables((prev) => prev.map((t) => (t.id === tableId ? nextTable : t)));
    runCloudTask(async () => {
      await syncTableToCloud(nextTable, settings.staffEmails || []);
    });

    return { success: true };
  };

  const removeTableItem = (tableId: string, itemId: string) => {
    const target = tables.find((t) => t.id === tableId && t.status === 'OPEN');
    if (!target) return;
    const nextItems = target.items.filter((it) => it.id !== itemId);
    const nextTable: TableTab = {
      ...target,
      items: nextItems,
      totalAmount: nextItems.reduce((s, it) => s + it.subtotal, 0),
    };
    setTables((prev) => prev.map((t) => (t.id === tableId ? nextTable : t)));
    runCloudTask(async () => {
      await syncTableToCloud(nextTable, settings.staffEmails || []);
    });
  };

  const renameTableCustomer = (tableId: string, customerName: string) => {
    const target = tables.find((t) => t.id === tableId && t.status === 'OPEN');
    if (!target) return;
    const nextTable: TableTab = { ...target, customerName };
    setTables((prev) => prev.map((t) => (t.id === tableId ? nextTable : t)));
    runCloudTask(async () => {
      await syncTableToCloud(nextTable, settings.staffEmails || []);
    });
  };

  const closeTableCheckout = async (
    tableId: string,
    paymentMethod: PaymentMethod,
    changeFor?: number
  ): Promise<{ success: boolean; order?: Order; table?: TableTab; error?: string }> => {
    if (cashShift.status === 'CLOSED') {
      return { success: false, error: 'O caixa está fechado! Abra o caixa antes de fechar a conta da mesa.' };
    }

    const table = tables.find((t) => t.id === tableId && t.status === 'OPEN');
    if (!table) {
      return { success: false, error: 'Mesa não encontrada ou já fechada.' };
    }
    if (table.items.length === 0) {
      return { success: false, error: 'Adicione pelo menos 1 item antes de fechar a mesa.' };
    }

    const checkoutInput: CheckoutInput = {
      channel: 'BALCAO_PDV',
      customer: {
        name: `${table.numberOrLabel} — ${table.customerName}`,
        phone: 'Mesa / Salão',
        address: settings.address || 'Consumo no Local',
        number: table.numberOrLabel,
        neighborhood: 'Mesa / Salão',
      },
      paymentMethod,
      changeFor,
      deliveryFee: 0,
      items: table.items.map((it) => ({
        productId: it.productId,
        presentation: it.presentation,
        temperature: it.temperature,
        vasilhameOption: it.vasilhameOption,
        quantity: it.quantity,
      })),
    };

    const nextOrderNumber = orders.length > 0 ? Math.max(...orders.map((o) => o.orderNumber)) + 1 : 1001;
    const result = executeOrderCheckout(checkoutInput, products, vasilhames, nextOrderNumber);

    if (!result.success || !result.order) {
      return { success: false, error: result.error || 'Erro ao fechar conta da mesa.' };
    }

    const fbUser = firebaseAuth.currentUser;
    const completedOrder: Order = {
      ...result.order,
      status: 'ENTREGUE',
      deliveredAt: new Date().toISOString(),
      ...(fbUser ? { customerUid: fbUser.uid, customerEmail: fbUser.email || '' } : {}),
    };

    if (result.updatedProducts) setProducts(result.updatedProducts);
    if (result.updatedVasilhames) setVasilhames(result.updatedVasilhames);

    knownOrderIdsRef.current.add(completedOrder.id);
    setOrders((prev) => [completedOrder, ...prev]);

    const amount = completedOrder.totalAmount;
    const nextCashShift: CashShift = {
      ...cashShift,
      balcaoCash: paymentMethod === 'DINHEIRO' ? cashShift.balcaoCash + amount : cashShift.balcaoCash,
      balcaoCard: paymentMethod === 'CARTAO_ENTREGA' ? cashShift.balcaoCard + amount : cashShift.balcaoCard,
      balcaoPix: paymentMethod === 'PIX' ? cashShift.balcaoPix + amount : cashShift.balcaoPix,
    };
    setCashShift(nextCashShift);

    const newStockMovs: StockMovement[] = table.items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const unitsDeducted = it.quantity * it.unitsPerItem;
      return {
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        productName: it.productName,
        type: 'VENDA',
        unitsQuantity: unitsDeducted,
        previousStock: prod?.currentBaseStock || 0,
        newStock: Math.max(0, (prod?.currentBaseStock || 0) - unitsDeducted),
        reason: `Fechamento ${table.numberOrLabel} Cupom #${completedOrder.orderNumber}`,
        createdAt: new Date().toISOString(),
      };
    });
    setStockMovements((prev) => [...newStockMovs, ...prev]);

    const closedTable: TableTab = {
      ...table,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closedBy: currentUser?.name || 'Balcão',
      paymentMethod,
      changeFor,
      orderId: completedOrder.id,
      orderNumber: completedOrder.orderNumber,
      totalAmount: completedOrder.totalAmount,
    };

    setTables((prev) => prev.map((t) => (t.id === tableId ? closedTable : t)));

    runCloudTask(async () => {
      const staffEmails = settings.staffEmails || [];
      await syncOrderCreateToCloud(completedOrder, staffEmails);
      await syncTableToCloud(closedTable, staffEmails);
      await syncCashShiftToCloud(nextCashShift, staffEmails);
      if (result.updatedProducts) {
        const orderedIds = new Set(table.items.map((i) => i.productId));
        for (const p of result.updatedProducts.filter((prod) => orderedIds.has(prod.id))) {
          await syncProductStockToCloud(p.id, p.currentBaseStock);
        }
      }
      if (result.updatedVasilhames) {
        for (const v of result.updatedVasilhames) {
          await syncVasilhameCountersToCloud(v);
        }
      }
      for (const mov of newStockMovs) {
        await syncStockMovementCreateToCloud(mov, staffEmails);
      }
    });

    soundService.playCashRegisterSound();
    addToast(
      `✅ ${table.numberOrLabel} Fechada!`,
      `Total recebido: R$ ${completedOrder.totalAmount.toFixed(2)} (${paymentMethod === 'CARTAO_ENTREGA' ? 'Cartão' : paymentMethod}).`,
      'success'
    );

    return { success: true, order: completedOrder, table: closedTable };
  };

  const cancelOpenTable = (tableId: string) => {
    const target = tables.find((t) => t.id === tableId && t.status === 'OPEN');
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    runCloudTask(async () => {
      await deleteTableFromCloud(tableId);
    });
    if (target) {
      addToast('Mesa Cancelada', `${target.numberOrLabel} foi removida sem cobrança.`, 'info');
    }
  };

  // Restauração de dados zerados
  const resetAllData = () => {
    setProducts(INITIAL_PRODUCTS);
    setVasilhames(INITIAL_VASILHAMES);
    setOrders([]);
    setMotoboys(INITIAL_MOTOBOYS);
    setCart([]);
    setTables([]);
    setLastCreatedOrderId(null);
    setCashFlows([]);
    setShiftHistory([]);
    setStockMovements([]);
    setSettings(DEFAULT_SETTINGS);
    setCashShift(DEFAULT_CASH_SHIFT);
    addToast('Sistema Zerado', 'Caixa fechado e pedidos/entregas zerados para início do turno.', 'info');
  };

  return (
    <BeverageContext.Provider
      value={{
        activeView,
        setActiveView,
        customerMobileFrame,
        setCustomerMobileFrame,
        deviceMode,
        setDeviceMode,
        toggleDeviceMode,
        currentUser,
        loginAsCustomer,
        loginAsEmployee,
        loginAsQuickRole,
        logout,
        products,
        vasilhames,
        orders,
        motoboys,
        cashShift,
        shiftHistory,
        cashFlows,
        settings,
        stockMovements,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotalAmount,
        cartTotalItemsCount,
        submitCustomerCheckout,
        submitBalcaoCheckout,
        updateOrderStatus,
        cancelOrder,
        assignMotoboyToOrder,
        settleMotoboyShift,
        restockProductStock,
        receiveEmptyVasilhames,
        sendOrderMessage,
        notifyCustomerArrival,
        addMotoboy,
        updateMotoboy,
        deleteMotoboy,
        toggleMotoboyOnline,
        openCashShift,
        closeCashShift,
        cleanCashShift,
        addCashFlowMovement,
        removeCashFlowMovement,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        updateSettings,
        soundEnabled,
        toggleSound,
        toasts,
        dismissToast,
        tables,
        openTable,
        addProductToTable,
        updateTableItemQty,
        removeTableItem,
        renameTableCustomer,
        closeTableCheckout,
        cancelOpenTable,
        resetAllData,
        lastCreatedOrderId,
        cloudUser,
        cloudAuthReady,
        cloudRoleStatus,
        cloudSyncing,
        cloudSyncError,
        staffAccounts,
        connectCloudGoogle,
        disconnectCloudGoogle,
        releaseCloudStoreOwnership,
        syncAllLocalToCloudNow,
        loginWithCloudUsername,
        createCloudStaffUser,
        toggleCloudStaffUserActive,
        deleteCloudStaffUser,
      }}
    >
      {children}
    </BeverageContext.Provider>
  );
};

export const useBeverage = () => {
  const context = useContext(BeverageContext);
  if (!context) {
    throw new Error('useBeverage must be used within a BeverageProvider');
  }
  return context;
};
