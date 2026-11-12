import { Product, CartItem, Order, PaymentMethod, VasilhameControl } from '../types';

/**
 * ============================================================================
 * SERVIÇO DE CHECKOUT TRANSACIONAL - DEPÓSITO DE BEBIDAS
 * ============================================================================
 * 
 * Regras de Negócio Implementadas:
 * 1. Venda Fracionada:
 *    - Unidade vs Fardo (ex: Fardo c/ 12).
 *    - O estoque unificado é mantido SEMPRE na menor unidade base (latas/garrafas).
 *    - 1 fardo dá baixa de N unidades no estoque unificado.
 * 
 * 2. Controle de Temperatura:
 *    - Produto "Gelada" possui acréscimo dinâmico parametrizável (ex: +R$ 1,50 na lata / +R$ 3,00 no fardo).
 *    - Produto "Natural" cobra apenas o preço base.
 * 
 * 3. Gestão de Vasilhames/Cascos Retornáveis:
 *    - Se o cliente entrega o casco vazio na troca: acréscimo R$ 0,00 e incrementa o pátio de cascos vazios.
 *    - Se o cliente compra o líquido + casco (sem vasilhame na troca): adiciona taxa de caução do casco
 *      e baixa o estoque de recipientes.
 * 
 * 4. Validação Atômica de Estoque:
 *    - Impede over-selling mesmo com concorrência entre app delivery e PDV de balcão.
 */

export interface CheckoutInputItem {
  productId: string;
  presentation: 'UNIDADE' | 'FARDO';
  temperature: 'GELADA' | 'NATURAL';
  vasilhameOption: 'TROCA' | 'COMPRAR_CASCO' | 'NAO_APLICA';
  quantity: number;
}

export interface CustomerDataInput {
  name: string;
  phone: string;
  address: string;
  number: string;
  neighborhood: string;
  complement?: string;
}

export interface CheckoutInput {
  channel: 'DELIVERY_APP' | 'BALCAO_PDV';
  customer: CustomerDataInput;
  items: CheckoutInputItem[];
  paymentMethod: PaymentMethod;
  changeFor?: number;
  deliveryFee?: number;
}

export interface CheckoutResult {
  success: boolean;
  order?: Order;
  error?: string;
  updatedProducts?: Product[];
  updatedVasilhames?: VasilhameControl[];
}

/**
 * Função de checkout executável em TypeScript
 */
export function executeOrderCheckout(
  input: CheckoutInput,
  currentProducts: Product[],
  currentVasilhames: VasilhameControl[],
  orderCounter: number
): CheckoutResult {
  // Clones defensivos para simular a transação atômica do banco de dados
  const productsMap = new Map<string, Product>(
    currentProducts.map((p) => [p.id, { ...p }])
  );
  const vasilhamesMap = new Map<string, VasilhameControl>(
    currentVasilhames.map((v) => [v.id, { ...v }])
  );

  let subtotalProducts = 0;
  let totalColdSurcharge = 0;
  let totalVasilhameFee = 0;
  let totalCost = 0;
  let totalVasilhamesTroca = 0;
  let totalVasilhamesNovos = 0;

  const orderItems = [];

  // =========================================================================
  // ETAPA 1: Validação de Estoque e Cálculo de Preço Dinâmico Item a Item
  // =========================================================================
  for (const itemInput of input.items) {
    if (itemInput.quantity <= 0) {
      return { success: false, error: `Quantidade inválida para o item.` };
    }

    const product = productsMap.get(itemInput.productId);
    if (!product) {
      return { success: false, error: `Produto ID ${itemInput.productId} não foi encontrado.` };
    }

    // 1.1 Cálculo da baixa fracionada no estoque base
    // Exemplo: 2 Fardos c/ 12 = 24 latas de baixa
    const unitsPerPackage = itemInput.presentation === 'FARDO' ? product.conversionFactor : 1;
    const requiredBaseUnits = itemInput.quantity * unitsPerPackage;

    if (product.currentBaseStock < requiredBaseUnits) {
      return {
        success: false,
        error: `Estoque insuficiente de "${product.name}". Solicitado: ${requiredBaseUnits} un, Disponível em estoque: ${product.currentBaseStock} un.`,
      };
    }

    // 1.2 Cálculo de Preço Base (Unidade vs Fardo)
    let unitBasePrice = 0;
    if (itemInput.presentation === 'FARDO') {
      unitBasePrice = product.pricePack;
    } else {
      unitBasePrice = product.priceUnit;
    }

    // 1.3 Adicional de Temperatura (Gelada vs Natural)
    let itemColdSurchargeUnit = 0;
    if (itemInput.temperature === 'GELADA') {
      itemColdSurchargeUnit =
        itemInput.presentation === 'FARDO'
          ? product.coldSurchargePack
          : product.coldSurchargeUnit;
    }
    const itemTotalCold = itemColdSurchargeUnit * itemInput.quantity;

    // 1.4 Adicional de Vasilhame/Casco Retornável
    let itemCascoFeeUnit = 0;
    if (product.isReturnable) {
      if (itemInput.vasilhameOption === 'COMPRAR_CASCO') {
        // Cliente não tem vasilhame para devolver: paga o líquido + o vasilhame novo
        const depositPrice = product.vasilhameDepositPrice || 3.5;
        // Se for fardo/engradado, multiplica pelo fator de conversão de garrafas
        itemCascoFeeUnit = depositPrice * (itemInput.presentation === 'FARDO' ? product.conversionFactor : 1);
        totalVasilhamesNovos += requiredBaseUnits;
      } else if (itemInput.vasilhameOption === 'TROCA') {
        // Cliente entrega casco na troca: taxa R$ 0,00
        itemCascoFeeUnit = 0;
        totalVasilhamesTroca += requiredBaseUnits;
      }
    }
    const itemTotalCasco = itemCascoFeeUnit * itemInput.quantity;

    // 1.5 Subtotal do item
    const itemTotalBase = unitBasePrice * itemInput.quantity;
    const itemSubtotal = itemTotalBase + itemTotalCold + itemTotalCasco;
    const unitCost = product.costUnit || 0;
    const itemTotalCost = unitCost * requiredBaseUnits;

    subtotalProducts += itemTotalBase;
    totalColdSurcharge += itemTotalCold;
    totalVasilhameFee += itemTotalCasco;
    totalCost += itemTotalCost;

    // 1.6 Deduz estoque atômico no mapa em memória
    product.currentBaseStock -= requiredBaseUnits;

    // 1.7 Atualiza o pátio de vasilhames
    if (product.isReturnable && product.vasilhameId) {
      const vasilhame = vasilhamesMap.get(product.vasilhameId);
      if (vasilhame) {
        // Reduz estoque de garrafas cheias
        vasilhame.fullInStorage = Math.max(0, vasilhame.fullInStorage - requiredBaseUnits);

        // Se o cliente entregou o vasilhame na troca, alimenta os cascos vazios no pátio
        if (itemInput.vasilhameOption === 'TROCA') {
          vasilhame.emptyInYard += requiredBaseUnits;
        } else {
          // Garrafa foi para o mercado com o cliente
          vasilhame.totalInCirculationWithCustomers += requiredBaseUnits;
        }
      }
    }

    orderItems.push({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      presentation: itemInput.presentation,
      temperature: itemInput.temperature,
      vasilhameOption: itemInput.vasilhameOption,
      quantity: itemInput.quantity,
      unitsCount: requiredBaseUnits,
      unitPrice: unitBasePrice,
      coldSurcharge: itemColdSurchargeUnit,
      vasilhameFee: itemCascoFeeUnit,
      subtotal: itemSubtotal,
      unitCost,
      totalCost: itemTotalCost,
    });
  }

  // =========================================================================
  // ETAPA 2: Consolidação dos Totais e Fechamento do Pedido
  // =========================================================================
  const deliveryFee = input.deliveryFee ?? (input.channel === 'DELIVERY_APP' ? 7.00 : 0.00);
  const totalAmount = subtotalProducts + totalColdSurcharge + totalVasilhameFee + deliveryFee;
  const grossProfit = subtotalProducts + totalColdSurcharge - totalCost;

  // Validação de troco
  if (input.paymentMethod === 'DINHEIRO' && input.changeFor) {
    if (input.changeFor < totalAmount) {
      return {
        success: false,
        error: `O valor do troco (R$ ${input.changeFor.toFixed(2)}) não pode ser menor que o total do pedido (R$ ${totalAmount.toFixed(2)}).`,
      };
    }
  }

  const newOrder: Order = {
    id: `ORD-${Date.now()}`,
    orderNumber: orderCounter,
    channel: input.channel,
    status: 'PENDENTE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: { ...input.customer },
    items: orderItems,
    subtotalProducts,
    totalColdSurcharge,
    totalVasilhameFee,
    deliveryFee,
    totalAmount,
    totalCost,
    grossProfit,
    paymentMethod: input.paymentMethod,
    changeFor: input.changeFor,
    estimatedDeliveryMinutes: input.channel === 'DELIVERY_APP' ? 25 : 0,
    vasilhamesVaziosAReceber: totalVasilhamesTroca,
    vasilhamesNovosVendidos: totalVasilhamesNovos,
  };

  return {
    success: true,
    order: newOrder,
    updatedProducts: Array.from(productsMap.values()),
    updatedVasilhames: Array.from(vasilhamesMap.values()),
  };
}
