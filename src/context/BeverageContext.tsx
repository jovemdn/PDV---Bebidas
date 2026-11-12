import React, { createContext, useContext, useState } from 'react';
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
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_VASILHAMES,
  INITIAL_MOTOBOYS,
  INITIAL_ORDERS,
} from '../data/mockData';
import { executeOrderCheckout, CheckoutInput } from '../services/checkoutService';
import { soundService } from '../services/soundService';

interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'success' | 'warning' | 'info';
  timestamp: string;
}

const DEFAULT_SETTINGS: DepotSettings = {
  storeName: 'GelaFácil Express',
  phone: '(11) 98765-4321',
  address: 'Av. das Bebidas, 1500',
  neighborhood: 'Centro Comercial',
  city: 'São Paulo - SP',
  cnpj: '12.345.678/0001-90',
  defaultDeliveryFee: 7.00,
  minDeliveryMinutes: 15,
  maxDeliveryMinutes: 30,
  motoboyCommission: 8.00,
  allowNegativeStock: false,
  autoPrintReceipt: true,
  cancelPassword: '123',
  ownerWhatsApp: '5521960185101',
  ownerEmail: 'tvhisoka@gmail.com',
};

const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-heineken-350',
    productName: 'Cerveja Heineken Lata 350ml',
    type: 'ENTRADA',
    unitsQuantity: 240,
    previousStock: 0,
    newStock: 240,
    reason: 'Entrada de Nota Fiscal Cervejaria Ambev/Heineken #8492',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'mov-2',
    productId: 'prod-original-600',
    productName: 'Cerveja Original 600ml Retornável',
    type: 'AJUSTE',
    unitsQuantity: 288,
    previousStock: 0,
    newStock: 288,
    reason: 'Inventário Inicial de Engradados',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

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
  }) => Motoboy;
  updateMotoboy: (id: string, updated: Partial<Motoboy>) => void;
  deleteMotoboy: (id: string) => void;
  toggleMotoboyOnline: (id: string) => void;
  
  // Caixa Management (Abrir, Fechar, Limpar)
  openCashShift: (initialFloat: number, cashierName: string) => void;
  closeCashShift: (countedCash: number, notes?: string) => CashShiftRecord;
  cleanCashShift: () => void;
  
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
  
  // Utility
  resetAllData: () => void;
  lastCreatedOrderId: string | null;
}

const BeverageContext = createContext<BeverageContextType | undefined>(undefined);

export const BeverageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeView, setActiveView] = useState<'PORTAL_LOGIN' | 'CUSTOMER_APP' | 'EMPLOYEE_PDV' | 'MOTOBOY_APP' | 'SYSTEM_ARCHITECTURE'>('PORTAL_LOGIN');
  const [customerMobileFrame, setCustomerMobileFrame] = useState(true);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('DESKTOP');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [vasilhames, setVasilhames] = useState<VasilhameControl[]>(INITIAL_VASILHAMES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [motoboys, setMotoboys] = useState<Motoboy[]>(INITIAL_MOTOBOYS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastCreatedOrderId, setLastCreatedOrderId] = useState<string | null>(null);

  const [settings, setSettings] = useState<DepotSettings>(DEFAULT_SETTINGS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_STOCK_MOVEMENTS);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Caixa Turno Atual
  const [cashShift, setCashShift] = useState<CashShift>({
    id: 'SHIFT-2026-11-02-1',
    cashierName: 'Fernanda (Balcão 01)',
    status: 'OPEN',
    openedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    initialFloat: 200.00,
    balcaoCash: 146.00,
    balcaoCard: 380.30,
    balcaoPix: 189.00,
    deliveryCash: 184.50,
    deliveryCard: 320.00,
    deliveryPix: 205.59,
  });

  const [shiftHistory, setShiftHistory] = useState<CashShiftRecord[]>([]);

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

    const nextOrderNumber = orders.length > 0 ? Math.max(...orders.map((o) => o.orderNumber)) + 1 : 1050;
    const result = executeOrderCheckout(checkoutInput, products, vasilhames, nextOrderNumber);

    if (!result.success || !result.order) {
      return { success: false, error: result.error || 'Falha ao processar checkout' };
    }

    if (result.updatedProducts) setProducts(result.updatedProducts);
    if (result.updatedVasilhames) setVasilhames(result.updatedVasilhames);

    setOrders((prev) => [result.order!, ...prev]);
    setLastCreatedOrderId(result.order.id);
    clearCart();

    // Registra movimento de venda no histórico
    result.order.items.forEach((it) => {
      const prod = products.find((p) => p.id === it.productId);
      if (prod) {
        setStockMovements((prev) => [
          {
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            productId: it.productId,
            productName: it.productName,
            type: 'VENDA',
            unitsQuantity: it.unitsCount,
            previousStock: prod.currentBaseStock,
            newStock: Math.max(0, prod.currentBaseStock - it.unitsCount),
            reason: `Venda Delivery Pedido #${result.order!.orderNumber}`,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    });

    soundService.playNewOrderChime();
    addToast(
      '🚨 NOVO PEDIDO DELIVERY CHEGANDO!',
      `Pedido #${result.order.orderNumber} por ${result.order.customer.name} - Total: R$ ${result.order.totalAmount.toFixed(2)}`,
      'order'
    );

    return { success: true, orderId: result.order.id };
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

    const nextOrderNumber = orders.length > 0 ? Math.max(...orders.map((o) => o.orderNumber)) + 1 : 1050;
    const result = executeOrderCheckout(checkoutInput, products, vasilhames, nextOrderNumber);

    if (!result.success || !result.order) {
      return { success: false, error: result.error || 'Erro na venda balcão' };
    }

    const completedBalcaoOrder: Order = {
      ...result.order,
      status: 'ENTREGUE',
      deliveredAt: new Date().toISOString(),
    };

    if (result.updatedProducts) setProducts(result.updatedProducts);
    if (result.updatedVasilhames) setVasilhames(result.updatedVasilhames);

    setOrders((prev) => [completedBalcaoOrder, ...prev]);

    // Atualiza caixa do balcão
    setCashShift((prev) => {
      const amount = completedBalcaoOrder.totalAmount;
      return {
        ...prev,
        balcaoCash: paymentMethod === 'DINHEIRO' ? prev.balcaoCash + amount : prev.balcaoCash,
        balcaoCard: paymentMethod === 'CARTAO_ENTREGA' ? prev.balcaoCard + amount : prev.balcaoCard,
        balcaoPix: paymentMethod === 'PIX' ? prev.balcaoPix + amount : prev.balcaoPix,
      };
    });

    // Registra movimento de venda no estoque
    items.forEach((it) => {
      setStockMovements((prev) => [
        {
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: it.productId,
          productName: it.product.name,
          type: 'VENDA',
          unitsQuantity: it.unitsDeductedFromBaseStock,
          previousStock: it.product.currentBaseStock,
          newStock: Math.max(0, it.product.currentBaseStock - it.unitsDeductedFromBaseStock),
          reason: `Venda Balcão Cupom #${completedBalcaoOrder.orderNumber}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });

    soundService.playCashRegisterSound();
    addToast('Venda Balcão Concluída!', `Cupom #${completedBalcaoOrder.orderNumber} - R$ ${completedBalcaoOrder.totalAmount.toFixed(2)}`, 'success');

    return { success: true };
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, motoboyId?: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const updated: Order = {
            ...order,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };

          if (newStatus === 'ENTREGUE') {
            updated.deliveredAt = new Date().toISOString();
          }

          if (motoboyId) {
            const boy = motoboys.find((m) => m.id === motoboyId);
            updated.motoboyId = motoboyId;
            updated.motoboyName = boy?.name;
            updated.motoboyAssignedAt = new Date().toISOString();
          }

          return updated;
        }
        return order;
      })
    );

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

    // 1. Atualiza status do pedido para CANCELADO
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'CANCELADO',
              canceledAt: nowIso,
              canceledBy,
              cancelReason,
              updatedAt: nowIso,
            }
          : o
      )
    );

    // 2. Estorna unidades para o estoque físico e registra movimentação
    const newMovements: StockMovement[] = [];
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
          return { ...p, currentBaseStock: nextStock };
        }
        return p;
      })
    );

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // 3. Estorna vasilhames caso haja itens retornáveis
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

        return {
          ...v,
          fullInStorage: v.fullInStorage + deltaFull,
          emptyInYard: Math.max(0, v.emptyInYard + deltaEmpty),
          totalInCirculationWithCustomers: Math.max(
            0,
            v.totalInCirculationWithCustomers + deltaCirc
          ),
        };
      })
    );

    // 4. Estorna valor do caixa se a venda foi feita no Balcão (ou hoje no turno atual)
    if (targetOrder.channel === 'BALCAO_PDV') {
      const amount = targetOrder.totalAmount;
      setCashShift((prev) => ({
        ...prev,
        balcaoCash:
          targetOrder.paymentMethod === 'DINHEIRO'
            ? Math.max(0, prev.balcaoCash - amount)
            : prev.balcaoCash,
        balcaoCard:
          targetOrder.paymentMethod === 'CARTAO_ENTREGA'
            ? Math.max(0, prev.balcaoCard - amount)
            : prev.balcaoCard,
        balcaoPix:
          targetOrder.paymentMethod === 'PIX'
            ? Math.max(0, prev.balcaoPix - amount)
            : prev.balcaoPix,
      }));
    }

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
    if (!targetMotoboy) return;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: 'EM_ROTA',
            motoboyId,
            motoboyName: targetMotoboy.name,
            motoboyAssignedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        return ord;
      })
    );

    setMotoboys((prev) =>
      prev.map((m) => {
        if (m.id === motoboyId) {
          return {
            ...m,
            activeDeliveriesCount: m.activeDeliveriesCount + 1,
          };
        }
        return m;
      })
    );

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

    setMotoboys((prev) =>
      prev.map((m) => {
        if (m.id === motoboyId) {
          return {
            ...m,
            totalCollectedCash: 0,
            totalCollectedCard: 0,
            totalCollectedPix: 0,
            activeDeliveriesCount: 0,
          };
        }
        return m;
      })
    );

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
    setVasilhames((prev) =>
      prev.map((v) => {
        if (v.id === vasilhameId) {
          return {
            ...v,
            emptyInYard: v.emptyInYard + quantity,
            totalInCirculationWithCustomers: Math.max(0, v.totalInCirculationWithCustomers - quantity),
          };
        }
        return v;
      })
    );
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

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            messages: [...(ord.messages || []), newMessage],
            updatedAt: new Date().toISOString(),
          };
        }
        return ord;
      })
    );

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
    };
    setMotoboys((prev) => [...prev, newBoy]);
    addToast('Motoboy Cadastrado!', `${newBoy.name} foi adicionado à frota de entregadores.`, 'success');
    return newBoy;
  };

  const updateMotoboy = (id: string, updated: Partial<Motoboy>) => {
    setMotoboys((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
    );
    addToast('Entregador Atualizado', 'As informações do motoboy foram salvas.', 'success');
  };

  const deleteMotoboy = (id: string) => {
    const boy = motoboys.find((m) => m.id === id);
    setMotoboys((prev) => prev.filter((m) => m.id !== id));
    addToast('Entregador Removido', `${boy?.name || 'Motoboy'} foi removido da frota.`, 'info');
  };

  const toggleMotoboyOnline = (id: string) => {
    setMotoboys((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = !m.isOnline;
          addToast(
            nextStatus ? 'Entregador em Plantão' : 'Entregador Off-line',
            `${m.name} está agora ${nextStatus ? 'disponível para entregas' : 'fora de plantão'}`,
            'info'
          );
          return { ...m, isOnline: nextStatus };
        }
        return m;
      })
    );
  };

  // =========================================================================
  // GESTÃO DE CAIXA: ABRIR, FECHAR E LIMPAR CAIXA
  // =========================================================================
  const openCashShift = (initialFloat: number, cashierName: string) => {
    const newShift: CashShift = {
      id: `SHIFT-${Date.now()}`,
      cashierName,
      status: 'OPEN',
      openedAt: new Date().toISOString(),
      initialFloat: Math.max(0, initialFloat),
      balcaoCash: 0,
      balcaoCard: 0,
      balcaoPix: 0,
      deliveryCash: 0,
      deliveryCard: 0,
      deliveryPix: 0,
    };
    setCashShift(newShift);
    soundService.playCashRegisterSound();
    addToast('Caixa Aberto com Sucesso!', `Operador: ${cashierName} | Fundo Inicial: R$ ${initialFloat.toFixed(2)}`, 'success');
  };

  const closeCashShift = (countedCash: number, notes?: string): CashShiftRecord => {
    const totalBalcao = cashShift.balcaoCash + cashShift.balcaoCard + cashShift.balcaoPix;
    const totalDelivery = cashShift.deliveryCash + cashShift.deliveryCard + cashShift.deliveryPix;
    const totalSales = totalBalcao + totalDelivery;

    // Dinheiro físico esperado na gaveta = Fundo inicial + Vendas em dinheiro no balcão + Dinheiro de delivery acertado
    const expectedFinalCash = cashShift.initialFloat + cashShift.balcaoCash + cashShift.deliveryCash;
    const diff = countedCash - expectedFinalCash; // Quebra (negativo) ou sobra (positivo)

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
      expectedFinalCash,
      finalCashInDrawer: countedCash,
      closingDifference: diff,
      totalCostOfGoods,
      totalGrossProfit,
      ordersCount: validTodayOrders.length,
      canceledOrdersCount: canceledTodayOrders.length,
      canceledTotalValue,
      soldProducts,
      notes,
    };

    setShiftHistory((prev) => [record, ...prev]);

    setCashShift((prev) => ({
      ...prev,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      closingCashInDrawer: countedCash,
      closingDifference: diff,
      closingNotes: notes,
    }));

    soundService.playCashRegisterSound();
    addToast(
      'Caixa Fechado com Sucesso!',
      `Faturado: R$ ${totalSales.toFixed(2)} | Lucro (custo abatido): R$ ${totalGrossProfit.toFixed(2)} | Diferença: ${diff >= 0 ? '+' : ''}R$ ${diff.toFixed(2)}`,
      'info'
    );

    return record;
  };

  const cleanCashShift = () => {
    // Limpa todas as movimentações financeiras do caixa atual e zera a gaveta
    setCashShift({
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
    });
    addToast('Caixa Zerado & Limpo!', 'Todas as movimentações do turno foram limpas com sucesso.', 'info');
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

    // Registra movimento de estoque inicial
    setStockMovements((prev) => [
      {
        id: `mov-${Date.now()}`,
        productId: newId,
        productName: newProd.name,
        type: 'ENTRADA',
        unitsQuantity: newProd.currentBaseStock,
        previousStock: 0,
        newStock: newProd.currentBaseStock,
        reason: 'Cadastro Inicial de Produto no Sistema',
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    addToast('Produto Cadastrado!', `${newProd.name} foi adicionado ao catálogo.`, 'success');
    return newProd;
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          // Se o estoque foi alterado diretamente
          if (updated.currentBaseStock !== undefined && updated.currentBaseStock !== p.currentBaseStock) {
            setStockMovements((movements) => [
              {
                id: `mov-${Date.now()}`,
                productId: p.id,
                productName: updated.name || p.name,
                type: 'AJUSTE',
                unitsQuantity: Math.abs(updated.currentBaseStock! - p.currentBaseStock),
                previousStock: p.currentBaseStock,
                newStock: updated.currentBaseStock!,
                reason: 'Edição Cadastral de Produto',
                createdAt: new Date().toISOString(),
              },
              ...movements,
            ]);
          }
          return { ...p, ...updated };
        }
        return p;
      })
    );
    addToast('Produto Atualizado!', 'As informações foram salvas com sucesso.', 'success');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast('Produto Removido', `${prod?.name || 'Item'} foi excluído do catálogo.`, 'info');
  };

  const adjustStock = (
    productId: string,
    quantity: number,
    mode: 'ABSOLUTE' | 'DELTA',
    reason: string,
    type: 'ENTRADA' | 'AJUSTE' | 'PERDA'
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const prevStock = p.currentBaseStock;
          let nextStock = prevStock;

          if (mode === 'ABSOLUTE') {
            nextStock = Math.max(0, quantity);
          } else {
            nextStock = Math.max(0, prevStock + quantity);
          }

          const diff = Math.abs(nextStock - prevStock);

          setStockMovements((movements) => [
            {
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              productId: p.id,
              productName: p.name,
              type,
              unitsQuantity: diff,
              previousStock: prevStock,
              newStock: nextStock,
              reason: reason || 'Ajuste manual de estoque',
              createdAt: new Date().toISOString(),
            },
            ...movements,
          ]);

          return {
            ...p,
            currentBaseStock: nextStock,
          };
        }
        return p;
      })
    );
    addToast('Estoque Atualizado', `Estoque ajustado com motivo: ${reason}`, 'success');
  };

  // =========================================================================
  // CONFIGURAÇÕES DO SISTEMA / DEPÓSITO
  // =========================================================================
  const updateSettings = (newSettings: Partial<DepotSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
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
      const session: UserSession = {
        role: 'DONO',
        name: 'Sr. Dono (Gerente Geral)',
        username: cleanUser,
      };
      setCurrentUser(session);
      setActiveView('EMPLOYEE_PDV');
      addToast('Acesso Dono Liberado', 'Controle total da loja, estoque, produtos, motoboys e caixa.', 'success');
      return { success: true };
    }

    // Role detection: Motoboy
    if (cleanUser === 'motoboy' || cleanUser.includes('entrega') || specificMotoboyId) {
      const targetId = specificMotoboyId || 'boy-1';
      const m = motoboys.find((boy) => boy.id === targetId) || motoboys[0];
      const session: UserSession = {
        role: 'MOTOBOY',
        name: m ? m.name : 'Entregador da Loja',
        username: cleanUser || 'motoboy',
        motoboyId: m?.id || 'boy-1',
      };
      setCurrentUser(session);
      setActiveView('MOTOBOY_APP');
      addToast(`Olá, ${session.name}!`, 'Painel do Entregador ativo no celular. Boas entregas!', 'success');
      return { success: true };
    }

    // Role detection: Balcão / Caixa
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
      const targetBoy = motoboys.find((b) => b.id === (motoboyId || 'boy-1')) || motoboys[0];
      const session: UserSession = {
        role: 'MOTOBOY',
        name: targetBoy.name,
        username: 'motoboy',
        motoboyId: targetBoy.id,
      };
      setCurrentUser(session);
      setActiveView('MOTOBOY_APP');
      addToast(`Bem-vindo, ${targetBoy.name}!`, 'Painel exclusivo do Motoboy no celular ativo.', 'success');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveView('PORTAL_LOGIN');
    addToast('Sessão Encerrada', 'Você retornou ao portal de acesso do depósito.', 'info');
  };

  // Restauração de dados padrão para testes
  const resetAllData = () => {
    setProducts(INITIAL_PRODUCTS);
    setVasilhames(INITIAL_VASILHAMES);
    setOrders(INITIAL_ORDERS);
    setMotoboys(INITIAL_MOTOBOYS);
    setCart([]);
    setSettings(DEFAULT_SETTINGS);
    setCashShift({
      id: 'SHIFT-2026-11-02-1',
      cashierName: 'Fernanda (Balcão 01)',
      status: 'OPEN',
      openedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      initialFloat: 200.00,
      balcaoCash: 146.00,
      balcaoCard: 380.30,
      balcaoPix: 189.00,
      deliveryCash: 184.50,
      deliveryCard: 320.00,
      deliveryPix: 205.59,
    });
    addToast('Dados Restaurados', 'Todos os dados de demonstração foram reinicializados.', 'info');
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
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        updateSettings,
        soundEnabled,
        toggleSound,
        toasts,
        dismissToast,
        resetAllData,
        lastCreatedOrderId,
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
