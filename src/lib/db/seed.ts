// E:\dev\apontador\src\lib\db\seed.ts
import { db } from './index';
import { areas } from './schema/areas';
import { setores } from './schema/setores';
import { maquinas } from './schema/maquinas';
import { maquinaSetor } from './schema/maquina-setor';
import { usuarios } from './schema/usuarios';
import { estagios } from './schema/estagios';
import { motivosParada } from './schema/motivos-parada';
import { motivosCancelamento } from './schema/motivos-cancelamento';
import { produtos } from './schema/produtos';
import { tiposManutencao } from './schema/tipos-manutencao';
import { atividadesManutencao } from './schema/atividades-manutencao';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // Limpar tabelas existentes (em ordem correta por causa das foreign keys)
    console.log('Limpando tabelas existentes...');
    
    await db.execute(sql`TRUNCATE TABLE apontamentos CASCADE`);
    await db.execute(sql`TRUNCATE TABLE maquina_setor CASCADE`);
    await db.execute(sql`TRUNCATE TABLE ops CASCADE`);
    await db.execute(sql`TRUNCATE TABLE maquinas CASCADE`);
    await db.execute(sql`TRUNCATE TABLE setores CASCADE`);
    await db.execute(sql`TRUNCATE TABLE areas CASCADE`);
    await db.execute(sql`TRUNCATE TABLE usuarios CASCADE`);
    await db.execute(sql`TRUNCATE TABLE estagios CASCADE`);
    await db.execute(sql`TRUNCATE TABLE motivos_parada CASCADE`);
    await db.execute(sql`TRUNCATE TABLE motivos_cancelamento CASCADE`);
    await db.execute(sql`TRUNCATE TABLE produtos CASCADE`);
    await db.execute(sql`TRUNCATE TABLE manutencoes CASCADE`);
    await db.execute(sql`TRUNCATE TABLE agendamentos_manutencao CASCADE`);
    await db.execute(sql`TRUNCATE TABLE tipos_manutencao CASCADE`);
    await db.execute(sql`TRUNCATE TABLE atividades_manutencao CASCADE`);

    // 1. Criar Áreas
    console.log('Criando áreas...');
    const [areaTecelagem, areaBeneficiamento] = await db.insert(areas).values([
      {
        nome: 'TECELAGEM',
        descricao: 'Área responsável pela tecelagem dos tecidos',
        ativo: true,
      },
      {
        nome: 'BENEFICIAMENTO',
        descricao: 'Área responsável pelo beneficiamento dos tecidos',
        ativo: true,
      },
    ]).returning();

    // 2. Criar Setores
    console.log('Criando setores...');
    const setoresList = await db.insert(setores).values([
      // Setores da Tecelagem
      {
        nome: 'Urdimento',
        areaId: areaTecelagem.id,
        descricao: 'Setor de urdimento',
        ativo: true,
      },
      {
        nome: 'Tecelagem',
        areaId: areaTecelagem.id,
        descricao: 'Setor de tecelagem com 43 teares',
        ativo: true,
      },
      // Setores do Beneficiamento
      {
        nome: 'Preparação',
        areaId: areaBeneficiamento.id,
        descricao: 'Setor de preparação dos tecidos',
        ativo: true,
      },
      {
        nome: 'Tinturaria',
        areaId: areaBeneficiamento.id,
        descricao: 'Setor de tingimento',
        ativo: true,
      },
      {
        nome: 'Estamparia',
        areaId: areaBeneficiamento.id,
        descricao: 'Setor de estamparia',
        ativo: true,
      },
      {
        nome: 'Acabamento',
        areaId: areaBeneficiamento.id,
        descricao: 'Setor de acabamento',
        ativo: true,
      },
      {
        nome: 'Revisão',
        areaId: areaBeneficiamento.id,
        descricao: 'Setor de revisão final',
        ativo: true,
      },
    ]).returning();

    // Mapear setores por nome para facilitar
    const setorMap = setoresList.reduce((acc, setor) => {
      acc[setor.nome] = setor;
      return acc;
    }, {} as Record<string, any>);

    // 3. Criar Máquinas
    console.log('Criando máquinas...');
    const maquinasList = await db.insert(maquinas).values([
      // Máquinas da Tecelagem
      { nome: 'Urdideira 01', codigo: 'URD01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Tear Toyota 01', codigo: 'TYT01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Tear Toyota 02', codigo: 'TYT02', status: 'DISPONIVEL', ativo: true },
      { nome: 'Tear Picanol 01', codigo: 'PIC01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Tear Picanol 02', codigo: 'PIC02', status: 'DISPONIVEL', ativo: true },
      { nome: 'Tear Rifa 01', codigo: 'RIF01', status: 'DISPONIVEL', ativo: true },
      
      // Máquinas do Beneficiamento
      { nome: 'Secadeira 01', codigo: 'SEC01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Rama 01', codigo: 'RAM01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Rama 02', codigo: 'RAM02', status: 'DISPONIVEL', ativo: true },
      { nome: 'Enroladeira 01', codigo: 'ENR01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Jigger 01', codigo: 'JIG01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Jigger 02', codigo: 'JIG02', status: 'DISPONIVEL', ativo: true },
      { nome: 'Jigger 03', codigo: 'JIG03', status: 'DISPONIVEL', ativo: true },
      { nome: 'Jigger 04', codigo: 'JIG04', status: 'DISPONIVEL', ativo: true },
      { nome: 'Stork 01', codigo: 'STK01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Revisadeira 01', codigo: 'REV01', status: 'DISPONIVEL', ativo: true },
      { nome: 'Revisadeira 02', codigo: 'REV02', status: 'DISPONIVEL', ativo: true },
      { nome: 'Revisadeira 03', codigo: 'REV03', status: 'DISPONIVEL', ativo: true },
      { nome: 'Revisadeira 04', codigo: 'REV04', status: 'DISPONIVEL', ativo: true },
    ]).returning();

    // 4. Vincular Máquinas aos Setores (relação N:N)
    console.log('Vinculando máquinas aos setores...');
    
    const vinculos = [];
    
    // Urdideira no setor Urdimento
    vinculos.push({
      maquinaId: maquinasList.find(m => m.codigo === 'URD01')!.id,
      setorId: setorMap['Urdimento'].id,
    });
    
    // Teares no setor Tecelagem
    for (const codigo of ['TYT01', 'TYT02', 'PIC01', 'PIC02', 'RIF01']) {
      vinculos.push({
        maquinaId: maquinasList.find(m => m.codigo === codigo)!.id,
        setorId: setorMap['Tecelagem'].id,
      });
    }
    
    // Rama 01 e 02 em Preparação e Acabamento (múltiplos setores)
    const rama01 = maquinasList.find(m => m.codigo === 'RAM01')!;
    const rama02 = maquinasList.find(m => m.codigo === 'RAM02')!;
    
    vinculos.push(
      { maquinaId: rama01.id, setorId: setorMap['Preparação'].id },
      { maquinaId: rama01.id, setorId: setorMap['Acabamento'].id },
      { maquinaId: rama02.id, setorId: setorMap['Preparação'].id },
      { maquinaId: rama02.id, setorId: setorMap['Acabamento'].id }
    );
    
    // Demais máquinas
    vinculos.push(
      { maquinaId: maquinasList.find(m => m.codigo === 'SEC01')!.id, setorId: setorMap['Preparação'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'ENR01')!.id, setorId: setorMap['Preparação'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'JIG01')!.id, setorId: setorMap['Tinturaria'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'JIG02')!.id, setorId: setorMap['Tinturaria'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'JIG03')!.id, setorId: setorMap['Tinturaria'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'JIG04')!.id, setorId: setorMap['Tinturaria'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'STK01')!.id, setorId: setorMap['Estamparia'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'REV01')!.id, setorId: setorMap['Revisão'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'REV02')!.id, setorId: setorMap['Revisão'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'REV03')!.id, setorId: setorMap['Revisão'].id },
      { maquinaId: maquinasList.find(m => m.codigo === 'REV04')!.id, setorId: setorMap['Revisão'].id }
    );
    
    await db.insert(maquinaSetor).values(vinculos);

    // 5. Criar Usuários
    console.log('Criando usuários...');
    
    // Hash da senha do admin
    const senhaHash = await bcrypt.hash('admin123', 10);
    
    await db.insert(usuarios).values([
      {
        nome: 'Administrador',
        matricula: 'ADMIN001',
        nivel: 'ADM',
        senha: senhaHash,
        ativo: true,
      },
      {
        nome: 'João Silva',
        matricula: 'OP001',
        nivel: 'OPERADOR',
        ativo: true,
      },
      {
        nome: 'Maria Santos',
        matricula: 'OP002',
        nivel: 'OPERADOR',
        ativo: true,
      },
      {
        nome: 'Pedro Oliveira',
        matricula: 'OP003',
        nivel: 'OPERADOR',
        ativo: true,
      },
      {
        nome: 'Ana Costa',
        matricula: 'OP004',
        nivel: 'OPERADOR',
        ativo: true,
      },
      {
        nome: 'Carlos Mecânico',
        matricula: 'MNT001',
        nivel: 'MANUTENCAO',
        ativo: true,
      },
    ]);

    // 6. Criar Estágios de Produção
    console.log('Criando estágios de produção...');
    await db.insert(estagios).values([
      { codigo: '00', nome: 'NENHUM', ordem: 0, descricao: 'Sem estágio definido', ativo: true },
      { codigo: '01', nome: 'PREPARAÇÃO', ordem: 1, descricao: 'Preparação do tecido', ativo: true },
      { codigo: '02', nome: 'TINGIMENTO', ordem: 2, descricao: 'Processo de tingimento', ativo: true },
      { codigo: '03', nome: 'ALVEJAMENTO', ordem: 3, descricao: 'Processo de alvejamento', ativo: true },
      { codigo: '04', nome: 'SECAGEM', ordem: 4, descricao: 'Secagem do tecido', ativo: true },
      { codigo: '05', nome: 'ESTAMPARIA', ordem: 5, descricao: 'Estamparia do tecido', ativo: true },
      { codigo: '06', nome: 'ACABAMENTO', ordem: 6, descricao: 'Acabamento final', ativo: true },
      { codigo: '07', nome: 'REVISÃO', ordem: 7, descricao: 'Revisão de qualidade', ativo: true },
    ]);

    // 7. Criar Motivos de Parada
    console.log('Criando motivos de parada...');
    await db.insert(motivosParada).values([
      { codigo: '001', descricao: 'Falta de Material', ativo: true },
      { codigo: '002', descricao: 'Manutenção Corretiva', ativo: true },
      { codigo: '003', descricao: 'Manutenção Preventiva', ativo: true },
      { codigo: '004', descricao: 'Troca de Turno', ativo: true },
      { codigo: '005', descricao: 'Almoço', ativo: true },
      { codigo: '006', descricao: 'Falta de Operador', ativo: true },
      { codigo: '007', descricao: 'Problema Elétrico', ativo: true },
      { codigo: '008', descricao: 'Problema Mecânico', ativo: true },
      { codigo: '009', descricao: 'Aguardando Programação', ativo: true },
      { codigo: '010', descricao: 'Qualidade - Ajustes', ativo: true },
    ]);

    // 8. Criar Motivos de Cancelamento
    console.log('Criando motivos de cancelamento...');
    await db.insert(motivosCancelamento).values([
      { codigo: '001', descricao: 'Cancelado pelo Cliente', ativo: true },
      { codigo: '002', descricao: 'Problema de Qualidade', ativo: true },
      { codigo: '003', descricao: 'Falta de Insumos', ativo: true },
      { codigo: '004', descricao: 'Reprogramação', ativo: true },
      { codigo: '005', descricao: 'Erro de Cadastro', ativo: true },
    ]);

    // 9. Criar Produtos Exemplo
    console.log('Criando produtos exemplo...');
    await db.insert(produtos).values([
      {
        codigo: '2.K1820.093.300701',
        nome: 'TECIDO LENÇOL ELEGANCE 150FIOS FD ALVEJADO ESTAMPA 3007-01',
        um: 'M',
        nivel: '2',
        grupo: 'K1820',
        sub: '093',
        item: '300701',
        parametrosEficiencia: {
          preparacao: { tempoPadrao: 10, rendimento: 100 },
          tingimento: { tempoPadrao: 30, rendimento: 95 },
          revisao: { tempoPadrao: 5, rendimento: 98 }
        },
        ativo: true,
      },
      {
        codigo: '2.K1820.093.300702',
        nome: 'TECIDO LENÇOL ELEGANCE 150FIOS FD BRANCO',
        um: 'M',
        nivel: '2',
        grupo: 'K1820',
        sub: '093',
        item: '300702',
        parametrosEficiencia: {
          preparacao: { tempoPadrao: 10, rendimento: 100 },
          tingimento: { tempoPadrao: 25, rendimento: 97 },
          revisao: { tempoPadrao: 5, rendimento: 99 }
        },
        ativo: true,
      },
    ]);

    // 10. Criar Tipos de Manutenção
    console.log('Criando tipos de manutenção...');
    await db.insert(tiposManutencao).values([
      { codigo: 'COR', nome: 'Corretiva', ativo: true },
      { codigo: 'PRE', nome: 'Preventiva', ativo: true },
    ]);

    // 11. Criar Atividades de Manutenção
    console.log('Criando atividades de manutenção...');
    await db.insert(atividadesManutencao).values([
      { codigo: 'MEC', nome: 'Mecânica', ativo: true },
      { codigo: 'ELE', nome: 'Elétrica', ativo: true },
      { codigo: 'PRO', nome: 'Programação', ativo: true },
      { codigo: 'LIM', nome: 'Limpeza', ativo: true },
      { codigo: 'LUB', nome: 'Lubrificação', ativo: true },
    ]);

    console.log('✅ Seed concluído com sucesso!');
    
    // Mostrar resumo
    console.log('\n📊 Resumo:');
    console.log(`Áreas: 2`);
    console.log(`Setores: ${setoresList.length}`);
    console.log(`Máquinas: ${maquinasList.length}`);
    console.log(`Vínculos Máquina-Setor: ${vinculos.length}`);
    console.log(`Usuários: 6 (1 admin, 4 operadores, 1 manutenção)`);
    console.log(`Estágios: 8`);
    console.log(`Motivos de Parada: 10`);
    console.log(`Motivos de Cancelamento: 5`);
    console.log(`Produtos: 2`);
    console.log(`Tipos de Manutenção: 2`);
    console.log(`Atividades de Manutenção: 5`);
    
    console.log('\n🔑 Credenciais:');
    console.log('Admin: ADMIN001 / admin123');
    console.log('Operadores: OP001 a OP004 (sem senha - login via QR Code)');
    console.log('Manutenção: MNT001 (sem senha - login via QR Code)');

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
}

// Executar seed
seed().catch((error) => {
  console.error('Falha no seed:', error);
  process.exit(1);
});