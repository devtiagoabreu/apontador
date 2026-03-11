import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { producoesTable, insertProducaoRecordSchema } from '@/lib/db/schema/producoes';
import { ops } from '@/lib/db/schema/ops';
import { maquinas } from '@/lib/db/schema/maquinas';
import { usuarios } from '@/lib/db/schema/usuarios';
import { estagios } from '@/lib/db/schema/estagios';
import { eq, sql, and } from 'drizzle-orm';
import { z } from 'zod';

// Funções auxiliares para conversão segura
const safeParseFloat = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  if (str.trim() === '') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
};

const safeParseBoolean = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  if (typeof value === 'number') return value === 1;
  return false;
};

const safeParseInt = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  if (str.trim() === '') return null;
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
};

const safeParseString = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

// Schema de validação para iniciar produção
const iniciarProducaoSchema = z.object({
  opId: z.number().int().positive('OP é obrigatória'),
  maquinaId: z.string().uuid('Máquina inválida'),
  operadorInicioId: z.string().uuid('Operador inválido'),
  estagioId: z.string().uuid('Estágio inválido'),
  isReprocesso: z.boolean().default(false),
  observacoes: z.string().optional(),
});

// GET - Listar produções
export async function GET(request: Request) {
  console.log('📦 GET /api/producoes - Iniciando');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // 🔴 NOVOS FILTROS
    const ativas = searchParams.get('ativas') === 'true';
    const opId = searchParams.get('opId');
    const maquinaId = searchParams.get('maquinaId');
    const estagioId = searchParams.get('estagioId');
    const dataInicio = searchParams.get('dataInicio');
    const dataFim = searchParams.get('dataFim');

    console.log(`📊 Buscando produções - página ${page}, limite ${limit}`);
    console.log('📊 Filtros:', { ativas, opId, maquinaId, estagioId, dataInicio, dataFim });

    // Construir query base
    let query = sql`
      SELECT 
        p.*,
        o.op as op_numero,
        o.produto as op_produto,
        o.qtde_programado as op_programado,
        o.qtde_carregado as op_carregado,
        o.um as op_um,
        m.nome as maquina_nome,
        m.codigo as maquina_codigo,
        ui.nome as operador_inicio_nome,
        ui.matricula as operador_inicio_matricula,
        uf.nome as operador_fim_nome,
        uf.matricula as operador_fim_matricula,
        e.nome as estagio_nome,
        e.codigo as estagio_codigo,
        e.cor as estagio_cor
      FROM producoes p
      LEFT JOIN ops o ON p.op_id = o.op
      LEFT JOIN maquinas m ON p.maquina_id = m.id
      LEFT JOIN usuarios ui ON p.operador_inicio_id = ui.id
      LEFT JOIN usuarios uf ON p.operador_fim_id = uf.id
      LEFT JOIN estagios e ON p.estagio_id = e.id
      WHERE 1=1
    `;

    // Aplicar filtros
    if (ativas) {
      query = sql`${query} AND p.data_fim IS NULL`;
    }
    
    if (opId) {
      query = sql`${query} AND p.op_id = ${parseInt(opId)}`;
    }
    
    if (maquinaId) {
      query = sql`${query} AND p.maquina_id = ${maquinaId}`;
    }
    
    if (estagioId) {
      query = sql`${query} AND p.estagio_id = ${estagioId}`;
    }

    // 🔴 NOVOS FILTROS DE PERÍODO
    if (dataInicio) {
      query = sql`${query} AND p.data_inicio >= ${dataInicio}`;
    }
    
    if (dataFim) {
      query = sql`${query} AND p.data_inicio <= ${dataFim}`;
    }

    // Ordenação e paginação
    query = sql`${query} ORDER BY p.data_inicio DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await db.execute(query);

    // Contar total com os mesmos filtros
    let countQuery = sql`SELECT COUNT(*) as total FROM producoes p WHERE 1=1`;
    
    if (ativas) {
      countQuery = sql`${countQuery} AND p.data_fim IS NULL`;
    }
    if (opId) {
      countQuery = sql`${countQuery} AND p.op_id = ${parseInt(opId)}`;
    }
    if (maquinaId) {
      countQuery = sql`${countQuery} AND p.maquina_id = ${maquinaId}`;
    }
    if (estagioId) {
      countQuery = sql`${countQuery} AND p.estagio_id = ${estagioId}`;
    }
    if (dataInicio) {
      countQuery = sql`${countQuery} AND p.data_inicio >= ${dataInicio}`;
    }
    if (dataFim) {
      countQuery = sql`${countQuery} AND p.data_inicio <= ${dataFim}`;
    }

    const totalResult = await db.execute(countQuery);
    const total = Number(totalResult.rows[0]?.total || 0);

    // Formatar dados com funções de conversão segura
    const data = result.rows.map((row: any) => ({
      id: safeParseString(row.id),
      opId: safeParseInt(row.op_id),
      maquinaId: safeParseString(row.maquina_id),
      operadorInicioId: safeParseString(row.operador_inicio_id),
      operadorFimId: safeParseString(row.operador_fim_id) || null,
      estagioId: safeParseString(row.estagio_id),
      dataInicio: safeParseString(row.data_inicio),
      dataFim: safeParseString(row.data_fim) || null,
      metragemProgramada: safeParseFloat(row.metragem_programada),
      metragemProcessada: safeParseFloat(row.metragem_processada),
      isReprocesso: safeParseBoolean(row.is_reprocesso),
      observacoes: safeParseString(row.observacoes) || null,
      createdAt: safeParseString(row.created_at),
      updatedAt: safeParseString(row.updated_at),
      op: {
        op: safeParseInt(row.op_numero),
        produto: safeParseString(row.op_produto),
        programado: safeParseFloat(row.op_programado),
        carregado: safeParseFloat(row.op_carregado),
        um: safeParseString(row.op_um),
      },
      maquina: {
        nome: safeParseString(row.maquina_nome),
        codigo: safeParseString(row.maquina_codigo),
      },
      operadorInicio: {
        nome: safeParseString(row.operador_inicio_nome),
        matricula: safeParseString(row.operador_inicio_matricula),
      },
      operadorFim: row.operador_fim_nome ? {
        nome: safeParseString(row.operador_fim_nome),
        matricula: safeParseString(row.operador_fim_matricula),
      } : null,
      estagio: {
        nome: safeParseString(row.estagio_nome),
        codigo: safeParseString(row.estagio_codigo),
        cor: safeParseString(row.estagio_cor) || '#3b82f6',
      },
    }));

    console.log(`✅ Retornando ${data.length} produções de ${total} total`);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('❌ Erro ao buscar produções:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar produções' },
      { status: 500 }
    );
  }
}

// POST - Iniciar nova produção
export async function POST(request: Request) {
  console.log('='.repeat(50));
  console.log('📦 POST /api/producoes - INICIAR PRODUÇÃO');
  console.log('='.repeat(50));
  
  try {
    // 1. Verificar autenticação
    console.log('🔐 Verificando autenticação...');
    const session = await getServerSession(authOptions);
    console.log('👤 Sessão:', session?.user?.id);
    
    if (!session) {
      console.log('❌ Não autorizado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Receber body
    console.log('📨 Recebendo body...');
    const body = await request.json();
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    // 3. Validar dados
    console.log('🔍 Validando dados...');
    let validated;
    try {
      validated = iniciarProducaoSchema.parse(body);
      console.log('✅ Dados validados com sucesso:', validated);
    } catch (validationError) {
      console.error('❌ Erro de validação:', validationError);
      
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', detalhes: validationError.errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro de validação desconhecido' },
        { status: 400 }
      );
    }

    // 4. Verificar se OP existe
    console.log('🔍 Buscando OP:', validated.opId);
    const op = await db.query.ops.findFirst({
      where: eq(ops.op, validated.opId),
    });

    if (!op) {
      console.log('❌ OP não encontrada:', validated.opId);
      return NextResponse.json(
        { error: 'OP não encontrada' },
        { status: 404 }
      );
    }
    console.log('✅ OP encontrada:', op.op, op.produto);

    // 5. Verificar se máquina existe
    console.log('🔍 Buscando máquina:', validated.maquinaId);
    const maquina = await db.query.maquinas.findFirst({
      where: eq(maquinas.id, validated.maquinaId),
    });

    if (!maquina) {
      console.log('❌ Máquina não encontrada:', validated.maquinaId);
      return NextResponse.json(
        { error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }
    console.log('✅ Máquina encontrada:', maquina.nome, maquina.codigo);

    // 🔴 REMOVIDO: Verificação de status da máquina (agora pode estar em processo)

    // 7. Verificar se já existe produção ativa para esta OP
    console.log('🔍 Verificando se OP já tem produção ativa...');
    const producaoAtivaOP = await db.execute(sql`
      SELECT id FROM producoes 
      WHERE op_id = ${validated.opId} 
      AND data_fim IS NULL
    `);

    if (producaoAtivaOP.rows.length > 0) {
      console.log('❌ OP já possui produção ativa:', producaoAtivaOP.rows[0].id);
      return NextResponse.json(
        { error: 'Esta OP já está em produção' },
        { status: 400 }
      );
    }
    console.log('✅ OK - Nenhuma produção ativa para esta OP');

    // 🔴 REMOVIDO: Verificação de produção ativa na máquina (agora permite múltiplas)

    // 9. Verificar se estágio existe
    console.log('🔍 Buscando estágio:', validated.estagioId);
    const estagio = await db.query.estagios.findFirst({
      where: eq(estagios.id, validated.estagioId),
    });

    if (!estagio) {
      console.log('❌ Estágio não encontrado:', validated.estagioId);
      return NextResponse.json(
        { error: 'Estágio não encontrado' },
        { status: 404 }
      );
    }
    console.log('✅ Estágio encontrado:', estagio.nome, estagio.codigo);

    // 10. Preparar dados para inserção
    console.log('📝 Preparando dados para inserção...');
    const agora = new Date();
    const dadosInserir = {
      opId: validated.opId,
      maquinaId: validated.maquinaId,
      operadorInicioId: validated.operadorInicioId,
      estagioId: validated.estagioId,
      dataInicio: agora,
      metragemProgramada: op.qtdeProgramado?.toString() || '0',
      isReprocesso: validated.isReprocesso,
      observacoes: validated.observacoes,
      createdAt: agora,
      updatedAt: agora,
    };

    console.log('💾 Dados para inserir:', JSON.stringify(dadosInserir, null, 2));

    // 11. Inserir no banco
    console.log('📥 Inserindo no banco...');
    let novaProducao;
    try {
      [novaProducao] = await db
        .insert(producoesTable)
        .values(dadosInserir)
        .returning();
      
      console.log('✅ Produção inserida com sucesso! ID:', novaProducao.id);
      console.log('📦 Objeto retornado:', JSON.stringify(novaProducao, null, 2));
    } catch (dbError) {
      console.error('❌ Erro ao inserir no banco:', dbError);
      return NextResponse.json(
        { error: 'Erro ao inserir no banco de dados' },
        { status: 500 }
      );
    }

    // 12. Atualizar status da máquina (se estiver disponível)
    console.log('🔄 Verificando status da máquina para atualização...');
    if (maquina.status === 'DISPONIVEL') {
      try {
        await db
          .update(maquinas)
          .set({ 
            status: 'EM_PROCESSO',
            updatedAt: agora 
          })
          .where(eq(maquinas.id, validated.maquinaId));
        console.log('✅ Status da máquina atualizado para EM_PROCESSO');
      } catch (updateError) {
        console.error('❌ Erro ao atualizar máquina:', updateError);
      }
    } else {
      console.log('ℹ️ Máquina já estava em processo, mantendo status');
    }

    // 🔥 13. ATUALIZAR A OP COM ESTÁGIO E MÁQUINA SELECIONADOS
    console.log('🔥 ATUALIZANDO OP - INICIAR PRODUÇÃO 🔥');
    console.log('📦 OP ID:', validated.opId);
    console.log('📦 Estágio selecionado:', estagio.nome, '(Código:', estagio.codigo || 'N/A', ')');
    console.log('📦 Máquina selecionada:', maquina.nome, '(Código:', maquina.codigo || 'N/A', ')');

    try {
      // Buscar OP antes
      const opAntes = await db.query.ops.findFirst({
        where: eq(ops.op, validated.opId),
      });
      console.log('📦 OP ANTES:', JSON.stringify(opAntes, null, 2));

      // USAR CAMELCASE - O DRIZZLE CONVERTE AUTOMATICAMENTE PARA SNAKE_CASE
      const dadosParaAtualizar = {
        status: 'EM_ANDAMENTO',
        codEstagioAtual: String(estagio.codigo || '00'),
        estagioAtual: String(estagio.nome),
        codMaquinaAtual: String(maquina.codigo || '00'),
        maquinaAtual: String(maquina.nome),
        dataUltimoApontamento: agora,
      };
      
      console.log('📦 Dados para atualizar (camelCase):', JSON.stringify(dadosParaAtualizar, null, 2));

      const updateResult = await db
        .update(ops)
        .set(dadosParaAtualizar)
        .where(eq(ops.op, validated.opId))
        .returning();

      console.log('✅ Resultado do update:', JSON.stringify(updateResult, null, 2));
      
      if (updateResult.length === 0) {
        console.error('❌ NENHUMA LINHA ATUALIZADA!');
      } else {
        console.log('✅ OP atualizada com sucesso!');
        console.log('📦 Novo estado:', {
          op: updateResult[0].op,
          status: updateResult[0].status,
          codEstagioAtual: updateResult[0].codEstagioAtual,
          estagioAtual: updateResult[0].estagioAtual,
          codMaquinaAtual: updateResult[0].codMaquinaAtual,
          maquinaAtual: updateResult[0].maquinaAtual,
        });
      }

      // Buscar OP depois para confirmar
      const opDepois = await db.query.ops.findFirst({
        where: eq(ops.op, validated.opId),
      });
      console.log('📦 OP DEPOIS:', JSON.stringify(opDepois, null, 2));

    } catch (updateError) {
      console.error('❌ Erro ao atualizar OP:', updateError);
      console.error('❌ Stack:', updateError instanceof Error ? updateError.stack : 'N/A');
    }

    console.log('='.repeat(50));
    console.log('🎉 PRODUÇÃO INICIADA COM SUCESSO!');
    console.log('='.repeat(50));

    return NextResponse.json(novaProducao, { status: 201 });

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
    console.error('📚 Stack:', error instanceof Error ? error.stack : 'N/A');
    
    if (error instanceof z.ZodError) {
      console.error('❌ Erro de validação Zod:', error.errors);
      return NextResponse.json(
        { error: 'Dados inválidos', detalhes: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno ao iniciar produção' },
      { status: 500 }
    );
  }
}