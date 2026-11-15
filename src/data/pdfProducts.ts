import { Product, ProductCategory } from '../types';

// Tupla compacta extraída 1-para-1 do PDF do catálogo do depósito:
// [Nome, Código, Preço, Estoque, Preço de Custo, Categoria PDF]
type RawPdfRow = [string, string, number, number, number, string];

const RAW_PDF_PRODUCTS: RawPdfRow[] = [
  // Página 1 + Página 6 (51 itens)
  ['3 ICE ( PROMOÇÃO )', '166', 18.00, 0, 0, ''],
  ['Agua 1,5', '93', 18.00, 0, 0, ''],
  ['Água 1,5L ( Unidades )', '94', 5.00, 7, 1.83, 'BEBIDAS'],
  ['AGUA COM GÁS', '29-WP', 3.00, 12, 2.00, 'BEBIDAS'],
  ['ÁGUA COM GÁS ( MALA )', '174', 23.00, 0, 0, ''],
  ['AGUA SEM GÁS', '30-WP', 2.00, 65, 1.00, 'BEBIDAS'],
  ['Água tônica', '83-WP', 6.00, 20, 2.58, 'BEBIDAS'],
  ['ALUMINIO ZOMO NARG', '197', 2.00, 45, 0.20, ''],
  ['AMENDOIM', '5-WP', 1.00, 20, 0.50, 'DOCES'],
  ['AMSTEL ( PARA O BAR )', '56-WP', 48.96, 0, 0, ''],
  ['AMSTEL ( PEC QUENTE )', '49-WP', 53.04, 0, 0, ''],
  ['AMSTEL 269ml ( Mala )', '162', 43.00, 0, 37.50, ''],
  ['AMSTEL 269ml ( PROMOÇÃO )', '116', 12.00, 0, 0, ''],
  ['AMSTEL 473ML ( unidades )', '26-WP', 6.00, 92, 4.00, 'CERVEJAS'],
  ['AMSTEL LATÃO ( PEC GELADO )', '27-WP', 55.08, 0, 0, ''],
  ['AMSTEL LATÃO PROMOÇÃO', '50-WP', 15.00, 0, 0, ''],
  ['ANTARCTICA 269ml ( unidades )', '000017', 3.50, 457, 2.33, 'CERVEJAS'],
  ['ANTARCTICA 269ML (MALA)', '0009', 40.00, 0, 0, ''],
  ['ANTARCTICA 26ML ( PARA O BAR )', '134', 36.00, 0, 0, ''],
  ['ANTARCTICA LATÃO ( PEC GELADO )', '78', 50.00, 0, 0, ''],
  ['ANTARCTICA LATÃO ( PEC QUENTE )', '48-WP', 47.00, 0, 0, ''],
  ['Antarctica Latão ( Promoção )', '198', 13.00, 0, 0, ''],
  ['ANTARCTICA LATÃO 473ML', '72', 5.00, 77, 3.08, 'CERVEJAS'],
  ['BALA', '51', 0.20, 0, 0.12, 'DOCES'],
  ["BALLANTINE'S SUNSHINE", '158', 70.00, 3, 52.00, 'DESTILADOS'],
  ['BALLANTINES SUSHINE + ENERGETICO 2LT', '193', 90.00, 0, 0, ''],
  ['Ballatines', '95', 70.00, 0, 50.00, 'DESTILADOS'],
  ['BALLY ( MALA )', '172', 48.00, 0, 0, ''],
  ['BALLY LATINHA', '106', 2.50, 0, 1.00, ''],
  ['bananada', '205', 0.50, 12, 0.35, ''],
  ['BANANANINHA', '89', 20.00, 1, 16.00, 'CACHAÇAS'],
  ['BATATA LAYS', '11-WP', 5.00, 3, 3.75, 'BISCOITOS'],
  ['BATATA LAYS 70g', '151', 10.00, 6, 7.08, 'BISCOITOS'],
  ['BEEFEATER PINK 700ML', '21-WP', 85.00, 4, 56.50, 'DESTILADOS'],
  ['BEEFEATER TRADICIONAL 750ML', '20-WP', 90.00, 3, 57.00, 'DESTILADOS'],
  ['BEIJO DOCILE', '80', 7.00, 6, 5.00, 'DOCES'],
  ['BLACK LABEL 1L', '86-WP', 140.00, 1, 126.00, ''],
  ['BOMBAY 750ML', '19-WP', 75.00, 3, 66.00, 'DESTILADOS'],
  ['BRAHMA 269ml ( unidades )', '147', 3.50, 64, 2.33, 'CERVEJAS'],
  ['BRAHMA 269ML (MALA)', '0010', 40.00, 0, 0, ''],
  ['BRAHMA LATÃO ( MALA )', '72-WP', 55.00, 0, 0, ''],
  ['BRAHMA LATÃO ( MALA QUENTE )', '81-WP', 52.08, 0, 0, ''],
  ['BRAHMA LATÃO 473ml', '71-WP', 5.00, 61, 3.54, 'CERVEJAS'],
  ["BUCHANAN'S - 12 ANOS", '135', 150.00, 8, 125.00, 'DESTILADOS'],
  ['BUSCA BRISA - RUM', '91-WP', 40.00, 4, 31.90, ''],
  ['BUSCA BRISA ( COMBO )', '203', 60.00, 0, 0, ''],
  ['BUSCA BRISA ( COPÃO )', '202', 10.00, 0, 0, ''],
  ['BUSCA BRISA ( DOSE )', '201', 4.00, 0, 3.00, ''],
  ['CAIXA CHOPINHO ( ANTARCTICA )', '67', 60.00, 0, 0, ''],
  ['CAIXA CHOPINHO ( BRAHMA )', '68', 62.99, 0, 0, ''],
  ['CALTON ( VAREJOS )', '000016', 1.50, 12, 0.64, 'CIGARROS'],

  // Página 2 + Página 7 (52 itens)
  ['CALTON MAÇO', '00002', 18.50, 82, 15.80, 'CIGARROS'],
  ['CAMEL BLUE BOX', '117', 14.50, 2, 12.00, 'CIGARROS'],
  ['CANUDINHO DOCILE', '126', 3.00, 36, 1.50, 'DOCES'],
  ['CARVÃO', '000012', 16.00, 19, 13.00, 'OUTROS...'],
  ['CARVÃO ZOMO NARG', '97-WP', 4.00, 0, 0.60, ''],
  ['CASA PERINI AQUARELA', '123', 50.00, 2, 35.00, 'DESTILADOS'],
  ['CASA PERINI BRUT ROSE', '122', 50.00, 1, 35.00, 'DESTILADOS'],
  ['CAVALO BRANCO', '31', 70.00, 3, 45.00, 'DESTILADOS'],
  ['CAVALO BRANCO ( DOSE )', '25-WP', 6.00, 0, 5.50, ''],
  ['CEBOLITOS', '124', 5.00, 5, 3.19, 'BISCOITOS'],
  ['CEDA', '27', 0.50, 0, 0.09, 'OUTROS...'],
  ['CEDA ( PACOTES )', '40', 4.00, 209, 1.60, 'OUTROS...'],
  ['CEDA (CAIXA)', '176', 40.00, 0, 0, 'OUTROS...'],
  ['CHANCELER 1L', '184', 20.00, 1, 14.00, 'DESTILADOS'],
  ['CHEETOS', '9-WP', 4.00, 6, 2.95, 'BISCOITOS'],
  ['CHICLETE', '71', 0.50, 129, 0.26, 'DOCES'],
  ['CHOPINHO ANTARCTICA ( PARA O BAR )', '132', 52.00, 0, 0, ''],
  ['CHOPINHO ANTARCTICA ( PROMOÇÃO )', '100', 13.00, 0, 2.04, ''],
  ['CHOPINHO ANTARCTICA 350ml', '98', 3.50, 49, 2.04, 'CERVEJAS'],
  ['CHOPINHO BRAHMA ( PARA O BAR )', '133', 55.01, 0, 0, ''],
  ['CHOPINHO BRAHMA ( PROMOÇÃO )', '101', 13.00, 0, 2.26, ''],
  ['CHOPINHO BRAHMA 350ml', '64', 3.50, 14, 2.26, 'CERVEJAS'],
  ['CHOPP DE VINHO 600ML', '40-WP', 8.00, 78, 5.29, "CHOPP/VINHOS & DRINK'S"],
  ['CHOPP DE VINHO 600ML ( MALA )', '168', 80.00, 0, 0, ''],
  ['CHOPP VINHO 2L', '41', 23.00, 92, 18.00, "CHOPP/VINHOS & DRINK'S"],
  ['CHOPP VINHO 2L ( PARA O BAR )', '64-WP', 15.00, 0, 0, ''],
  ['CHOPP VINHO 600ML ( PARA O BAR )', '62-WP', 5.00, 0, 0, ''],
  ['COCA 2L ( PARA O BAR )', '60-WP', 8.00, 0, 8.00, ''],
  ['COCA COLA 2L', '23-WP', 11.00, 73, 8.50, 'BEBIDAS'],
  ['COCA COLA 2L ( MALA 6 UNID )', '139', 55.00, 0, 0, ''],
  ['COCA COLA 2L ( MALA )', '80-WP', 58.02, 0, 0, ''],
  ['COCA LATA ( LATA COM 12 )', '79-WP', 42.00, 0, 36.00, ''],
  ['COCA LATA ( MALA )', '98-WP', 42.00, 0, 0, ''],
  ['COCA ZERO 2L', '105', 11.00, 20, 8.50, 'BEBIDAS'],
  ['COCA/FANTA LATA', '7-WP', 5.00, 40, 3.00, 'BEBIDAS'],
  ['COCA/FANTA RETORNAVEL', '54', 8.00, 79, 5.50, 'BEBIDAS'],
  ["COMBO BALLANTINE'S + ENERGÉTICO 2LT", '54-WP', 95.00, 0, 0, ''],
  ["COMBO BALLANTINE'S SUSHINE", '167', 115.00, 0, 0, ''],
  ['COMBO BALLANTINES + RED BULL', '194', 120.00, 0, 0, ''],
  ['COMBO BEEFEATER + ENERGÉTICO 2LT', '190', 100.00, 0, 0, ''],
  ['COMBO BEEFEATER + RED BULL', '53-WP', 135.00, 0, 0, ''],
  ['COMBO BLACK LABEL ( 5 GELO + 5 RED BULL )', '88-WP', 210.00, 0, 0, ''],
  ['COMBO BOMBAY + ENERGÉTICO 2LT', '191', 100.00, 0, 0, ''],
  ['COMBO BOMBAY + RED BULL', '52-WP', 130.00, 0, 0, ''],
  ["COMBO BUCHANNAN'S", '175', 210.00, 0, 0, ''],
  ['COMBO CAVALO BRANCO + ENERGÉTICO', '95-WP', 95.00, 0, 0, ''],
  ['COMBO GIN QN', '31-WP', 40.00, 0, 0, ''],
  ["COMBO GIN ROCK'S", '55-WP', 45.00, 0, 0, ''],
  ["COMBO GORDON'S + ENERGÉTICO 2LT", '188', 95.00, 0, 0, ''],
  ["COMBO GORDON'S + RED BULL", '189', 125.00, 0, 0, ''],
  ["COMBO JACK DANIEL'S 1L", '149', 175.00, 0, 0, ''],
  ['COMBO RED LABEL', '74', 110.01, 0, 0, ''],

  // Página 3 + Página 8 (52 itens)
  ['COMBO RED LABEL ( 10 GELOS + 5 RED BULL )', '76-WP', 130.00, 0, 0, ''],
  ["COMBO ROCK'S + RED BULL", '192', 80.00, 0, 0, ''],
  ['COMBO ROYAL BLUE/APPLE', '43', 40.00, 0, 0, ''],
  ['COMBO TANQUERAY + ENERGÉTICO 2LT', '186', 115.00, 0, 0, ''],
  ['COMBO TANQUERAY + RED BULL', '187', 145.00, 0, 0, ''],
  ['CONVENÇÃO ( MALA )', '70', 29.04, 0, 23.60, ''],
  ['CONVENÇÃO (PARA O BAR)', '59-WP', 4.00, 0, 0, ''],
  ['CONVENÇÃO 2L', '33-WP', 6.00, 63, 4.00, 'BEBIDAS'],
  ['CONVENÇÃO PEQUENO ( MALA )', '169', 20.00, 0, 0, ''],
  ['CONVENÇÃO PQ', '34-WP', 2.50, 24, 1.41, 'BEBIDAS'],
  ['COPÃO BALLATINES', '32', 15.00, 0, 12.00, ''],
  ['COPÃO DE GIN', '33', 10.00, 0, 1.00, ''],
  ['COPÃO DE WHISKY ( RED LABEL )', '50', 15.00, 0, 0, ''],
  ['COPÃO RED LABEL + RED BULL', '86', 25.00, 0, 7.66, ''],
  ['COPÃO ROYAL', '47', 10.00, 0, 0, ''],
  ['COPO 500ml', '28', 1.00, 0, 0.30, 'OUTROS...'],
  ['COPO DESCARTAVEL COPO 200ML', '24', 6.00, 5, 2.96, 'OUTROS...'],
  ['DENTE DOCILE', '79', 7.00, 0, 4.99, 'DOCES'],
  ['DERBY AZUL MAÇO', '0005', 16.50, 7, 15.50, 'CIGARROS'],
  ['DJARUM BLACK ( MAÇO )', '119', 26.00, 2, 22.00, 'CIGARROS'],
  ['DJARUM BLACK ( VAREJO )', '118', 3.00, 15, 1.10, 'CIGARROS'],
  ['DOCILE BANANAS', '125', 7.00, 0, 4.99, 'DOCES'],
  ['DORITOS 32g', '96', 5.00, 5, 3.59, 'BISCOITOS'],
  ['DORITOS 75g', '152', 10.00, 2, 7.11, 'BISCOITOS'],
  ['DORITOS DINAMITA', '179', 6.00, 7, 3.70, 'BISCOITOS'],
  ['DOSE ROYAL', '46', 4.00, 0, 2.00, ''],
  ['ENERGÉTICO BALLY', '000014', 12.00, 27, 6.91, 'BEBIDAS'],
  ['ENERGETICO MSX', '6-WP', 12.00, 4, 5.00, 'BEBIDAS'],
  ['ESSENCIA ZOMO NARG', '96-WP', 20.00, 17, 12.00, ''],
  ['FANDANGOS', '12-WP', 3.50, 9, 2.47, 'BISCOITOS'],
  ['FANTA 2L', '103', 10.00, 34, 6.25, 'BEBIDAS'],
  ['FANTA 2L ( MALA )', '160', 50.00, 0, 0, ''],
  ['FITA COPO 500ML (50 UNID)', '177', 12.00, 0, 0, ''],
  ['FOFURA', '4-WP', 3.00, 17, 1.59, 'BISCOITOS'],
  ['FÓSFORO ( UNIDADES )', '87', 1.00, 0, 0.30, 'OUTROS...'],
  ['FÓSFORO CAIXA', '88', 6.00, 0, 0, ''],
  ['GARRAFA (51) 1L', '18-WP', 15.00, 10, 9.83, 'CACHAÇAS'],
  ['GARRAFA 88 (1L)', '38-WP', 16.00, 0, 12.00, 'CACHAÇAS'],
  ['GARRAFA CATUABA (1L)', '36-WP', 12.00, 0, 9.00, 'CACHAÇAS'],
  ['GARRAFA DREHER (1L)', '39-WP', 22.00, 7, 14.50, 'CACHAÇAS'],
  ['GARRAFA F.PAULISTA (1L)', '35-WP', 30.00, 4, 27.00, 'CACHAÇAS'],
  ['GARRAFA MEL (1L)', '44', 12.00, 0, 9.00, 'CACHAÇAS'],
  ['GATORADE', '143', 7.00, 19, 3.91, 'BEBIDAS'],
  ['GATORADE ( MALA )', '173', 36.00, 0, 0, ''],
  ['GELATINA DOCILE', '185', 8.00, 0, 5.59, 'DOCES'],
  ['GELO', '56', 5.00, 0, 3.00, ''],
  ['GELO DE COCO', '000022', 3.00, 0, 1.00, 'OUTROS...'],
  ['GELO DE COCO ( CAIXA )', '170', 38.00, 0, 27.00, ''],
  ['GELO DE COCO ( PROMOÇÃO )', '26', 10.00, 0, 0, ''],
  ['GELO FILTRADO 5kg', '87-WP', 10.00, 0, 6.00, ''],
  ['GIN QN', '000013', 23.00, 17, 12.50, 'DESTILADOS'],
  ["GIN ROCK'S", '90', 30.00, 4, 22.50, 'DESTILADOS'],

  // Página 4 + Página 9 (52 itens)
  ['GLOBAL ( VAREJO )', '23', 0.70, 10, 0.37, 'CIGARROS'],
  ['GLOBAL MAÇO', '0006', 13.00, 9, 11.00, 'CIGARROS'],
  ['GOLD LABEL', '195', 230.00, 0, 175.00, ''],
  ['GORDON GIN', '130', 70.00, 2, 57.00, 'DESTILADOS'],
  ['GT BEATS', '61', 8.00, 51, 4.66, "CHOPP/VINHOS & DRINK'S"],
  ['Gt Beats mala', '91', 140.00, 0, 0, ''],
  ['GUARACAMP', '000001-WP', 2.00, 5761, 0.88, 'BEBIDAS'],
  ['GUARACAMP ( MALA )', '78-WP', 38.00, 0, 0, ''],
  ['GUARANÁ ANTARCTICA', '131', 10.00, 2, 5.66, 'BEBIDAS'],
  ['GULOZITOS', '204', 3.50, 8, 2.44, 'BISCOITOS'],
  ['HALLS/FREEGELLS', '000002-WP', 2.00, 34, 1.20, 'DOCES'],
  ['HEINEKEN', '000020', 7.00, 110, 5.20, 'CERVEJAS'],
  ['HEINEKEN LATÃO', '42-WP', 7.00, 18, 4.79, 'CERVEJAS'],
  ['HEINEKEN LATAO ( PEC QUENTE )', '45-WP', 68.04, 0, 61.00, ''],
  ['HEINEKEN LATAO (MALA)', '44-WP', 70.00, 0, 0, ''],
  ['HEINEKEN LONG NECK ( MALA )', '75-WP', 135.12, 0, 0, ''],
  ['ICE (MALA)', '77-WP', 125.04, 0, 0, ''],
  ['ICE 51', '41-WP', 7.00, 97, 4.08, "CHOPP/VINHOS & DRINK'S"],
  ['ICE SMIRNOFF', '84-WP', 8.00, 38, 4.79, "CHOPP/VINHOS & DRINK'S"],
  ['IMPÉRIO 269ml ( Mala )', '161', 30.00, 6, 23.88, ''],
  ['IMPÉRIO GOLD', '000019', 5.00, 44, 3.22, 'CERVEJAS'],
  ['IMPERIO GOLD ( PEC QUENTE )', '46-WP', 63.00, 0, 0, ''],
  ['IMPÉRIO GOLD ( PROMOÇÃO )', '30', 12.00, 0, 0, ''],
  ['IMPERIO GOLD (PEC GELADO)', '28-WP', 64.98, 0, 0, ''],
  ['IMPÉRIO HELLES ( MALA )', '138', 70.08, 0, 0, ''],
  ['IMPÉRIO LAGER ( MALA )', '145', 47.00, 0, 0, ''],
  ['IMPERIO LAGER ( PROMOÇÃO )', '154', 13.00, 0, 0, ''],
  ['IMPÉRIO LAGER 275ml', '144', 6.00, 52, 3.29, 'CERVEJAS'],
  ['IMPERIO LATÃO', '000018', 5.00, 23, 3.41, 'CERVEJAS'],
  ['IMPÉRIO LATÃO ( PARA O BAR )', '57-WP', 40.00, 0, 0, ''],
  ['IMPÉRIO LATÃO ( PEC GELADO )', '0011', 47.00, 0, 0, ''],
  ['IMPERIO LATÃO ( PEC QUENTE )', '47-WP', 45.00, 0, 0, ''],
  ['IMPERIO LATÃO ( PROMOÇÃO )', '55', 12.99, 0, 0, ''],
  ['IMPERIO ULTRA ( MALA )', '157', 62.04, 0, 3.88, ''],
  ['IMPERIO ULTRA 275ml', '156', 6.00, 15, 3.88, 'CERVEJAS'],
  ['IMPÉRIO ZERO', '113', 6.00, 73, 3.99, 'CERVEJAS'],
  ['IMPÉRIO ZERO ( CAIXA )', '74-WP', 60.00, 0, 0, ''],
  ['IMPÉRIO ZERO ( QUENTE )', '146', 56.00, 0, 0, ''],
  ['ISQUEIRO (P)', '163', 5.00, 1, 3.76, 'OUTROS...'],
  ['ISQUEIROS CHAMAS', '69', 3.00, 35, 0.80, 'OUTROS...'],
  ['ISQUERO BIC (G)', '120', 7.00, 8, 4.65, 'OUTROS...'],
  ['JACK DANIELS 1L ( MAÇÃ/OLD/HONEY/FIRE )', '65-WP', 130.00, 1, 102.00, 'DESTILADOS'],
  ['JACK JAMES 900ml', '150', 40.00, 5, 24.00, 'DESTILADOS'],
  ['JUJUBA EUCALIPTO', '60', 5.00, 8, 3.15, 'DOCES'],
  ['JUJUBA YOGURT', '200', 1.50, 2, 0.59, ''],
  ['JURUPINGA 1L', '85-WP', 35.00, 6, 23.00, "CHOPP/VINHOS & DRINK'S"],
  ['Licor QN', '104', 65.00, 2, 52.00, "CHOPP/VINHOS & DRINK'S"],
  ['LUCKY STRICKE DOUBLE ( VAREJOS )', '59', 1.50, 10, 0.55, 'CIGARROS'],
  ['LUCKY STRICKE DOUBLE MAÇO', '0003', 18.00, 7, 15.00, 'CIGARROS'],
  ['LUCKY STRICKE R.A', '42', 13.00, 9, 11.00, 'CIGARROS'],
  ['MALA AGUÁ 500ml', '85', 15.99, 0, 0, ''],
  ['MENTOS', '81', 2.00, 26, 1.21, 'DOCES'],

  // Página 5 + Página 10 (50 itens)
  ['MICHELOB ULTRA', '181', 7.00, 23, 5.00, 'CERVEJAS'],
  ['MICHELOB ULTRA ( 24 UNIDADE )', '182', 135.00, 0, 0, ''],
  ['MICHELOB ULTRA ( 3 CERVEJAS )', '183', 20.00, 0, 0, ''],
  ['MINISTER ( VAREJO )', '000015', 1.00, 19, 0.41, 'CIGARROS'],
  ['MINISTER MAÇO/BOX', '0001', 14.00, 46, 11.50, 'CIGARROS'],
  ['MINISTER RED BOX', '93-WP', 14.00, 0, 11.50, 'CIGARROS'],
  ['MIOJO', '32-WP', 3.50, 6, 2.20, 'OUTROS...'],
  ['MOLECAO', '199', 2.00, 17, 1.05, ''],
  ['MONSTER', '73-WP', 10.00, 92, 7.33, 'BEBIDAS'],
  ['MSX ( MALA )', '142', 45.00, 0, 0, ''],
  ['OLD PARR', '196', 130.00, 3, 109.00, ''],
  ['PASSOCA', '57', 0.70, 12, 0.41, 'DOCES'],
  ['PASSOCA ST QUADRADA', '90-WP', 2.00, 1, 0.79, 'DOCES'],
  ['PEC ICE COM 6 ( PROMOÇÃO )', '164', 35.00, 0, 0, ''],
  ['PERGOLA/GALIOTO ( VINHO )', '38', 25.00, 6, 18.50, "CHOPP/VINHOS & DRINK'S"],
  ['PINGO DE LEITE', '58', 0.50, 104, 0.31, 'DOCES'],
  ['PINK MOON FRISANTE 750ml', '159', 20.00, 7, 13.00, "CHOPP/VINHOS & DRINK'S"],
  ['PIRAQUÊ', '48', 5.00, 1, 2.89, 'BISCOITOS'],
  ['PIRULITO DO AMOR', '34', 1.00, 65, 0.39, 'DOCES'],
  ['PRESUNTINHO PIRAQUÊ', '128', 5.00, 19, 2.79, 'BISCOITOS'],
  ['PROMOÇÃO ANTARCTICA LATA 269ML', '16-WP', 12.00, 0, 0, ''],
  ['PROMOÇÃO BRAHMA LATA 269ml', '148', 12.00, 0, 0, ''],
  ['PROMOÇÃO GELO DE CÔCÔ', '24-WP', 10.00, 0, 0, ''],
  ['PROMOÇÃO GLOBAL', '66', 1.99, 0, 1.11, ''],
  ['PROMOÇÃO GT BEATS', '73', 18.00, 0, 0, ''],
  ['PROMOÇÃO PINK MOON 2L', '76', 40.00, 0, 0, ''],
  ['PROMOÇÃO PREMIUM', '29', 20.00, 0, 0, ''],
  ['RED BULL', '000021', 10.00, 16, 7.16, 'BEBIDAS'],
  ['RED BULL ( PROMOÇÃO )', '51-WP', 24.99, 0, 0, ''],
  ['RED BULL (MALA)', '92', 195.12, 0, 0, ''],
  ['RED LABEL', '39', 80.00, 4, 64.50, 'DESTILADOS'],
  ['RED LABEL ( DOSE )', '53', 7.00, 0, 6.00, ''],
  ['ROYAL APPLE', '37', 30.00, 16, 14.00, 'DESTILADOS'],
  ['ROYAL BLUE', '36', 30.00, 26, 12.00, 'DESTILADOS'],
  ['SALAME', '62', 15.00, 0, 7.80, 'OUTROS...'],
  ['SENSAÇAO', '10-WP', 7.00, 2, 4.49, 'BISCOITOS'],
  ['SPATEN ( MALA )', '137', 65.00, 0, 0, ''],
  ['SPATEN LATÃO ( MALA QUENTE )', '82-WP', 58.08, 0, 0, ''],
  ['Sucos', '102', 2.00, 0, 1.19, 'OUTROS...'],
  ['TANQUERAY 750ML', '22-WP', 90.00, 2, 68.00, 'DESTILADOS'],
  ['TICTAC', '171', 3.50, 0, 2.50, 'DOCES'],
  ['TORCIDA', '52', 3.00, 5, 1.69, 'BISCOITOS'],
  ['TRENTO', '15-WP', 3.00, 5, 2.00, 'DOCES'],
  ['TRIDENT', '3-WP', 3.50, 4, 2.14, 'DOCES'],
  ['TRIDENT SENSE', '89-WP', 8.00, 0, 5.75, 'DOCES'],
  ['VINHO 2L', '25', 26.00, 2, 21.00, "CHOPP/VINHOS & DRINK'S"],
  ['VINHO 2L ( PARA O BAR )', '61-WP', 20.00, 0, 0, ''],
  ['VODKA SMIRNOFF', '17-WP', 33.00, 2, 28.00, 'DESTILADOS'],
  ['WAFFER PIRAQUÊ', '94-WP', 5.00, 0, 2.39, ''],
  ['WINSTON BLUE BOX', '121', 13.50, 10, 11.00, 'CIGARROS'],
];

function inferCategory(name: string, rawCat: string): ProductCategory {
  const upperName = name.toUpperCase();
  const upperCat = rawCat.toUpperCase();

  if (
    upperName.includes('GELO') ||
    upperName.includes('CARVÃO') ||
    upperName.includes('CARVAO') ||
    upperName.includes('COPO') ||
    upperName.includes('FITA COPO') ||
    upperName.includes('ZOMO NARG') ||
    upperName.includes('CEDA') ||
    upperName.includes('ISQUEIRO') ||
    upperName.includes('ISQUERO') ||
    upperName.includes('FÓSFORO') ||
    upperName.includes('FOSFORO')
  ) {
    return 'gelo_churrasco';
  }

  if (
    upperCat === 'CERVEJAS' ||
    upperName.includes('AMSTEL') ||
    upperName.includes('ANTARCTICA') && !upperName.includes('GUARANÁ') ||
    upperName.includes('BRAHMA') ||
    upperName.includes('CHOPINHO') ||
    upperName.includes('HEINEKEN') ||
    upperName.includes('IMPÉRIO') ||
    upperName.includes('IMPERIO') ||
    upperName.includes('MICHELOB') ||
    upperName.includes('SPATEN')
  ) {
    return 'cervejas';
  }

  if (
    upperCat === 'BEBIDAS' ||
    upperName.includes('AGUA') ||
    upperName.includes('ÁGUA') ||
    upperName.includes('AGUÁ') ||
    upperName.includes('COCA') ||
    upperName.includes('FANTA') ||
    upperName.includes('CONVENÇÃO') ||
    upperName.includes('GUARACAMP') ||
    upperName.includes('GUARANÁ') ||
    upperName.includes('GATORADE') ||
    upperName.includes('MONSTER') ||
    upperName.includes('RED BULL') ||
    upperName.includes('BALLY') ||
    upperName.includes('ENERGETICO') ||
    upperName.includes('ENERGÉTICO') ||
    upperName.includes('MSX') ||
    upperName.includes('SUCOS')
  ) {
    return 'refrigerantes';
  }

  if (
    upperCat === 'DESTILADOS' ||
    upperCat === 'CACHAÇAS' ||
    upperCat.includes('CHOPP/VINHOS') ||
    upperName.includes('ICE') ||
    upperName.includes('COMBO') ||
    upperName.includes('COPÃO') ||
    upperName.includes('DOSE') ||
    upperName.includes('BALLANTINE') ||
    upperName.includes('BALLATINE') ||
    upperName.includes('BEEFEATER') ||
    upperName.includes('BLACK LABEL') ||
    upperName.includes('GOLD LABEL') ||
    upperName.includes('RED LABEL') ||
    upperName.includes('OLD PARR') ||
    upperName.includes('BUCHANAN') ||
    upperName.includes('BOMBAY') ||
    upperName.includes('BUSCA BRISA') ||
    upperName.includes('CAVALO BRANCO') ||
    upperName.includes('CHANCELER') ||
    upperName.includes('GORDON') ||
    upperName.includes('GIN') ||
    upperName.includes('JACK') ||
    upperName.includes('JURUPINGA') ||
    upperName.includes('LICOR') ||
    upperName.includes('TANQUERAY') ||
    upperName.includes('VODKA') ||
    upperName.includes('SMIRNOFF') ||
    upperName.includes('VINHO') ||
    upperName.includes('CHOPP') ||
    upperName.includes('PINK MOON') ||
    upperName.includes('CASA PERINI') ||
    upperName.includes('PERGOLA') ||
    upperName.includes('GT BEATS') ||
    upperName.includes('ROYAL') ||
    upperName.includes('GARRAFA') ||
    upperName.includes('BANANANINHA')
  ) {
    return 'destilados';
  }

  return 'petiscos';
}

function inferVolume(name: string): string {
  const match = name.match(/(\d+(?:[.,]\d+)?\s*(?:ml|l|lt|g|kg))/i);
  if (match) return match[1].replace(/\s+/g, '');
  if (/LAT[ÃA]O/i.test(name)) return '473ml';
  if (/LATA/i.test(name)) return '350ml';
  if (/RETORNAVEL/i.test(name)) return '2L';
  if (/DOSE/i.test(name)) return 'Dose';
  if (/COP[ÃA]O/i.test(name)) return '500ml';
  if (/MA[ÇC]O|BOX/i.test(name)) return 'Maço';
  return 'Unidade';
}

function inferBrand(name: string): string {
  const clean = name.replace(/\(.*?\)/g, '').trim();
  const firstWord = clean.split(/\s+/)[0] || 'Depósito';
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
}

export function buildPdfCatalogProducts(): Product[] {
  return RAW_PDF_PRODUCTS.map(([name, code, price, stock, cost, rawCat], index) => {
    const category = inferCategory(name, rawCat);
    const upper = name.toUpperCase();
    const isReturnable = upper.includes('RETORNAVEL');
    const isColdDrink =
      category === 'cervejas' ||
      category === 'refrigerantes' ||
      (category === 'destilados' &&
        (upper.includes('ICE') ||
          upper.includes('CHOPP') ||
          upper.includes('BEATS') ||
          upper.includes('COPÃO') ||
          upper.includes('VINHO') ||
          upper.includes('PINK MOON') ||
          upper.includes('COMBO')));

    const baseUnit: Product['baseUnit'] =
      category === 'cervejas' && !upper.includes('275') && !upper.includes('LONG NECK')
        ? 'LATA'
        : category === 'refrigerantes' && (upper.includes('2L') || upper.includes('1,5'))
        ? 'PET'
        : category === 'gelo_churrasco' && (upper.includes('GELO') || upper.includes('CARVÃO'))
        ? 'SACO'
        : 'UN';

    return {
      id: `pdf-${index + 1}-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      code,
      name: name.trim(),
      category,
      brand: inferBrand(name),
      image: '',
      description: `${name.trim()} — Cód. ${code}${rawCat ? ` (${rawCat})` : ''}`,
      volume: inferVolume(name),
      baseUnit,
      conversionFactor: 1,
      packName: 'Unidade',
      currentBaseStock: stock,
      minAlertStock: stock > 0 ? Math.min(5, stock) : 2,
      costUnit: cost > 0 ? cost : undefined,
      priceUnit: price,
      pricePack: price,
      supportsCold: isColdDrink,
      coldSurchargeUnit: 0,
      coldSurchargePack: 0,
      isReturnable,
      ...(isReturnable
        ? {
            vasilhameId: 'vas-coca2l',
            vasilhameName: 'Garrafa PET RefPET 2L',
            vasilhameDepositPrice: 4.0,
          }
        : {}),
    };
  });
}
