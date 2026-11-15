import { Product, Motoboy, VasilhameControl, Order } from '../types';
import { buildPdfCatalogProducts } from './pdfProducts';

export const INITIAL_VASILHAMES: VasilhameControl[] = [
  {
    id: 'vas-600',
    name: 'Garrafa 600ml Âmbar Cerveja',
    bottleType: '600ml Retornável',
    fullInStorage: 288,
    emptyInYard: 144,
    depositPrice: 3.50,
    totalInCirculationWithCustomers: 0,
  },
  {
    id: 'vas-1000',
    name: 'Garrafa Litrão 1.000ml Cerveja',
    bottleType: '1L Retornável',
    fullInStorage: 120,
    emptyInYard: 60,
    depositPrice: 5.00,
    totalInCirculationWithCustomers: 0,
  },
  {
    id: 'vas-coca2l',
    name: 'Garrafa PET RefPET 2L Coca-Cola',
    bottleType: '2L RefPET Retornável',
    fullInStorage: 84,
    emptyInYard: 36,
    depositPrice: 4.00,
    totalInCirculationWithCustomers: 0,
  },
];

export const INITIAL_PRODUCTS: Product[] = buildPdfCatalogProducts();

export const INITIAL_MOTOBOYS: Motoboy[] = [
  {
    id: 'moto-1',
    name: 'Cleiton "da Titan 160"',
    phone: '(21) 97947-4405',
    vehiclePlate: 'BRA-2E19',
    vehicleModel: 'Honda CG 160 Fan (Preta)',
    isOnline: true,
    activeDeliveriesCount: 0,
    totalDeliveriesCompletedToday: 0,
    totalCollectedCash: 0,
    totalCollectedCard: 0,
    totalCollectedPix: 0,
    commissionBalance: 0,
  },
  {
    id: 'moto-2',
    name: 'Tiago "Rápido" Oliveira',
    phone: '(21) 97654-3210',
    vehiclePlate: 'SPX-9J42',
    vehicleModel: 'Yamaha Fazer 250 (Azul)',
    isOnline: true,
    activeDeliveriesCount: 0,
    totalDeliveriesCompletedToday: 0,
    totalCollectedCash: 0,
    totalCollectedCard: 0,
    totalCollectedPix: 0,
    commissionBalance: 0,
  },
  {
    id: 'moto-3',
    name: 'Rogério Motoboy',
    phone: '(21) 99123-8877',
    vehiclePlate: 'DEP-4K88',
    vehicleModel: 'Honda Biz 125 (Branca com Baú Térmico)',
    isOnline: true,
    activeDeliveriesCount: 0,
    totalDeliveriesCompletedToday: 0,
    totalCollectedCash: 0,
    totalCollectedCard: 0,
    totalCollectedPix: 0,
    commissionBalance: 0,
  },
];

// Inicia zerado — nenhum pedido ou entrega pré-carregada ao abrir os links
export const INITIAL_ORDERS: Order[] = [];
