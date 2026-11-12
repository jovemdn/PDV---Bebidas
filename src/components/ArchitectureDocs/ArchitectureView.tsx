import React, { useState } from 'react';
import {
  Database,
  Radio,
  Code2,
  Copy,
  Check,
  Cpu,
  Layers,
  ShieldCheck,
  Server,
  Zap,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DATABASE' | 'SYNC' | 'CHECKOUT_CODE'>('DATABASE');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const sqlDDLCode = `-- ============================================================================
-- MODELAGEM RELACIONAL DE DADOS (POSTGRESQL 15+)
-- SISTEMA INTEGRADO DE DEPÓSITO DE BEBIDAS: DELIVERY EXPRESS + PDV DE BALCÃO
-- ============================================================================

-- 1. TABELA DE PRODUTOS PRINCIPAIS (ESTOQUE BASE UNIFICADO)
CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    marca VARCHAR(80) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- 'cervejas', 'destilados', 'refrigerantes', etc.
    unidade_base VARCHAR(10) NOT NULL DEFAULT 'UN', -- 'LATA', 'GARRAFA', 'PET', 'SACO'
    
    -- Venda Fracionada: Quantidade de unidades base que compõem o fardo/caixa
    fator_conversao INT NOT NULL DEFAULT 1, -- ex: 12 para fardo com 12 latas, 24 para engradado
    nome_embalagem_agrupada VARCHAR(60) DEFAULT 'Fardo c/ 12',
    
    -- Controle de Estoque Unificado (SEMPRE expresso na menor unidade base)
    estoque_base_atual INT NOT NULL DEFAULT 0 CHECK (estoque_base_atual >= 0),
    estoque_minimo_alerta INT NOT NULL DEFAULT 24,
    
    -- Preços Base
    preco_unidade DECIMAL(10, 2) NOT NULL,
    preco_fardo DECIMAL(10, 2) NOT NULL, -- Preço promocional do fardo fechado
    
    -- Regra de Temperatura
    suporta_gelada BOOLEAN NOT NULL DEFAULT true,
    acrescimo_gelada_unidade DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    acrescimo_gelada_fardo DECIMAL(10, 2) NOT NULL DEFAULT 3.00,
    
    -- Regra de Casco Retornável
    eh_retornavel BOOLEAN NOT NULL DEFAULT false,
    vasilhame_id UUID REFERENCES vasilhames(id) ON DELETE SET NULL,
    
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE VASILHAMES & CASCOS RETORNÁVEIS (PÁTIO E CERVEJARIAS)
CREATE TABLE vasilhames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL, -- ex: 'Garrafa 600ml Cerveja Âmbar', 'Litrão 1000ml'
    tipo_recipiente VARCHAR(50) NOT NULL,
    
    -- Estoque Físico de Cascos
    cheios_deposito INT NOT NULL DEFAULT 0, -- Prontos com líquido
    vazios_patio INT NOT NULL DEFAULT 0,    -- Cascos vazios aguardando caminhão da fábrica
    em_circulacao_clientes INT NOT NULL DEFAULT 0, -- Na rua com consumidores
    
    preco_caucao_novo DECIMAL(10, 2) NOT NULL DEFAULT 3.50, -- Cobrado se não houver troca
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE MOTOBOYS & ENTREGADORES
CREATE TABLE motoboys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    placa_veiculo VARCHAR(10) NOT NULL,
    modelo_veiculo VARCHAR(80),
    em_plantao BOOLEAN NOT NULL DEFAULT true,
    taxa_comissao_entrega DECIMAL(10, 2) NOT NULL DEFAULT 8.00,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE PEDIDOS (UNIFICADA: DELIVERY APP E BALCÃO PDV)
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_pedido SERIAL UNIQUE,
    canal_origem VARCHAR(20) NOT NULL, -- 'DELIVERY_APP' ou 'BALCAO_PDV'
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    -- 'PENDENTE', 'CONFIRMADO_PREPARO', 'AGUARDANDO_MOTOBOY', 'EM_ROTA', 'ENTREGUE', 'CANCELADO'
    
    -- Dados do Cliente
    cliente_nome VARCHAR(120) NOT NULL,
    cliente_telefone VARCHAR(25) NOT NULL,
    endereco_rua VARCHAR(150),
    endereco_numero VARCHAR(20),
    endereco_bairro VARCHAR(80),
    endereco_complemento VARCHAR(100),
    
    -- Logística de Entrega
    motoboy_id UUID REFERENCES motoboys(id) ON DELETE SET NULL,
    atribuido_em TIMESTAMP WITH TIME ZONE,
    entregue_em TIMESTAMP WITH TIME ZONE,
    
    -- Valores Financeiros
    subtotal_produtos DECIMAL(10, 2) NOT NULL,
    total_taxa_gelada DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_caucao_vasilhames DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxa_entrega DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    valor_total DECIMAL(10, 2) NOT NULL,
    
    -- Pagamento & Acerto
    forma_pagamento VARCHAR(30) NOT NULL, -- 'PIX', 'CARTAO_ENTREGA', 'DINHEIRO'
    troco_para DECIMAL(10, 2),
    pago BOOLEAN NOT NULL DEFAULT false,
    
    -- Controle Físico de Cascos do Pedido
    vasilhames_vazios_a_receber INT NOT NULL DEFAULT 0,
    vasilhames_novos_vendidos INT NOT NULL DEFAULT 0,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ITENS DO PEDIDO
CREATE TABLE pedido_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id),
    
    apresentacao VARCHAR(20) NOT NULL, -- 'UNIDADE' ou 'FARDO'
    temperatura VARCHAR(20) NOT NULL,  -- 'GELADA' ou 'NATURAL'
    opcao_vasilhame VARCHAR(30) NOT NULL DEFAULT 'NAO_APLICA', -- 'TROCA', 'COMPRAR_CASCO', 'NAO_APLICA'
    
    quantidade INT NOT NULL CHECK (quantidade > 0),
    unidades_base_baixadas INT NOT NULL, -- quantidade * fator_conversao
    preco_unitario_base DECIMAL(10, 2) NOT NULL,
    acrescimo_gelada DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    taxa_vasilhame DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10, 2) NOT NULL
);

-- 6. CAIXA & FECHAMENTO DE TURNO / MOTOBOY
CREATE TABLE caixa_turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operador_nome VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO', -- 'ABERTO', 'FECHADO'
    saldo_inicial_gaveta DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
    total_vendas_balcao_dinheiro DECIMAL(10, 2) DEFAULT 0.00,
    total_vendas_balcao_cartao DECIMAL(10, 2) DEFAULT 0.00,
    total_vendas_balcao_pix DECIMAL(10, 2) DEFAULT 0.00,
    total_delivery_arrecadado DECIMAL(10, 2) DEFAULT 0.00,
    aberto_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fechado_em TIMESTAMP WITH TIME ZONE
);

-- ÍNDICES DE ALTA PERFORMANCE PARA CONCORRÊNCIA EM TEMPO REAL
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_canal_origem ON pedidos(canal_origem);
CREATE INDEX idx_pedidos_motoboy_id ON pedidos(motoboy_id);
CREATE INDEX idx_produtos_estoque ON produtos(estoque_base_atual);`;

  const checkoutTypeScriptCode = `/**
 * ============================================================================
 * ESBOÇO DA LÓGICA DE CHECKOUT TRANSACIONAL (NODE.JS + TYPESCRIPT)
 * ============================================================================
 * 
 * Executada dentro de uma transação ACID com row-level lock (SELECT FOR UPDATE)
 * para garantir que o PDV de balcão e o App do cliente não vendam mais latas
 * do que existem no estoque físico unificado.
 */

import { PoolClient } from 'pg';

interface ItemCheckoutInput {
  produtoId: string;
  apresentacao: 'UNIDADE' | 'FARDO';
  temperatura: 'GELADA' | 'NATURAL';
  opcaoVasilhame: 'TROCA' | 'COMPRAR_CASCO' | 'NAO_APLICA';
  quantidade: number;
}

interface CheckoutPedidoInput {
  canal: 'DELIVERY_APP' | 'BALCAO_PDV';
  cliente: {
    nome: string;
    telefone: string;
    endereco: string;
    numero: string;
    bairro: string;
    complemento?: string;
  };
  itens: ItemCheckoutInput[];
  formaPagamento: 'PIX' | 'CARTAO_ENTREGA' | 'DINHEIRO';
  trocoPara?: number;
}

export async function processarCheckoutPedido(
  client: PoolClient,
  input: CheckoutPedidoInput
) {
  try {
    // Inicia a transação estrita
    await client.query('BEGIN');

    let subtotalProdutos = 0;
    let totalTaxaGelada = 0;
    let totalCaucaoVasilhames = 0;
    let totalVasilhamesTroca = 0;
    let totalVasilhamesNovosVendidos = 0;
    const itensProcessados = [];

    // 1. ITERAÇÃO E VALIDAÇÃO ATÔMICA ITEM A ITEM COM ROW LOCK
    for (const item of input.itens) {
      // Bloqueia a linha do produto contra race conditions (concorrência balcão vs app)
      const resProd = await client.query(
        \`SELECT id, nome, fator_conversao, estoque_base_atual,
                preco_unidade, preco_fardo, suporta_gelada,
                acrescimo_gelada_unidade, acrescimo_gelada_fardo,
                eh_retornavel, vasilhame_id
         FROM produtos 
         WHERE id = $1 AND ativo = true 
         FOR UPDATE\`,
        [item.produtoId]
      );

      if (resProd.rowCount === 0) {
        throw new Error(\`Produto ID \${item.produtoId} não encontrado ou inativo.\`);
      }

      const produto = resProd.rows[0];

      // 1.1 REGRA DE VENDA FRACIONADA:
      // O estoque base é único em latas/garrafas.
      // Se o cliente comprou fardo, multiplica a quantidade pelo fator de conversão.
      const unidadesPorEmbalagem =
        item.apresentacao === 'FARDO' ? produto.fator_conversao : 1;
      const unidadesBaixaEstoque = item.quantidade * unidadesPorEmbalagem;

      // Validação de saldo em estoque
      if (produto.estoque_base_atual < unidadesBaixaEstoque) {
        throw new Error(
          \`Estoque insuficiente para "\${produto.nome}". Disponível: \${produto.estoque_base_atual} un, Solicitado: \${unidadesBaixaEstoque} un.\`
        );
      }

      // 1.2 CÁLCULO DE PREÇO BASE (UNIDADE VS FARDO PROMOCIONAL)
      const precoBaseUnitario =
        item.apresentacao === 'FARDO' ? Number(produto.preco_fardo) : Number(produto.preco_unidade);
      const subtotalBaseItem = precoBaseUnitario * item.quantidade;

      // 1.3 REGRA DE TEMPERATURA (GELADA VS NATURAL)
      let taxaGeladaUnitario = 0;
      if (item.temperatura === 'GELADA' && produto.suporta_gelada) {
        taxaGeladaUnitario =
          item.apresentacao === 'FARDO'
            ? Number(produto.acrescimo_gelada_fardo)
            : Number(produto.acrescimo_gelada_unidade);
      }
      const subtotalGeladaItem = taxaGeladaUnitario * item.quantidade;

      // 1.4 REGRA DE GESTÃO DE VASILHAMES/CASCOS
      let taxaCaucaoCascoUnitario = 0;
      if (produto.eh_retornavel && produto.vasilhame_id) {
        // Bloqueia e consulta o registro do vasilhame
        const resVasilhame = await client.query(
          \`SELECT id, preco_caucao_novo FROM vasilhames WHERE id = $1 FOR UPDATE\`,
          [produto.vasilhame_id]
        );
        const precoCaucao = Number(resVasilhame.rows[0]?.preco_caucao_novo || 3.50);

        if (item.opcaoVasilhame === 'COMPRAR_CASCO') {
          // Cliente não tem garrafa para devolver: paga o vasilhame novo
          taxaCaucaoCascoUnitario = precoCaucao * unidadesPorEmbalagem;
          totalVasilhamesNovosVendidos += unidadesBaixaEstoque;

          // Atualiza registro de garrafas cheias e em circulação
          await client.query(
            \`UPDATE vasilhames 
             SET cheios_deposito = cheios_deposito - $1,
                 em_circulacao_clientes = em_circulacao_clientes + $1
             WHERE id = $2\`,
            [unidadesBaixaEstoque, produto.vasilhame_id]
          );
        } else if (item.opcaoVasilhame === 'TROCA') {
          // Cliente entrega o vasilhame na troca: taxa de caução = R$ 0,00
          taxaCaucaoCascoUnitario = 0;
          totalVasilhamesTroca += unidadesBaixaEstoque;

          // Dá baixa nas cheias e incrementa as vazias no pátio
          await client.query(
            \`UPDATE vasilhames 
             SET cheios_deposito = cheios_deposito - $1,
                 vazios_patio = vazios_patio + $1
             WHERE id = $2\`,
            [unidadesBaixaEstoque, produto.vasilhame_id]
          );
        }
      }
      const subtotalCaucaoItem = taxaCaucaoCascoUnitario * item.quantidade;

      // Subtotal final do item
      const itemSubtotalFinal = subtotalBaseItem + subtotalGeladaItem + subtotalCaucaoItem;

      subtotalProdutos += subtotalBaseItem;
      totalTaxaGelada += subtotalGeladaItem;
      totalCaucaoVasilhames += subtotalCaucaoItem;

      // 1.5 BAIXA ATÔMICA PROPORCIONAL NO ESTOQUE PRINCIPAL UNIFICADO
      await client.query(
        \`UPDATE produtos 
         SET estoque_base_atual = estoque_base_atual - $1,
             atualizado_em = NOW()
         WHERE id = $2\`,
        [unidadesBaixaEstoque, produto.id]
      );

      itensProcessados.push({
        produtoId: produto.id,
        apresentacao: item.apresentacao,
        temperatura: item.temperatura,
        opcaoVasilhame: item.opcaoVasilhame,
        quantidade: item.quantidade,
        unidadesBaseBaixadas: unidadesBaixaEstoque,
        precoBaseUnitario,
        taxaGeladaUnitario,
        taxaCaucaoCascoUnitario,
        subtotal: itemSubtotalFinal,
      });
    }

    // 2. CONSOLIDAÇÃO DO PEDIDO
    const taxaEntrega = input.canal === 'DELIVERY_APP' ? 7.00 : 0.00;
    const valorTotal = subtotalProdutos + totalTaxaGelada + totalCaucaoVasilhames + taxaEntrega;

    const resPedido = await client.query(
      \`INSERT INTO pedidos (
        canal_origem, status, cliente_nome, cliente_telefone,
        endereco_rua, endereco_numero, endereco_bairro, endereco_complemento,
        subtotal_produtos, total_taxa_gelada, total_caucao_vasilhames,
        taxa_entrega, valor_total, forma_pagamento, troco_para,
        vasilhames_vazios_a_receber, vasilhames_novos_vendidos
      ) VALUES (
        $1, 'PENDENTE', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING id, numero_pedido, criado_em\`,
      [
        input.canal,
        input.cliente.nome,
        input.cliente.telefone,
        input.cliente.endereco,
        input.cliente.numero,
        input.cliente.bairro,
        input.cliente.complemento || null,
        subtotalProdutos,
        totalTaxaGelada,
        totalCaucaoVasilhames,
        taxaEntrega,
        valorTotal,
        input.formaPagamento,
        input.trocoPara || null,
        totalVasilhamesTroca,
        totalVasilhamesNovosVendidos,
      ]
    );

    const pedidoCriado = resPedido.rows[0];

    // Grava os itens individuais
    for (const item of itensProcessados) {
      await client.query(
        \`INSERT INTO pedido_itens (
          pedido_id, produto_id, apresentacao, temperatura, opcao_vasilhame,
          quantidade, unidades_base_baixadas, preco_unitario_base,
          acrescimo_gelada, taxa_vasilhame, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)\`,
        [
          pedidoCriado.id,
          item.produtoId,
          item.apresentacao,
          item.temperatura,
          item.opcaoVasilhame,
          item.quantidade,
          item.unidadesBaseBaixadas,
          item.precoBaseUnitario,
          item.taxaGeladaUnitario,
          item.taxaCaucaoCascoUnitario,
          item.subtotal,
        ]
      );
    }

    // Comita com segurança a transação
    await client.query('COMMIT');

    // 3. DISPARO DO EVENTO EM TEMPO REAL VIA WEBSOCKET / SUPABASE CHANNELS
    // notificarPDVNovoPedido({
    //   pedidoId: pedidoCriado.id,
    //   numeroPedido: pedidoCriado.numero_pedido,
    //   valorTotal,
    //   itens: itensProcessados,
    //   vasilhamesAReceber: totalVasilhamesTroca
    // });

    return {
      sucesso: true,
      pedidoId: pedidoCriado.id,
      numeroPedido: pedidoCriado.numero_pedido,
      valorTotal,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                Arquitetura de Solução & Engenharia
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Especificação Técnica do Ecossistema SaaS para Depósito de Bebidas
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Modelagem do banco de dados relacional com integridade estrita, estratégia de sincronização em tempo real (PDV / KDS / App) e função transacional com baixa fracionada e cascos.
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('DATABASE')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'DATABASE'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>1. Banco de Dados (SQL)</span>
            </button>

            <button
              onClick={() => setActiveTab('SYNC')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'SYNC'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>2. Sincronização & Tempo Real</span>
            </button>

            <button
              onClick={() => setActiveTab('CHECKOUT_CODE')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'CHECKOUT_CODE'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>3. Lógica Checkout (TS)</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MODELAGEM DO BANCO DE DADOS */}
      {activeTab === 'DATABASE' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Explicação Arquitetural */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-white uppercase">Por que PostgreSQL (Relacional)?</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Depósitos de bebidas lidam com dinheiro vivo na gaveta, acerto com motoboys e estoque físico unitário. Garantias <strong>ACID</strong> são mandatórias para evitar overselling quando balcão e delivery vendem a mesma lata simultaneamente.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-white uppercase">Estoque Base Unificado</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nunca duplique o estoque em "tabela de latas" e "tabela de fardos". O estoque reside 100% na menor unidade base (<code className="text-cyan-300">estoque_base_atual</code>) e o <code className="text-cyan-300">fator_conversao</code> dá a baixa proporcional exata.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                <Server className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black text-white uppercase">Pátio de Vasilhames</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controle tridimensional: garrafas cheias no depósito, cascos vazios no pátio para devolução à cervejaria Ambev/Heineken e garrafas com clientes, gerando auditoria contábil.
              </p>
            </div>
          </div>

          {/* Code Block DDL */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">
                  database/schema.sql (PostgreSQL DDL)
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(sqlDDLCode, 'sql')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copiedId === 'sql' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar DDL SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-5 text-xs text-slate-200 font-mono overflow-x-auto max-h-[500px] leading-relaxed">
              {sqlDDLCode}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: ARQUITETURA DE SINCRONIZAÇÃO */}
      {activeTab === 'SYNC' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Matriz Comparativa */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              Comparativo de Estratégias de Sincronização em Tempo Real
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Estratégia</th>
                    <th className="py-2.5 px-3">Latência de Entrega</th>
                    <th className="py-2.5 px-3">Custo de Servidor & Conexões</th>
                    <th className="py-2.5 px-3">Reconexão 4G (Motoboys)</th>
                    <th className="py-2.5 px-3">Veredito para Depósito Brasileiro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className="bg-amber-500/5">
                    <td className="py-3 px-3 font-bold text-amber-400">
                      ⭐ Supabase Realtime / PostgreSQL CDC
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">&lt; 150ms</td>
                    <td className="py-3 px-3 text-slate-300">Baixo (Broadcast + Presence)</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">Excelente (Auto-Heartbeat)</td>
                    <td className="py-3 px-3 text-emerald-300 font-bold">
                      RECOMENDADO: Une o poder relacional do Postgres com WebSockets automáticos nas tabelas de pedidos e estoque.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-white">
                      Node.js WebSockets Dedicado (Socket.io)
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">&lt; 50ms</td>
                    <td className="py-3 px-3 text-slate-300">Médio (Requer Redis pub/sub)</td>
                    <td className="py-3 px-3 text-emerald-400">Muito Boa com Polling Fallback</td>
                    <td className="py-3 px-3 text-slate-300">
                      Ótimo para SaaS proprietário sob medida com salas privadas por loja (<code className="text-amber-300">deposito_id</code>).
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-white">Firebase Realtime / Firestore</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">&lt; 200ms</td>
                    <td className="py-3 px-3 text-amber-400">Alto em escala (Cobrança por read/write)</td>
                    <td className="py-3 px-3 text-emerald-400">Excelente (Offline Persistence)</td>
                    <td className="py-3 px-3 text-slate-400">
                      Bom para o app do cliente, mas deficiente em transações SQL complexas de fechamento de caixa e concorrência no balcão.
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-slate-400">HTTP Polling Tradicional (ex: 5s)</td>
                    <td className="py-3 px-3 text-red-400 font-bold">5 a 10 segundos</td>
                    <td className="py-3 px-3 text-red-400">Muito alto (requisições vazias)</td>
                    <td className="py-3 px-3 text-slate-400">Insensível à queda</td>
                    <td className="py-3 px-3 text-red-400 font-semibold">
                      INADEQUADO: O cliente quer que a cerveja saia em 15 minutos; 10s de delay atrasa a expedição e perde o "plim" do novo pedido.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagrama de Fluxo e Alerta Sonoro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Ciclo de Vida do Evento de Novo Pedido
              </h4>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-white block">Cliente fecha no WebApp</strong>
                    <span className="text-slate-400 text-[11px]">Transação ACID executada no Postgres com lock.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-white block">Broadcast via WebSocket Room</strong>
                    <span className="text-slate-400 text-[11px]">Evento <code className="text-amber-400">order:created</code> disparado para a sala do depósito.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-white block">KDS Toca Alarme Sonoro Polyphonic</strong>
                    <span className="text-slate-400 text-[11px]">A tela do caixa pisca e toca o carrilhão de entrega (Web Audio API).</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0">
                    4
                  </span>
                  <div>
                    <strong className="text-white block">Atualização Global de Estoque</strong>
                    <span className="text-slate-400 text-[11px]">Todos os apps de clientes conectados têm o estoque da Heineken decrementado instantaneamente sem reload.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> Desafio Específico do Brasil: 4G do Motoboy
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Motoboys transitam por áreas de sombra de sinal de operadoras (Claro, Vivo, TIM). Para o fechamento de caixa e atribuição de rotas:
              </p>
              <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
                <li>
                  <strong className="text-white">Fila Local Offline (IndexedDB / Service Worker):</strong> O app do entregador salva a confirmação de entrega e o valor recebido em dinheiro mesmo se a moto estiver num túnel ou condomínio fechado.
                </li>
                <li>
                  <strong className="text-white">Idempotência de Transação:</strong> Toda confirmação carrega um UUID único de requisição para evitar que o caixa contabilize duas vezes a mesma entrega quando o sinal 4G restabelecer.
                </li>
                <li>
                  <strong className="text-white">Alerta Visual de Cascos no KDS:</strong> O KDS imprime na comanda térmica a quantidade de garrafas retornáveis que o motoboy DEVE trazer de volta na mochila/baú.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LÓGICA DE CÓDIGO (TYPESCRIPT CHECKOUT) */}
      {activeTab === 'CHECKOUT_CODE' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2">
                  src/services/checkoutService.ts (Node.js / TypeScript)
                </span>
              </div>
              <button
                onClick={() => copyToClipboard(checkoutTypeScriptCode, 'ts')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                {copiedId === 'ts' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Código TypeScript</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-5 text-xs text-slate-200 font-mono overflow-x-auto max-h-[600px] leading-relaxed">
              {checkoutTypeScriptCode}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
